import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Send,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  Users,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Plus,
  Layers,
  Search,
  Filter,
  FileText,
  Printer,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  PlayCircle,
  Copy,
  ExternalLink,
  Edit,
  UserX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  ExamBroadcast,
  BroadcastPriority,
  BroadcastTargetType,
  ExamActivityLogDoc,
  BeritaAcaraItem,
} from '../types';
import {
  publishExamBroadcast,
  unpublishActiveExamBroadcast,
  fetchBroadcastHistory,
  QUICK_TEMPLATES,
  ACTIVE_BROADCAST_DOC_PATH,
  BROADCAST_COLLECTION,
} from '../utils/cbtBroadcastHelper';
import {
  markStudentsAsSusulan,
  extendExamTimeForStudents,
} from '../utils/cbtOfflineSyncHelper';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ExamBroadcastIncidentPanelProps {
  embedded?: boolean;
}

export const ExamBroadcastIncidentPanel: React.FC<ExamBroadcastIncidentPanelProps> = ({ embedded = false }) => {
  const { state, currentUser, showToast, saveBeritaAcara } = useApp();
  const school = state?.schoolInfo;
  const schedules = state?.examManagement?.schedules || [];
  const classes = state?.classes || [];

  // Active sub-tab: 'broadcast' | 'incident' | 'bap_recap'
  const [activeSubTab, setActiveSubTab] = useState<'broadcast' | 'incident' | 'bap_recap'>('broadcast');

  // Broadcast Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<BroadcastPriority>('INFO');
  const [targetType, setTargetType] = useState<BroadcastTargetType>('ALL');
  const [targetExamType, setTargetExamType] = useState<'ALL' | 'CBT_UMUM' | 'CBT_LITNUM'>('ALL');
  const [targetSession, setTargetSession] = useState('');
  const [targetRoom, setTargetRoom] = useState('');
  const [timeExtensionMinutes, setTimeExtensionMinutes] = useState(0);

  const [activeBroadcast, setActiveBroadcast] = useState<ExamBroadcast | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<ExamBroadcast[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Live Proctor Logs for Incident Handling
  const [proctorLogs, setProctorLogs] = useState<ExamActivityLogDoc[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [incidentClassFilter, setIncidentClassFilter] = useState('ALL');
  const [incidentExamTypeFilter, setIncidentExamTypeFilter] = useState('ALL');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');
  const [incidentReasonText, setIncidentReasonText] = useState('Gangguan teknis jaringan / server CBT');
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(15);
  const [isProcessingIncident, setIsProcessingIncident] = useState(false);

  // Fetch active broadcast & proctor logs via onSnapshot
  useEffect(() => {
    if (!db) return;

    // 1. Listen to active broadcast
    const activeRef = doc(db, BROADCAST_COLLECTION, ACTIVE_BROADCAST_DOC_PATH);
    const unsubActive = onSnapshot(activeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ExamBroadcast;
        if (data.isActive) setActiveBroadcast(data);
        else setActiveBroadcast(null);
      } else {
        setActiveBroadcast(null);
      }
    });

    // 2. Listen to proctor logs for incidents
    const logsRef = collection(db, 'exam_activity_logs');
    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const list: ExamActivityLogDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setProctorLogs(list);
    });

    // 3. Load broadcast history
    fetchBroadcastHistory().then(setBroadcastHistory);

    return () => {
      unsubActive();
      unsubLogs();
    };
  }, []);

  // Quick Template Applicator
  const handleApplyTemplate = (tmpl: (typeof QUICK_TEMPLATES)[number]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setPriority(tmpl.priority);
    if (tmpl.id === 'tmpl-time-compensation') {
      setTimeExtensionMinutes(15);
    } else {
      setTimeExtensionMinutes(0);
    }
    showToast('Template Diterapkan', `Template "${tmpl.title}" siap dikirim.`, 'info');
  };

  // Submit Broadcast
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Form Belum Lengkap', 'Judul dan isi pesan pengumuman wajib diisi.', 'warning');
      return;
    }

    setIsPublishing(true);
    try {
      const created = await publishExamBroadcast({
        title: title.trim(),
        message: message.trim(),
        priority,
        targetType,
        targetExamType,
        targetSession: targetSession.trim(),
        targetRoom: targetRoom.trim(),
        timeExtensionMinutes: Number(timeExtensionMinutes) || 0,
        createdBy: currentUser?.id || 'admin',
        createdByName: currentUser?.nama || 'Petugas Ujian',
        createdByRole: (currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'operator' ? 'operator' : 'proktor') as any,
      });

      setActiveBroadcast(created);
      setBroadcastHistory((prev) => [created, ...prev]);
      showToast(
        'Pengumuman Diterbitkan!',
        `Pesan prioritas ${priority} berhasil disiarkan real-time ke layar siswa.`,
        'success'
      );
      // Reset form
      setTitle('');
      setMessage('');
      setTimeExtensionMinutes(0);
    } catch (err) {
      console.warn('Gagal menerbitkan broadcast:', err);
      showToast('Gagal Menerbitkan', 'Periksa koneksi jaringan server.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish Active Broadcast
  const handleUnpublish = async () => {
    if (!window.confirm('Hentikan dan tarik pengumuman aktif dari seluruh layar siswa?')) return;
    try {
      await unpublishActiveExamBroadcast();
      setActiveBroadcast(null);
      showToast('Pengumuman Dinonaktifkan', 'Banner/modal pengumuman ditarik dari layar siswa.', 'info');
    } catch (err) {
      showToast('Gagal Menarik', 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Filter proctor logs for incident handling
  const filteredStudents = useMemo(() => {
    return proctorLogs.filter((item) => {
      if (incidentClassFilter !== 'ALL' && item.className !== incidentClassFilter) return false;
      if (incidentExamTypeFilter !== 'ALL') {
        const itemType = (item.examType || 'CBT').toUpperCase();
        if (incidentExamTypeFilter === 'LITNUM' && !itemType.includes('LITNUM')) return false;
        if (incidentExamTypeFilter === 'CBT' && itemType.includes('LITNUM')) return false;
      }
      if (incidentSearchQuery.trim()) {
        const q = incidentSearchQuery.toLowerCase();
        const matchName = (item.studentName || '').toLowerCase().includes(q);
        const matchClass = (item.className || '').toLowerCase().includes(q);
        if (!matchName && !matchClass) return false;
      }
      return true;
    });
  }, [proctorLogs, incidentClassFilter, incidentExamTypeFilter, incidentSearchQuery]);

  const selectedStudentsList = useMemo(() => {
    return filteredStudents.filter((s) => selectedStudentIds[s.id]);
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleSelectAll = () => {
    if (selectedStudentsList.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredStudents.forEach((s) => (next[s.id] = true));
      setSelectedStudentIds(next);
    }
  };

  // Action: Tandai Kendala Teknis & Arahkan ke Susulan
  const handleMarkSusulan = async () => {
    if (selectedStudentsList.length === 0) {
      showToast('Pilih Peserta', 'Pilih minimal 1 siswa yang terdampak kendala teknis.', 'warning');
      return;
    }

    const confirmMsg = `Tandai Kendala Teknis & Arahkan ke Susulan?\n\nJumlah Peserta: ${selectedStudentsList.length} siswa\n\nSistem akan:\n1. Membekukan sisa waktu & jawaban terakhir siswa\n2. Menampilkan informasi susulan di layar siswa\n3. Otomatis mencatat insiden ke dokumen Berita Acara (BAP)\n\nLanjutkan eksekusi?`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessingIncident(true);
    try {
      const res = await markStudentsAsSusulan({
        studentLogs: selectedStudentsList,
        reason: incidentReasonText.trim() || 'Kendala Teknis Jaringan / Server CBT',
        petugasName: currentUser?.nama || 'Petugas Ujian',
        petugasRole: (currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'operator' ? 'operator' : 'proktor') as any,
        sessionOrRoom: incidentClassFilter !== 'ALL' ? `Kelas ${incidentClassFilter}` : 'Sesi Ujian Aktif',
        subjectName: state?.examManagement?.activeExamName || 'Ujian CBT',
      });

      // Auto Broadcast announcement
      await publishExamBroadcast({
        title: 'Pengalihan ke Sesi Ujian Susulan (Kendala Teknis)',
        message: `Sebanyak ${res.successCount} peserta yang terdampak kendala teknis dialihkan ke Sesi Susulan resmi. Sisa waktu dan lembar jawaban Anda telah dibekukan secara aman dan tercatat dalam Berita Acara Pelaksanaan.`,
        priority: 'DARURAT',
        targetType: 'SPECIFIC_STUDENTS',
        targetStudentIds: selectedStudentsList.map((s) => s.studentId),
        createdBy: currentUser?.id || 'admin',
        createdByName: currentUser?.nama || 'Petugas Ujian',
        createdByRole: (currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'operator' ? 'operator' : 'proktor') as any,
      });

      showToast(
        'Pengalihan Berhasil!',
        `${res.successCount} siswa berhasil dialihkan ke Susulan & dicatat otomatis ke Berita Acara.`,
        'success'
      );
      setSelectedStudentIds({});
    } catch (err) {
      console.warn('Gagal memproses susulan:', err);
      showToast('Gagal Memproses', 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsProcessingIncident(false);
    }
  };

  // Action: Kompensasi Waktu (+10, +15, atau Custom Menit)
  const handleExtendExamTime = async (minutes: number) => {
    if (selectedStudentsList.length === 0) {
      showToast('Pilih Peserta', 'Pilih minimal 1 siswa untuk penambahan waktu.', 'warning');
      return;
    }

    if (
      !window.confirm(
        `Tambahkan waktu kompensasi +${minutes} menit untuk ${selectedStudentsList.length} peserta terpilih?`
      )
    ) {
      return;
    }

    setIsProcessingIncident(true);
    try {
      const res = await extendExamTimeForStudents({
        studentLogs: selectedStudentsList,
        extensionMinutes: minutes,
        petugasName: currentUser?.nama || 'Petugas Ujian',
        sessionOrRoom: incidentClassFilter !== 'ALL' ? `Kelas ${incidentClassFilter}` : 'Sesi Ujian Aktif',
        subjectName: state?.examManagement?.activeExamName || 'Ujian CBT',
      });

      // Broadcast notifikasi penambahan waktu
      await publishExamBroadcast({
        title: `Kompensasi Waktu Ujian Ditambahkan (+${minutes} Menit)`,
        message: `Waktu pengerjaan ujian Anda telah ditambahkan +${minutes} menit sebagai bentuk kompensasi kendala jaringan/server. Manfaatkan waktu tambahan ini dengan baik.`,
        priority: 'INFO',
        targetType: 'SPECIFIC_STUDENTS',
        targetStudentIds: selectedStudentsList.map((s) => s.studentId),
        timeExtensionMinutes: minutes,
        createdBy: currentUser?.id || 'admin',
        createdByName: currentUser?.nama || 'Petugas Ujian',
        createdByRole: (currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'operator' ? 'operator' : 'proktor') as any,
      });

      showToast(
        'Waktu Berhasil Ditambahkan',
        `Kompensasi +${minutes} menit diterapkan untuk ${res.successCount} peserta.`,
        'success'
      );
    } catch (err) {
      showToast('Gagal Tambah Waktu', 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsProcessingIncident(false);
    }
  };

  // Rekapitulasi Insiden di Berita Acara Pelaksanaan (BAP)
  const bapIncidentItems = useMemo(() => {
    const list: Array<{
      bapId: string;
      mataPelajaran: string;
      kelasRuang: string;
      hariTanggal: string;
      pengawas1: string;
      kendala: NonNullable<BeritaAcaraItem['kendalaTeknisSiswa']>;
      catatan: string;
    }> = [];

    (state?.beritaAcaraList || []).forEach((b) => {
      if (b.kendalaTeknisSiswa && b.kendalaTeknisSiswa.length > 0) {
        list.push({
          bapId: b.id,
          mataPelajaran: b.mataPelajaran,
          kelasRuang: b.kelasRuang,
          hariTanggal: b.hariTanggal,
          pengawas1: b.pengawas1,
          kendala: b.kendalaTeknisSiswa,
          catatan: b.catatanKejadianKhusus || '',
        });
      }
    });

    return list;
  }, [state?.beritaAcaraList]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Pusat Kendali Pengumuman &amp; Manajemen Insiden Ujian</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Broadcast Real-Time, Kompensasi Waktu &amp; Pengalihan Susulan
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl mt-1">
            Siarkan instruksi darurat langsung ke layar siswa (CBT Umum &amp; LitNum), bekukan timer, alihkan peserta terdampak error ke sesi Susulan, dan terhubung otomatis ke Berita Acara Pelaksanaan (BAP).
          </p>
        </div>

        {/* Live Status Indicator */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {activeBroadcast ? (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-right space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse inline-block">
                BROADCAST AKTIF DI LAYAR
              </span>
              <p className="text-xs font-bold text-rose-200 truncate max-w-xs">{activeBroadcast.title}</p>
              <button
                type="button"
                onClick={handleUnpublish}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ml-auto mt-1"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Tarik Pengumuman</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white inline-block">
                STANDBY / NORMAL
              </span>
              <p className="text-xs font-medium text-emerald-300 mt-1">Tidak ada broadcast aktif</p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs Navigasi */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('broadcast')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'broadcast'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>1. Kirim Pengumuman &amp; Broadcast</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('incident')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'incident'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>2. Kontrol Insiden, Timer &amp; Susulan</span>
          {selectedStudentsList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-950 font-black">
              {selectedStudentsList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bap_recap')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'bap_recap'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Rekapitulasi Berita Acara (BAP)</span>
          {bapIncidentItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-950 font-black">
              {bapIncidentItems.length} Sesi
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* PILAR 1: BROADCAST & PENGUMUMAN FORM                                  */}
      {/* ==================================================================== */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left 2 Cols: Composer */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-600" />
                <span>Form Siaran Pengumuman Ujian Real-Time</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pesan akan langsung muncul seketika di layar ujian peserta yang sedang aktif.
              </p>
            </div>

            {/* Quick Templates Button Row */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                Template Cepat Tanggap Darurat (1-Klik Isi Form):
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-all cursor-pointer text-left"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-5">
              {/* Prioritas & Target Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Tingkat Prioritas / Kategori:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('INFO')}
                      className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                        priority === 'INFO'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      INFO (Biru)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('PERINGATAN')}
                      className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                        priority === 'PERINGATAN'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      PERINGATAN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('DARURAT')}
                      className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                        priority === 'DARURAT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm animate-pulse'
                          : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      DARURAT
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {priority === 'DARURAT'
                      ? '⚠️ Kategori DARURAT akan memunculkan Pop-up Modal wajib konfirmasi di tengah layar siswa.'
                      : 'ℹ️ Muncul sebagai Floating Banner / Marquee di bagian atas lembar soal.'}
                  </p>
                </div>

                {/* Target Audiens */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Target Audiens Peserta:
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="ALL">Semua Peserta Aktif (CBT &amp; LitNum)</option>
                    <option value="EXAM_TYPE">Berdasarkan Jenis Ujian (CBT Umum / LitNum)</option>
                    <option value="SESSION">Berdasarkan Sesi Pelaksanaan</option>
                    <option value="ROOM">Berdasarkan Ruang Ujian</option>
                  </select>
                </div>
              </div>

              {/* Conditional Target Options */}
              {targetType === 'EXAM_TYPE' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center gap-3">
                  <span className="text-xs font-extrabold text-indigo-950">Pilih Jenis Ujian:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetExamType('CBT_UMUM')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        targetExamType === 'CBT_UMUM'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      Hanya CBT Reguler (ASTS/ASAS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetExamType('CBT_LITNUM')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        targetExamType === 'CBT_LITNUM'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      Hanya Asesmen LitNum (Mingguan)
                    </button>
                  </div>
                </div>
              )}

              {targetType === 'SESSION' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                    Nama / Kata Kunci Sesi:
                  </label>
                  <input
                    type="text"
                    value={targetSession}
                    onChange={(e) => setTargetSession(e.target.value)}
                    placeholder="Contoh: Sesi 1, Sesi 2, atau Fase F"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              )}

              {targetType === 'ROOM' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                    Nama / Kata Kunci Ruang:
                  </label>
                  <input
                    type="text"
                    value={targetRoom}
                    onChange={(e) => setTargetRoom(e.target.value)}
                    placeholder="Contoh: Ruang 01, Lab Komputer, atau Ruang CBT 2"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              )}

              {/* Title & Message */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Judul Pengumuman:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kendala Server Sedang Ditangani / Tambahan Waktu 15 Menit"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Isi Pesan Siaran (Akan Dibaca Peserta):
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan instruksi jelas kepada peserta..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Kompensasi Waktu Ekstra Opsional */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-black text-amber-950">
                      Sertakan Kompensasi Penambahan Waktu Otomatis?
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={timeExtensionMinutes}
                      onChange={(e) => setTimeExtensionMinutes(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg border border-amber-300 text-xs font-bold text-center bg-white"
                    />
                    <span className="text-xs font-bold text-amber-900">Menit</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800">
                  Jika diset &gt; 0 menit, timer seluruh siswa penerima broadcast akan otomatis ditambahkan seketika di perangkat mereka.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {activeBroadcast && (
                  <button
                    type="button"
                    onClick={handleUnpublish}
                    className="px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
                  >
                    Tarik Pengumuman Aktif
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPublishing ? 'Mempublikasikan...' : 'Siarkan Pengumuman Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Col: Active & History */}
          <div className="space-y-6">
            {/* Active Box Preview */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                Status Siaran Aktif di Siswa:
              </span>

              {activeBroadcast ? (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    activeBroadcast.priority === 'DARURAT'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : activeBroadcast.priority === 'PERINGATAN'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-white border border-current">
                      {activeBroadcast.priority}
                    </span>
                    <span className="text-[10px] font-mono opacity-70">
                      {new Date(activeBroadcast.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <h4 className="font-black text-xs leading-snug">{activeBroadcast.title}</h4>
                  <p className="text-[11px] leading-relaxed">{activeBroadcast.message}</p>
                  <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[10px] opacity-80">
                    <span>Oleh: {activeBroadcast.createdByName}</span>
                    <span>Telah dikonfirmasi: {activeBroadcast.acknowledgedBy?.length || 0} Siswa</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <Radio className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Tidak ada pengumuman aktif</p>
                  <p className="text-[10px] text-slate-400">Gunakan form di samping untuk membuat siaran baru.</p>
                </div>
              )}
            </div>

            {/* Riwayat Pengumuman */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Riwayat Pengumuman ({broadcastHistory.length}):
                </span>
                <button
                  type="button"
                  onClick={() => fetchBroadcastHistory().then(setBroadcastHistory)}
                  className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Segarkan</span>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {broadcastHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Belum ada riwayat pengumuman.</p>
                ) : (
                  broadcastHistory.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-indigo-700">{h.priority}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="font-extrabold text-slate-900 text-xs leading-snug">{h.title}</p>
                      <p className="text-[10.5px] text-slate-600 line-clamp-2">{h.message}</p>
                      <span className="text-[9.5px] text-slate-400 block pt-1">
                        Oleh: {h.createdByName} ({h.createdByRole})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PILAR 3: KONTROL INSIDEN, TIMER & PENGALIHAN SUSULAN                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'incident' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Panel Penanganan Insiden Server &amp; Pengalihan Susulan</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pilih peserta yang terdampak gangguan server/jaringan, lalu eksekusi pembekuan timer atau alihkan ke Sesi Susulan.
              </p>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                Terpilih: <strong>{selectedStudentsList.length}</strong> Siswa
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                {selectedStudentsList.length === filteredStudents.length && filteredStudents.length > 0
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua Siswa'}
              </button>
            </div>
          </div>

          {/* Action Control Box (Emergency Bar) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-300 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-black text-rose-950 mb-1">
                  Keterangan Kendala Teknis (Otomatis Masuk Berita Acara BAP):
                </label>
                <input
                  type="text"
                  value={incidentReasonText}
                  onChange={(e) => setIncidentReasonText(e.target.value)}
                  placeholder="Contoh: Gangguan jaringan Wi-Fi sekolah / Server error 500"
                  className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* 1. Alihkan ke Susulan */}
                <button
                  type="button"
                  disabled={selectedStudentsList.length === 0 || isProcessingIncident}
                  onClick={handleMarkSusulan}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                  title="Ubah status ke SUSULAN_KENDALA_TEKNIS, bekukan waktu & jawaban, catat ke BAP"
                >
                  <UserX className="w-4 h-4" />
                  <span>Tandai Kendala &amp; Alihkan ke Susulan ({selectedStudentsList.length})</span>
                </button>

                {/* 2. Quick +10 Menit */}
                <button
                  type="button"
                  disabled={selectedStudentsList.length === 0 || isProcessingIncident}
                  onClick={() => handleExtendExamTime(10)}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+10 Menit</span>
                </button>

                {/* 3. Quick +15 Menit */}
                <button
                  type="button"
                  disabled={selectedStudentsList.length === 0 || isProcessingIncident}
                  onClick={() => handleExtendExamTime(15)}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+15 Menit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={incidentSearchQuery}
                onChange={(e) => setIncidentSearchQuery(e.target.value)}
                placeholder="Cari nama peserta atau kelas..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <select
              value={incidentClassFilter}
              onChange={(e) => setIncidentClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            >
              <option value="ALL">Semua Rombel / Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.nama}>
                  Kelas {c.nama}
                </option>
              ))}
            </select>

            <select
              value={incidentExamTypeFilter}
              onChange={(e) => setIncidentExamTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            >
              <option value="ALL">Semua Jenis Ujian</option>
              <option value="CBT">CBT Umum (ASTS/ASAS)</option>
              <option value="LITNUM">Asesmen LitNum</option>
            </select>
          </div>

          {/* Students List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentsList.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Nama Peserta Didik</th>
                    <th className="p-3">Kelas / Sesi</th>
                    <th className="p-3">Status Ujian</th>
                    <th className="p-3">Sisa Waktu</th>
                    <th className="p-3">Jawaban Masuk</th>
                    <th className="p-3 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada peserta aktif di ruang pengawasan yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSelected = Boolean(selectedStudentIds[st.id]);
                      const isSusulan = st.currentStatus === 'SUSULAN_KENDALA_TEKNIS';
                      const remainingMinutes = st.remainingTimeSeconds
                        ? Math.round(st.remainingTimeSeconds / 60)
                        : null;

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : isSusulan ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedStudentIds((prev) => ({
                                  ...prev,
                                  [st.id]: e.target.checked,
                                }));
                              }}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <strong className="text-slate-900 block">{st.studentName}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {st.studentId}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{st.className}</span>
                            <span className="text-[10px] text-slate-500 block">{st.examType || 'CBT'}</span>
                          </td>
                          <td className="p-3">
                            {isSusulan ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                DIALIHKAN KE SUSULAN
                              </span>
                            ) : st.isLocked ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                                Terkunci PIN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                Mengerjakan
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {remainingMinutes !== null ? (
                              <span>{remainingMinutes} Menit</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            {st.extendedMinutesTotal ? (
                              <span className="text-[10px] text-amber-700 block font-sans font-semibold">
                                (+{st.extendedMinutesTotal}m kompensasi)
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {st.lastSavedAnswersCount || 0} Terjawab
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSusulan && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await markStudentsAsSusulan({
                                      studentLogs: [st],
                                      reason: incidentReasonText,
                                      petugasName: currentUser?.nama || 'Petugas Ujian',
                                      petugasRole: (currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'operator' ? 'operator' : 'proktor') as any,
                                    });
                                    showToast('Siswa Dialihkan', `${st.studentName} diarahkan ke Sesi Susulan.`, 'success');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] border border-rose-200 cursor-pointer"
                                  title="Alihkan siswa ini ke sesi susulan"
                                >
                                  Susulan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  await extendExamTimeForStudents({
                                    studentLogs: [st],
                                    extensionMinutes: 15,
                                    petugasName: currentUser?.nama || 'Petugas Ujian',
                                  });
                                  showToast('Waktu Ditambahkan', `+15 menit ditambahkan untuk ${st.studentName}.`, 'success');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10.5px] border border-amber-200 cursor-pointer"
                                title="Tambah +15 menit"
                              >
                                +15m
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PILAR 4: REKAPITULASI BERITA ACARA (BAP) LENGKAP DENGAN KENDALA TEKNIS */}
      {/* ==================================================================== */}
      {activeSubTab === 'bap_recap' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Rekapitulasi Berita Acara Insiden &amp; Sesi Susulan</span>
              </h3>
              <p className="text-xs text-slate-500">
                Daftar peserta yang mengalami kendala teknis dan dialihkan ke susulan yang otomatis tercatat dalam Berita Acara Pelaksanaan (BAP).
              </p>
            </div>
          </div>

          {bapIncidentItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-500/40 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum Ada Rekaman Insiden / Kendala Teknis</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Seluruh sesi ujian berjalan lancar. Jika ada siswa yang dialihkan ke susulan melalui Tab 2, catatannya akan otomatis tertera di sini dan siap cetak BAP.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {bapIncidentItems.map((item) => (
                <div
                  key={item.bapId}
                  className="p-5 sm:p-6 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                        DOKUMEN RESMI BAP: {item.bapId}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        {item.mataPelajaran} • {item.kelasRuang}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Hari/Tanggal: {item.hariTanggal} • Proktor/Pengawas: <strong>{item.pengawas1}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                        {item.kendala.length} Siswa Terdampak
                      </span>
                    </div>
                  </div>

                  {/* Tabel Peserta Kendala Teknis */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Nama Peserta Didik</th>
                          <th className="p-2.5">NISN / No Peserta</th>
                          <th className="p-2.5">Waktu Kejadian</th>
                          <th className="p-2.5">Keterangan Resmi Insiden</th>
                          <th className="p-2.5">Status Penanganan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {item.kendala.map((k, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{k.nama}</td>
                            <td className="p-2.5 font-mono text-slate-600">{k.nisn || '-'}</td>
                            <td className="p-2.5 font-mono text-slate-600">{k.waktuKejadian}</td>
                            <td className="p-2.5 text-slate-700">{k.keterangan}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-200">
                                {k.status === 'SUSULAN_KENDALA_TEKNIS' ? 'Diarahkan ke Susulan' : 'Kompensasi Waktu'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Catatan Khusus Kejadian */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block mb-1">Catatan Kejadian Khusus (BAP):</span>
                    <p className="text-slate-600 whitespace-pre-line leading-relaxed">{item.catatan}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
