with open('src/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_tf = """export interface TeacherFeedback {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherNip?: string;
  mataPelajaran?: string[] | string;
  judul: string;
  kategori: 'Saran Fitur' | 'AI Vision & Koreksi' | 'Format Raport' | 'Bank Soal' | 'Kemudahan Penggunaan' | 'Apresiasi' | 'Lainnya';
  pesan: string;
  rating?: number;
  status: 'Baru' | 'Ditinjau' | 'Ditindaklanjuti';
  createdAt: string;
  adminNote?: string;
}"""

new_tf = """export interface TeacherFeedback {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherNip?: string;
  mataPelajaran?: string[] | string;
  judul: string;
  kategori:
    | 'Saran Pengembangan'
    | 'Kritik / Laporan Kendala'
    | 'Testimoni Penggunaan'
    | 'Saran Fitur'
    | 'AI Vision & Koreksi'
    | 'Format Raport'
    | 'Bank Soal'
    | 'Kemudahan Penggunaan'
    | 'Apresiasi'
    | 'Lainnya';
  pesan: string;
  rating?: number;
  status: 'Baru' | 'Ditinjau' | 'Ditindaklanjuti';
  createdAt: string;
  adminNote?: string;
  isBestTestimonial?: boolean;
  userRole?: string;
}

export type NotificationCategory =
  | 'penugasan_baru'
  | 'validasi_revisi'
  | 'pengingat_tenggat'
  | 'pengumuman_kedinasan'
  | 'tugas_selesai'
  | 'feedback_baru';

export interface AppNotification {
  id: string;
  recipientId: string; // Teacher ID, or 'ROLE_ADMIN', 'ROLE_OPERATOR', 'ALL_TEACHERS'
  recipientRole?: 'admin' | 'operator' | 'guru' | 'all';
  category: NotificationCategory;
  title: string;
  message: string;
  targetView?: string;
  targetId?: string;
  targetModule?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  priority?: 'normal' | 'high' | 'urgent';
  senderName?: string;
  senderRole?: string;
  metadata?: Record<string, any>;
}"""

if old_tf in text:
    text = text.replace(old_tf, new_tf, 1)
    with open('src/types.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print('TeacherFeedback and AppNotification added to src/types.ts successfully')
else:
    print('old_tf not found in src/types.ts')
