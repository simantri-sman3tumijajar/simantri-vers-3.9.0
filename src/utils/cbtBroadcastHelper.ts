import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamBroadcast, BroadcastPriority, BroadcastTargetType } from '../types';

export const ACTIVE_BROADCAST_DOC_PATH = 'active_announcement';
export const BROADCAST_COLLECTION = 'exam_broadcasts';

export const QUICK_TEMPLATES = [
  {
    id: 'tmpl-technical-handled',
    priority: 'DARURAT' as BroadcastPriority,
    title: 'Kendala Teknis Server Sedang Ditangani',
    message: 'Gangguan teknis sedang ditangani oleh Tim IT/Proktor. Mohon tetap tenang dan jangan menutup browser Anda; lembar jawaban Anda tersimpan otomatis dengan aman di perangkat.',
  },
  {
    id: 'tmpl-susulan-redirect',
    priority: 'DARURAT' as BroadcastPriority,
    title: 'Pengalihan ke Sesi Ujian Susulan Resmi',
    message: 'Peserta yang terdampak kendala teknis pada sesi ini akan diarahkan ke Sesi Susulan dan telah dicatat dalam Berita Acara Pelaksanaan (BAP). Sisa waktu ujian dan jawaban terakhir Anda telah dibekukan secara aman.',
  },
  {
    id: 'tmpl-time-compensation',
    priority: 'INFO' as BroadcastPriority,
    title: 'Kompensasi Penambahan Waktu Ujian',
    message: 'Waktu ujian telah ditambahkan 15 menit sebagai bentuk kompensasi kendala teknis/jaringan. Silakan manfaatkan waktu tambahan ini untuk memeriksa kembali lembar jawaban.',
  },
  {
    id: 'tmpl-warning-focus',
    priority: 'PERINGATAN' as BroadcastPriority,
    title: 'Peringatan Tata Tertib & Integritas Ujian',
    message: 'Perhatian kepada seluruh peserta ujian: Harap tetap fokus pada layar soal. Dilarang berpindah tab, membuka aplikasi lain, atau mengaktifkan fitur split-screen di ponsel.',
  },
  {
    id: 'tmpl-exam-10min-left',
    priority: 'INFO' as BroadcastPriority,
    title: 'Pemberitahuan Waktu Pengerjaan 10 Menit Terakhir',
    message: 'Waktu pengerjaan ujian tersisa 10 menit lagi. Harap periksa kembali nomor-nomor yang ditandai ragu-ragu dan pastikan seluruh soal telah terjawab sebelum mengumpulkan.',
  },
];

/**
 * 1. Publikasikan pengumuman / broadcast baru
 */
export async function publishExamBroadcast(
  data: Omit<ExamBroadcast, 'id' | 'createdAt' | 'isActive'> & { id?: string }
): Promise<ExamBroadcast> {
  const broadcastId = data.id || `bc-${Date.now()}`;
  const newBroadcast: ExamBroadcast = {
    ...data,
    id: broadcastId,
    createdAt: new Date().toISOString(),
    isActive: true,
    acknowledgedBy: [],
  };

  if (db) {
    try {
      // 1. Simpan ke active_announcement (single document agar quota onSnapshot sangat hemat)
      const activeRef = doc(db, BROADCAST_COLLECTION, ACTIVE_BROADCAST_DOC_PATH);
      await setDoc(activeRef, newBroadcast);

      // 2. Simpan juga arsip riwayat ke sub-koleksi / dokumen terpisah
      const histRef = doc(db, BROADCAST_COLLECTION, broadcastId);
      await setDoc(histRef, newBroadcast);
    } catch (err) {
      console.warn('[CbtBroadcast] Error publishing to Firestore:', err);
    }
  }

  // Backup lokal
  try {
    localStorage.setItem('simantri_active_exam_broadcast', JSON.stringify(newBroadcast));
  } catch {}

  return newBroadcast;
}

/**
 * 2. Nonaktifkan (Unpublish) broadcast aktif
 */
export async function unpublishActiveExamBroadcast(): Promise<void> {
  if (db) {
    try {
      const activeRef = doc(db, BROADCAST_COLLECTION, ACTIVE_BROADCAST_DOC_PATH);
      await updateDoc(activeRef, {
        isActive: false,
        unregisteredAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[CbtBroadcast] Error unpublishing from Firestore:', err);
    }
  }

  try {
    localStorage.removeItem('simantri_active_exam_broadcast');
  } catch {}
}

/**
 * 3. Real-time Listener hemat kuota untuk layar siswa
 */
export function subscribeToActiveExamBroadcast(
  onUpdate: (broadcast: ExamBroadcast | null) => void
): () => void {
  // Check cached backup first
  try {
    const cached = localStorage.getItem('simantri_active_exam_broadcast');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.isActive) onUpdate(parsed);
    }
  } catch {}

  if (!db) {
    return () => {};
  }

  try {
    const activeRef = doc(db, BROADCAST_COLLECTION, ACTIVE_BROADCAST_DOC_PATH);
    const unsubscribe = onSnapshot(
      activeRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ExamBroadcast;
          if (data && data.isActive) {
            onUpdate(data);
          } else {
            onUpdate(null);
          }
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('[CbtBroadcast] Listener snapshot info:', error?.message);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[CbtBroadcast] Failed to attach listener:', err);
    return () => {};
  }
}

/**
 * 4. Konfirmasi "Saya Mengerti / Mengkonfirmasi" oleh siswa
 */
export async function acknowledgeExamBroadcast(studentId: string): Promise<void> {
  if (!studentId) return;

  // Local storage acknowledgment record
  try {
    const key = `simantri_broadcast_ack_${studentId}`;
    localStorage.setItem(key, Date.now().toString());
  } catch {}

  if (db) {
    try {
      const activeRef = doc(db, BROADCAST_COLLECTION, ACTIVE_BROADCAST_DOC_PATH);
      await updateDoc(activeRef, {
        acknowledgedBy: arrayUnion(studentId),
      });
    } catch (err) {
      // Benign if offline
    }
  }
}

/**
 * 5. Ambil riwayat pengumuman yang pernah dikirim
 */
export async function fetchBroadcastHistory(): Promise<ExamBroadcast[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, BROADCAST_COLLECTION);
    const snap = await getDocs(colRef);
    const list: ExamBroadcast[] = [];
    snap.forEach((d) => {
      if (d.id !== ACTIVE_BROADCAST_DOC_PATH) {
        list.push({ id: d.id, ...(d.data() as any) });
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.warn('[CbtBroadcast] Gagal mengambil riwayat:', e);
    return [];
  }
}
