export interface SchoolInfo {
  provinsiText: string;
  dinasText?: string;
  namaSekolah: string;
  npsn: string;
  nss: string;
  akreditasi: string;
  alamat: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  tahunAjaranAktif: string;
  semesterAktif: 'Ganjil' | 'Genap';
  kktpDefault?: number;
  logoProvinsiUrl: string;
  logoSekolahUrl: string;
  logoSekolahScale: number;
  googleDriveFolderUrl?: string;
  googleDriveFolderUrlSTS?: string;
  googleDriveFolderUrlSAS?: string;
  driveSoalUrlSTS?: string;
  driveSoalUrlSAS?: string;
  driveRaporUrlSTS?: string;
  driveRaporUrlSAS?: string;
  googleDriveSubFolders?: string[];
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceStartedAt?: string;
  studentPortalLocked?: boolean;
  studentPortalHidden?: boolean;
  studentPortalLockReason?: string;
  studentPortalLockTitle?: string;
  studentPortalLockPreset?: 'di_luar_jadwal' | 'persiapan_soal' | 'ujian_selesai' | 'evaluasi_rekap' | 'kustom';
  studentPortalNextSessionInfo?: string;
  litnumVisibilityMode?: 'auto' | 'force_show' | 'force_hide';
  formatifLocked?: boolean;
  formatifLockReason?: string;
  rekapNilaiLocked?: boolean;
  rekapNilaiLockReason?: string;
  rekapNilaiHidden?: boolean;
  tandaTanganKepsekUrl?: string; // Tanda tangan Kepala Sekolah (Base64 atau URL gambar PNG transparan / JPG)
  qrCodeKartuUrl?: string; // URL / Base64 gambar QR Code resmi untuk Kartu Ujian (default: /public/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png)
  judulKartuUjian?: string; // Judul pada Kop Kartu Ujian (e.g. "KARTU PESERTA CBT PENILAIAN AKHIR SEMESTER")
  litnumModuleSettings?: {
    isHidden?: boolean; // Sakelar sembunyikan/tampilkan modul LitNum dari navigasi / portal
    isLocked?: boolean; // Sakelar kunci/nonaktifkan pengerjaan LitNum
    maintenanceNotice?: string;
    visibilityMode?: 'auto' | 'force_show' | 'force_hide'; // "Otomatis Sesuai Jadwal (Selasa & Rabu)", "Paksa Tampil (Aktif)", "Paksa Sembunyikan (Nonaktif)"
  };
  studentFeatures?: {
    cbtExamLogin?: boolean;
    verificationQR?: boolean;
    aiLearningTutor?: boolean;
    raportDigitalPreview?: boolean;
    remedialAutoTrigger?: boolean;
  };
  globalProctorMode?: boolean; // Saklar Global Mode Pengawas Ujian CBT Umum (Aktifkan Fitur Pengawas Ujian untuk Guru/GTK)
  cbtSupervisorConfig?: {
    globalSupervisorActive?: boolean; // Sakelar Master Izin Pengawas Guru Mapel
    allowUnlock?: boolean; // Izin Pengawas membuka blokir peserta
    allowAttendance?: boolean; // Izin Pengawas verifikasi presensi
    allowBeritaAcara?: boolean; // Izin Pengawas pengisian Berita Acara
    allowTimeCompensation?: boolean; // Izin Pengawas pemberian kompensasi waktu teknis
    allowForceSubmit?: boolean; // Izin pengawas submit paksa siswa
    allowResetSession?: boolean; // Izin pengawas reset sesi login siswa
    requireProctorPinForUnlock?: boolean; // Wajibkan PIN proktor 6-digit untuk buka blokir
    activeRoomCodes?: string[]; // Ruang ujian aktif yang dapat diawasi
    updatedAt?: string;
    updatedBy?: string;
  };
}

export type TeacherRole = 'admin' | 'operator' | 'kepala_sekolah' | 'guru' | 'bk' | 'wali_kelas' | 'kesiswaan' | 'proctor';

export interface Teacher {
  id: string;
  username: string;
  password?: string;
  nama: string;
  nip?: string;
  mataPelajaran: string[];
  role: 'admin' | 'operator' | 'kepala_sekolah' | 'guru' | 'kesiswaan' | 'proctor';
  roles?: TeacherRole[]; // Daftar peran gabungan
  status: 'online' | 'offline';
  fotoUrl?: string;
  lastActive?: string;
  lastLogin?: string;
  hasLoggedIn?: boolean;
  recentWork?: string;
  activeModule?: string; // Modul yang sedang dibuka guru ('sumatif' | 'rekap-nilai' | 'portal' | 'kesiswaan' | 'bk-hebat' | 'manajemen-ujian' | dll)
  currentView?: string; // Tampilan halaman saat ini ('dashboard' | 'mass-grading' | 'assessments' | 'raport-sts' | dll)
  currentActivity?: string; // Aktivitas real-time: 'Sedang Mengoreksi Draf Asesmen' | 'Menyusun Bank Soal' | dll
  activeAssessmentId?: string; // ID paket asesmen yang sedang digarap
  activeAssessmentInfo?: string; // Info ringkas asesmen (misal: "ASTS Matematika • Kelas X-1")
  aiDetectionEnabled?: boolean;
  defaultAiPenaltyPercent?: number;
  isGuruBK?: boolean; // Penugasan khusus Guru Bimbingan Konseling (BK) Hebat (7 Jurus)
  isGuruMapel?: boolean; // Penugasan Guru Mata Pelajaran (mengampu mapel & asesmen)
  isTimKesiswaan?: boolean; // Penugasan khusus Tim Kesiswaan (Presensi Siswa & Rekap Kehadiran)
  isAdmin?: boolean; // Hak akses Administrator Sistem
  isOperator?: boolean; // Hak akses Operator Sekolah & Website
  isKepalaSekolah?: boolean; // Hak akses Kepala Sekolah (Supervisi)
  isWaliKelas?: boolean; // Penugasan Wali Kelas
  isKoordinatorLitnum?: boolean; // Penugasan Koordinator Literasi & Numerasi SMAN 3 Tumijajar
  waliKelasName?: string; // Nama rombel / kelas binaan (misal: "X-A")
  proctorId?: string; // Nomor ID Pengawas Ujian CBT (contoh: PGW-12-26-001)
  isProctor?: boolean; // Penugasan khusus Guru Mapel sebagai Proktor Ujian CBT (Hak operasional teknis CBT)
  isProctorEnabled?: boolean; // Status Izin Akses Pengawas per Guru/GTK (diaktifkan/dinonaktifkan oleh Admin, Operator, atau Proktor)
  supervisorAccess?: boolean; // Izin Pengawas Ujian CBT (alias reaktif)
}

/**
 * RBAC Helper: Cek apakah pengguna merupakan Administrator atau Operator Sekolah
 */
export const isUserAdminOrOperator = (user?: Teacher | null): boolean => {
  if (!user) return false;
  return Boolean(
    user.role === 'admin' ||
    user.role === 'operator' ||
    user.isAdmin ||
    user.isOperator
  );
};

/**
 * RBAC Helper: Cek apakah pengguna berwenang mengendalikan teknis CBT & Izin Pengawas
 * (Mencakup Admin, Operator, dan Guru Mapel yang ditugaskan sebagai Proktor Ujian CBT)
 */
export const isUserProctor = (user?: Teacher | null): boolean => {
  if (!user) return false;
  return Boolean(
    isUserAdminOrOperator(user) ||
    user.isProctor ||
    user.roles?.includes('proctor') ||
    user.role === 'proctor'
  );
};

/**
 * RBAC Helper: Cek apakah pengguna adalah Proktor Mandiri (bukan Admin/Operator global)
 */
export const isStrictProctorTeacher = (user?: Teacher | null): boolean => {
  if (!user) return false;
  return !isUserAdminOrOperator(user) && Boolean(user.isProctor || user.roles?.includes('proctor') || user.role === 'proctor');
};

/**
 * RBAC Helper: Evaluasi hak akses ke Portal Pengawas Ujian (Reactive Access Evaluation)
 * - Admin, Operator, Proktor: Selalu berhak masuk dan mengendalikan pengawasan
 * - Guru Mapel / GTK: Berhak masuk HANYA jika Izin Pengawas aktif (Global ON atau Izin Guru ON)
 */
export const canUserAccessSupervisorPortal = (user?: Teacher | null, schoolInfo?: SchoolInfo | null): boolean => {
  if (!user) return false;
  if (isUserProctor(user)) return true;
  const isGlobalOn = Boolean(schoolInfo?.globalProctorMode);
  const isTeacherEnabled = Boolean(user.isProctorEnabled || user.supervisorAccess);
  return isGlobalOn || isTeacherEnabled;
};

export interface ClassItem {
  id: string;
  nama: string;
  fase: 'Fase E' | 'Fase F';
  waliKelas: string;
  totalSiswa: number;
}

export interface TeacherSubjectAssignment {
  teacherId: string;
  teacherName: string;
  nip?: string;
  kktp?: number;
  kktpX?: number;
  kktpXI?: number;
  kktpXII?: number;
  kelasAjar?: string[];
  modeSiswa?: 'SEMUA' | 'BEBERAPA';
  targetAgama?: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu' | 'ALL';
  studentIds?: string[]; // Specific student IDs taught by this teacher for this subject
}

export interface SubjectItem {
  id: string;
  kode: string;
  nama: string;
  fase?: string;
  kktp: number; // KKTP Mata Pelajaran
  kktpX?: number; // Nilai KKTP Khusus Kelas X (Fase E)
  kktpXI?: number; // Nilai KKTP Khusus Kelas XI (Fase F)
  kktpXII?: number; // Nilai KKTP Khusus Kelas XII (Fase F)
  kelasAjar?: string[];
  guruPengampu?: string[]; // Daftar nama/ID guru pengampu mata pelajaran ini
  guruAssignments?: TeacherSubjectAssignment[]; // Penentuan KKTP individual spesifik per guru
  modeSiswa?: 'SEMUA' | 'BEBERAPA';
  targetAgama?: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu' | 'ALL';
}

export interface TeacherFeedback {
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
}

export interface Student {
  id: string;
  noUrut: number;
  nisn: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  kelas: string;
  agama?: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu' | '-';
  examUsername?: string; // Username 8 digit angka acak untuk login ujian
  examPassword?: string; // Password 8 digit angka acak untuk login ujian
  isLocked?: boolean; // Status akun kredensial CBT terkunci permanen
  lockedAt?: string;
  lockedBy?: string;
  isBlocked?: boolean; // Status akun CBT diblokir otomatis oleh Anti-Cheat (6 pelanggaran / 2 siklus)
  blockedAt?: string;
  blockedReason?: string;
  fotoUrl?: string;
  examParticipantNumber?: string; // e.g. "12-26-01-001"
  nomorPeserta?: string; // Alias untuk nomor peserta ujian
  examRoom?: string; // e.g. "01" atau "Ruang 01"
  examSeatNumber?: string; // e.g. "A-01"
}

export interface ReadingPassage {
  id: string;
  teks: string;
  nomorAwal: number;
  nomorAkhir: number;
  judul?: string;
  konten?: string; // Teks wacana
  nomorSoalTerkait?: number[]; // Butir soal terkait wacana
}

export interface EssayRubricItem {
  nomor: number;
  soal: string;
  kunciJawaban: string;
  catatanJawaban?: string; // Catatan jawaban guru / pedoman tambahan opsional
  catatanKhususGuru?: string; // Catatan khusus guru & toleransi kalimat/jenis jawaban lain
  essayType?: 'TERBUKA' | 'TERTUTUP'; // Terdeteksi Essay Terbuka vs Essay Tertutup
  toleransiJawaban?: string; // Toleransi ejaan, sinonim, atau contoh konkret
  variasiJawabanDiterima?: string[]; // Contoh-contoh frasa/kalimat lain yang bisa diterima
  skorMaks: number;
  dimensiPembelajaran?: string;
  gambarSoalUrl?: string; // Gambar disisipkan ke dalam butir soal ("Perhatikan gambar di bawah ini!")
  kunciGambarUrl?: string; // Kunci jawaban berupa gambar referensi (Foto HP / File PC)
  isGambarDrawing?: boolean; // Flag penanda soal instruksi gambar / lukisan siswa
  gambarPanduan?: string; // Panduan deteksi akurasi gambar
}

export type QuestionModelType = 
  | 'PG' 
  | 'BS' 
  | 'PG_KOMPLEKS' 
  | 'MATRIX_TF' 
  | 'MENJODOHKAN' 
  | 'ISIAN_SINGKAT' 
  | 'URAIAN';

export interface MatrixRowItem {
  id: string;
  pernyataan: string;
  kunci: 'Benar' | 'Salah' | 'Sesuai' | 'Tidak Sesuai';
}

export interface MatchingPairItem {
  id: string;
  premis: string;
  jawaban: string;
}

export interface MCQQuestionItem {
  nomor: number;
  soal: string;
  modelSoal?: QuestionModelType; // Model Soal Dinamis
  pilihan: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  pilihanGambarUrl?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
  };
  kunci: string; // Misal: 'A', 'Benar', atau 'A, C'
  kunciMulti?: string[]; // Misal: ['A', 'C'] untuk model menceklis beberapa jawaban (PG Kompleks)
  skor: number;
  gambarSoalUrl?: string; // Gambar disisipkan ke dalam butir soal ("Perhatikan gambar di bawah ini!")
  stimulusGambarUrl?: string; // Gambar stimulus / wacana soal
  penjelasan?: string;
  hint?: string;
  domainLitNum?: 'literasi' | 'numerasi';
  wacanaId?: string;
  // Field tambahan untuk model soal baru
  matrixType?: 'BENAR_SALAH' | 'SESUAI_TIDAK_SESUAI';
  matrixRows?: MatrixRowItem[];
  matchingPairs?: MatchingPairItem[];
  matchingOptionsPool?: string[]; // Opsi pengecoh/pilihan jawaban acak lajur kanan
  shortAnswerKey?: string; // Kunci jawaban teks/angka eksak untuk Isian Singkat
  shortAnswerVariations?: string[]; // Variasi ejaan/huruf besar kecil yang diterima
  essayKeywords?: string[]; // Kata kunci rubrik penilaian Uraian
  essayRubrikDesc?: string; // Deskripsi kriteria penskoran
}

// ==============================================================================
// REAL-TIME ANTI-CHEAT & EXAM MONITORING DATA CONTRACT (exam_activity_logs)
// ==============================================================================
export type StudentExamStatus =
  | 'ACTIVE'
  | 'LEFT_BROWSER'
  | 'IDLE_OR_MINIMIZED'
  | 'OFFLINE'
  | 'SUBMITTED'
  | 'LOCKED_PIN'
  | 'BLOCKED_PERMANENT'
  | 'SUSULAN_KENDALA_TEKNIS';

export type AntiCheatColor = 'GREEN' | 'YELLOW' | 'RED';

export interface StudentActivityLogItem {
  timestamp: string;
  action: string;
  detail: string;
}

export interface ExamActivityLogDoc {
  id: string; // `${examId}_${studentId}`
  studentId: string;
  studentName: string;
  className: string;
  examId: string;
  examType?: string;
  deviceInfo?: string;
  currentStatus: StudentExamStatus;
  antiCheatColor?: AntiCheatColor; // 'GREEN' | 'YELLOW' | 'RED'
  violationCount: number;
  lockStage?: number; // 0 = Aktif, 1 = LOCKED_PIN (Siklus 1), 2 = BLOCKED_PERMANENT (Siklus 2)
  hasUsedPinUnlock?: boolean; // Siswa telah melewati siklus 1 (buka kunci dengan PIN)
  isBlocked?: boolean; // Pemblokiran permanen otomatis pada pelanggaran ke-6
  examStatus?: 'ACTIVE' | 'LOCKED' | 'BLOCKED' | 'SUBMITTED' | 'SUSULAN_KENDALA_TEKNIS';
  lastViolationReason?: string;
  lastViolationTime?: string;
  lastStatusChange: string;
  recentLogs: StudentActivityLogItem[];
  isLocked?: boolean;
  isSplitScreen?: boolean;
  forceSubmitted?: boolean;
  warningMessage?: string | null;
  redUnlockedCount?: number; // Tracks how many times student was unlocked from Red state
  leftAt?: number; // Milliseconds timestamp of when student left the exam
  remainingTimeSeconds?: number;
  lastSavedAnswersCount?: number;
  incidentReason?: string;
  incidentReportedAt?: string;
  incidentReportedBy?: string;
  extendedMinutesTotal?: number;
  // ASAJ Device Binding & Telemetry
  deviceType?: 'android' | 'chromebook' | 'laptop' | 'desktop' | 'unknown';
  deviceFingerprint?: string;
  boundStudentId?: string;
  boundStudentName?: string;
  sessionNumber?: number;
  deviceDetails?: string;
  workstationId?: string;
  isFullscreen?: boolean;
  deviceBlockedReason?: string;
  updatedAt: string;
}

export type BroadcastPriority = 'INFO' | 'PERINGATAN' | 'DARURAT';
export type BroadcastTargetType = 'ALL' | 'EXAM_TYPE' | 'SESSION' | 'ROOM' | 'SPECIFIC_STUDENTS';

export interface ExamBroadcast {
  id: string;
  title: string;
  message: string;
  priority: BroadcastPriority;
  targetType: BroadcastTargetType;
  targetExamType?: 'ALL' | 'CBT_UMUM' | 'CBT_LITNUM';
  targetSession?: string;
  targetRoom?: string;
  targetStudentIds?: string[];
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'admin' | 'operator' | 'proktor';
  acknowledgedBy?: string[]; // studentIds who clicked "Saya Mengerti"
  timeExtensionMinutes?: number;
}

export interface ExamSecurityConfig {
  id: string; // 'security_pin'
  activePin: string; // 6-digit angka pengawas aktif (misal '482910')
  generatedAt: string;
  updatedBy?: string;
  updatedByRole?: string;
  isActive: boolean;
  notes?: string;
}

export interface ItemScore {
  nomor: number;
  skor: number;
  feedback: string;
  jawabanSiswa?: string;
}

export interface MCQAnswerCheck {
  nomor: number;
  jawabanSiswa: string;
  kunci?: string;
  benar: boolean;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  namaSiswa?: string;
  noUrut?: number;
  nisn: string;
  kelas: string;
  nilaiAkhir: number;
  nilaiMurni?: number;
  aiDetected?: boolean;
  aiProbability?: number;
  aiPenaltyPercent?: number;
  aiPenaltyDeduction?: number;
  aiExplanation?: string;
  tuntas: boolean;
  statusKoreksi: string;
  waktuKoreksi: string;
  capaianKompetensi: string;
  itemScores?: ItemScore[];
  studentAnswers?: MCQAnswerCheck[];
  scannedImage?: string;
  scannedImages?: string[];
  authCode?: string;
  verifiedByTeacher?: boolean;
  verifiedAt?: string;
  verificationHash?: string;
  guruPengampu?: string;
  status?: 'draft' | 'final';
  examType?: 'CBT_REGULER' | 'CBT_LITNUM';
  isLocked?: boolean;
  reviewedBy?: string;
  reviewerRole?: 'admin' | 'operator' | 'proktor' | 'guru';
  finalizedAt?: string;
  reviewNotes?: string;
  activityLogs?: StudentActivityLogItem[];
}

export interface QuestionWeightsConfig {
  pg?: number;          // e.g. 50%
  pgKompleks?: number; // e.g. 20%
  menjodohkan?: number;// e.g. 15%
  isian?: number;      // e.g. 5%
  uraian?: number;     // e.g. 10%
}

export interface Assessment {
  id: string;
  guruId?: string;
  jenis: 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI';
  judul: string;
  mataPelajaran: string;
  kelas: string;
  fase: 'Fase E' | 'Fase F';
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  hariTanggal: string;
  pukul: string;
  waktuMenit: number;
  guruPengampu: string;
  kktp: number;
  jumlahSoal: number;
  petunjukUmum: string;
  essayRubrik: EssayRubricItem[];
  mcqQuestions: MCQQuestionItem[];
  readingPassages?: ReadingPassage[];
  submissions: Submission[];
  studentIds?: string[];
  isLitNum?: boolean;
  litNumType?: 'literasi' | 'numerasi';
  assignmentId?: string;
  createdAt?: string;
  // ASAJ Specific Extensions
  paketUjian?: 'Utama' | 'Susulan';
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  validationStatus?: 'Draft' | 'Siap Uji / Tervalidasi' | 'Terjadwal';
  questionWeights?: QuestionWeightsConfig;
}

export interface ArchivedState {
  id: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  archivedAt: string;
  archivedBy: string;
  schoolInfo: SchoolInfo;
  assessments: Assessment[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: SubjectItem[];
}

export interface AbsentStudentInfo {
  nama: string;
  kelas?: string;
  nisn?: string;
  nomorPeserta?: string;
  alasan?: string;
}

export interface StudentAttendanceItem {
  no?: number;
  nama: string;
  nisn?: string;
  nomorPeserta?: string;
  kelas?: string;
  hasSignature: boolean;
  status: 'Hadir' | 'Tidak Hadir';
  keterangan?: string;
}

export interface BeritaAcaraFileProof {
  url: string;
  name: string;
  type: 'image' | 'pdf' | 'docx' | 'other';
}

export interface BeritaAcaraItem {
  id: string;
  assessmentType: 'ASTS' | 'ASAS';
  namaSekolah: string;
  mataPelajaran: string;
  kelasRuang: string;
  hariTanggal: string;
  waktuPelaksanaan: string;
  pengawas1: string;
  nipPengawas1?: string;
  pengawas2?: string;
  nipPengawas2?: string;
  jumlahPesertaSeharusnya: number;
  jumlahPesertaHadir: number;
  jumlahPesertaTidakHadir: number;
  siswaTidakHadirDetail?: AbsentStudentInfo[];
  daftarSiswaDetail?: StudentAttendanceItem[];
  kendalaTeknisSiswa?: Array<{
    nama: string;
    nisn?: string;
    nomorPeserta?: string;
    kelas?: string;
    sisaWaktuMenit?: number;
    jawabanMasuk?: number;
    waktuKejadian: string;
    keterangan: string;
    petugas: string;
    status: 'SUSULAN_KENDALA_TEKNIS' | 'KOMPENSASI_WAKTU';
  }>;
  catatanKejadianKhusus?: string;
  fileBuktiUrl?: string;
  fileBuktiType?: 'image' | 'pdf' | 'docx' | 'other';
  fileBuktiName?: string;
  fileBuktiList?: BeritaAcaraFileProof[];
  uploadedAt: string;
  uploadedBy?: string;
  verifiedStatus?: 'Verified' | 'Pending' | 'Draft';
  verifiedByKepsek?: boolean;
  catatanKepsek?: string;
  verifiedAtKepsek?: string;
}

export interface SupervisiCatatan {
  id: string;
  tanggal: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  catatanUmum: string;
  rekomendasi: string;
  pembinaanGuru?: string;
  status: 'Draft' | 'Diterbitkan';
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  category: 'kegiatan_sekolah' | 'asesmen_ujian' | 'deadline' | 'libur_nasional' | 'pribadi_guru';
  level: 'sekolah' | 'guru'; // 'sekolah' = kegiatan resmi, 'guru' = kegiatan guru
  createdBy?: string;
  createdByName?: string;
  semester?: 'Ganjil' | 'Genap' | 'Semua';
  tahunAjaran?: string;
  isImportant?: boolean;
  isCompleted?: boolean;
  color?: string;
  targetClass?: string;
  targetSubject?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  kategori: 'Mendesak' | 'Penting' | 'Ujian & Asesmen' | 'Info Sekolah';
  targetRole: 'semua' | 'guru' | 'siswa';
  penulis?: string;
  isPin?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  isFlashBroadcast?: boolean; // Sakelar pengumuman mendesak (flash broadcast)
  flashPriority?: 'urgent' | 'critical' | 'warning'; // Priority level
}

export interface AIStudioPromptItem {
  id: string;
  nama: string;
  kategori: 'peserta_didik' | 'ai_vision_koreksi' | 'pembelajaran_mendalam' | 'catatan_raport' | 'custom_builder';
  systemInstruction: string;
  model: string;
  temperature: number;
  topP: number;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

// ==============================================================================
// MODUL BIMBINGAN KONSELING (BK) HEBAT - 7 JURUS BK KEMENDIKDASMEN
// ==============================================================================

export interface BKProfile {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  learningStyle: 'Visual' | 'Auditori' | 'Kinestetik' | 'Multimodal';
  strengthAttributes: string[];
  careerAspiration: string;
  achievementRecords?: Array<{ title: string; category: string; year: string }>;
  diagnosticNotes?: string;
  updatedAt?: string;
}

export interface BKEmotionLog {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  date: string;
  emotionCategory: 'gembira' | 'tenang' | 'cemas' | 'sedih' | 'marah' | 'lelah';
  energyLevel: number; // 1 to 5
  triggerNote?: string;
  chosenSolution?: string; // dari Roda Pilihan Solusi
  createdAt: string;
}

export interface BKReferral {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  referrerTeacherId: string;
  referrerTeacherName: string;
  bkCounselorId?: string;
  bkCounselorName?: string;
  initialConcern: string;
  urgencyTier: 'tier_1' | 'tier_2' | 'tier_3';
  status: 'diajukan' | 'diterima' | 'dalam_proses' | 'selesai' | 'rujuk_ahli';
  createdAt: string;
  feedbackNote?: string;
}

export interface BKCounselingLog {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  referralId?: string;
  counselorId: string;
  counselorName: string;
  counselingType: 'individu' | 'kelompok' | 'konferensi_kasus' | 'home_visit';
  sessionDate: string;
  caseCategory: string;
  counselingNotes: string; // Bersifat sangat rahasia (Confidential)
  resiliencePlan: string; // Target bangkit & strategi adaptasi (Growth-Mindset)
  generalFeedback?: string; // Rekomendasi terbuka bagi wali kelas
  status: 'berjalan' | 'selesai';
  createdAt: string;
}

export interface BKHabitLog {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  date: string;
  habitsChecked: string[];
  weeklyReflection?: string;
}

// MODUL MANAJEMEN UJIAN (CBT, TOKEN HARIAN PER JENJANG X/XI/XII, KREDENSIAL 8-DIGIT & PENUGASAN GURU)
export interface GradeExamToken {
  jenjang: 'X' | 'XI' | 'XII';
  token: string; // 6 digit alfanumerik (uppercase, tanpa O, I, 0, 1)
  activeExamId?: string;
  mapelAktif?: string;
  activeSession?: string | number;
  isActive: boolean;
  updatedAt: string;
}

export interface ExamTokenConfig {
  activeToken: string; // Fallback / Global Token 6-char
  date: string; // Tanggal keberlakuan token YYYY-MM-DD
  isEnabled: boolean; // Sakelar token harian aktif/nonaktif
  generatedAt: string;
  gradeTokens?: Record<'X' | 'XI' | 'XII', GradeExamToken>; // Token per jenjang kelas X, XI, XII
  history?: Array<{
    date: string;
    token: string;
    jenjang?: 'X' | 'XI' | 'XII' | 'SEMUA';
    generatedBy?: string;
  }>;
}

export interface ExamSessionConfig {
  sessionNumber: number;          // 1, 2, 3, ...
  sessionName: string;            // e.g. "Sesi 1 (Pagi)"
  startTime: string;              // HH:mm
  endTime: string;                // HH:mm
  token?: string;                 // Token rilis sesi e.g. "ASAJ1A"
  roomName?: string;              // Ruang lab e.g. "Lab Komputer 1"
  assignedClasses?: string[];     // Rombel yang dipetakan e.g. ["XII-1"]
  assignedStudentIds?: string[];  // Siswa kustom jika split mapping
}

export interface ExamSchedule {
  id: string;
  title: string;
  subjectName: string;
  category:
    | 'ASAS'
    | 'ASTS'
    | 'ASAJ'
    | "Simulasi D'SMART Lampung"
    | 'Simulasi CBT'
    | 'Seleksi OSN/Olimpiade'
    | 'Olimpiade Sekolah'
    | 'Remedial/Susulan';
  targetClasses: string[];
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  tokenRequired: boolean;
  activationMode?: 'manual' | 'scheduled';
  isManuallyActive?: boolean;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  status: 'Belum Dimulai' | 'Sedang Berlangsung' | 'Selesai' | 'Terkunci';
  totalQuestions?: number;
  passingGrade?: number;
  roomName?: string;
  // ASAJ Session Configuration & Device Policy
  sessionMode?: 'non-session' | 'multi-session'; // Mode Tanpa Sesi (Serentak) vs Multi-Sesi
  sessions?: ExamSessionConfig[];
  devicePolicy?: 'android_only' | 'lab_client_only' | 'hybrid'; // Kebijakan Perangkat
  paketUjian?: 'Utama' | 'Susulan';
}

export interface TeacherExamAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectName: string;
  category:
    | 'ASAS'
    | 'ASTS'
    | 'ASAJ'
    | "Simulasi D'SMART Lampung"
    | 'Simulasi CBT'
    | 'Seleksi OSN/Olimpiade'
    | 'Olimpiade Sekolah'
    | 'Remedial/Susulan';
  targetClasses: string[];
  dueDate: string;
  targetQuestions: number; // e.g. 40 PG + 5 Essay
  currentQuestionsCount: number;
  status: 'Draft' | 'Belum Digarap' | 'Sedang Digarap' | 'Progres Penggarapan' | 'Selesai Digarap' | 'Telah Diverifikasi';
  notes?: string;
  validationNotes?: string;
  verifiedAt?: string;
  submittedAt?: string;
  createdAt: string;
}

export interface StudentExamCredential {
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  examUsername: string; // 8 digit angka acak
  examPassword: string; // 8 digit angka acak
  loginStatus?: 'Belum Login' | 'Sedang Mengerjakan' | 'Selesai' | 'Sesi Terkunci';
  lastResetAt?: string;
  lastLoginAt?: string;
  currentExamTitle?: string;
  score?: number;
  completedAt?: string;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  workstationId?: string;
  deviceType?: string;
}

export interface LabCapacityConfig {
  totalQuota: number; // Jumlah kuota unit (e.g. 30 unit)
  roomName: string; // e.g. "Lab Komputer CBT Utama"
  deviceTypeDefault: 'chromebook' | 'laptop';
  prefix: string; // e.g. "CB-" atau "LAPTOP-"
}

export interface WorkstationUnitStatus {
  unitId: string; // "CB-01" s/d "CB-30"
  deviceType: 'chromebook' | 'laptop' | 'desktop';
  status: 'standby' | 'working' | 'warning' | 'completed';
  currentStudentId?: string;
  currentStudentName?: string;
  currentKelas?: string;
  currentSession?: string;
  progressPercent?: number;
  lastHeartbeat?: string;
  violationCount?: number;
  isFullscreen?: boolean;
}

export interface ExamRoomStudentAllocation {
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  roomOrderNumber: number; // No. Urut Ruang (1..40)
  participantNumber: string; // [KODE_SEKOLAH]-[KODE_TAHUN]-[KODE_RUANG]-[NOMOR_URUT] e.g. "12-26-01-001"
  seatNumber?: string;
  sessionNumber?: number;
}

export interface ExamRoom {
  id: string; // e.g. "room-01"
  roomCode: string; // "01", "02"...
  roomName: string; // "Ruang 01"
  capacity: number; // e.g. 36
  primaryClass?: string; // Kelas 1 e.g. "X.1"
  secondaryClass?: string; // Kelas 2 e.g. "XI.IPA 1"
  assignedClasses: string[]; // ["X.1", "XI.IPA 1"]
  students: ExamRoomStudentAllocation[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProctorDutySlot {
  id: string;
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Hari Ke-1 (Senin)"
  sessionNumber: number; // 1, 2
  sessionName: string; // "Sesi 1 (Pagi)"
  startTime: string; // "07:30"
  endTime: string; // "09:30"
  roomId: string;
  roomCode: string; // "01"
  roomName: string; // "Ruang 01"
  teacherId: string;
  teacherName: string;
  teacherNip?: string;
  proctorId?: string; // Nomor ID Pengawas Ujian CBT (contoh: PGW-12-26-001)
  backupTeacherId?: string;
  backupTeacherName?: string;
  token?: string;
  proctorPin?: string;
  status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
}

export interface ProctorDayConfig {
  dayIndex: number;
  date: string;
  dayName: string;
  sessions: {
    sessionNumber: number;
    sessionName: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface ExamManagementState {
  tokenConfig?: ExamTokenConfig;
  schedules?: ExamSchedule[];
  teacherAssignments?: TeacherExamAssignment[];
  studentCredentials?: StudentExamCredential[];
  activeExamType?: 'SEMUA' | 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI';
  deviceBindings?: Record<string, { studentId: string; studentName: string; boundAt: string; deviceType: string; isLocked: boolean; }>;
  activeExamName?: string;
  activeExamNote?: string;
  disabledExamTypes?: string[];
  allExamsDisabled?: boolean;
  credentialsLocked?: boolean;
  labCapacity?: LabCapacityConfig;
  workstations?: Record<string, WorkstationUnitStatus>;
  examRooms?: ExamRoom[];
  proctorSchedules?: ProctorDutySlot[];
  proctorDaysConfig?: ProctorDayConfig[];
  schoolExamCode?: string; // default "12"
}

export interface LitNumRecord {
  id: string;
  type: 'literasi' | 'numerasi';
  studentId: string;
  studentName: string;
  kelas: string;
  score: number; // 0 - 100
  totalQuestions?: number;
  correctAnswers?: number;
  date: string; // YYYY-MM-DD
  source: 'cbt_system' | 'google_form_excel' | 'manual_entry' | 'live_test';
  fileName?: string; // file name if from excel
  assessmentId?: string;
  notes?: string;
  createdAt?: string;
  status?: 'draft' | 'final';
  isLocked?: boolean;
  reviewedBy?: string;
  reviewerRole?: 'admin' | 'operator' | 'proktor' | 'koordinator';
  finalizedAt?: string;
  reviewNotes?: string;
}

export interface ExamReviewItem {
  id: string; // submission id or litnum record id
  studentId: string;
  studentName: string;
  kelas: string;
  nisn?: string;
  examType: 'CBT_REGULER' | 'CBT_LITNUM';
  subjectOrDomain: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  status: 'draft' | 'final';
  isLocked: boolean;
  submittedAt: string;
  reviewedBy?: string;
  reviewerRole?: 'admin' | 'operator' | 'proktor' | 'guru' | 'koordinator';
  finalizedAt?: string;
  reviewNotes?: string;
  answers?: any[];
  activityLogs?: StudentActivityLogItem[];
  assessmentId?: string;
}

export interface RaporPendidikanIndicator {
  code?: string;
  namaIndikator: string;
  kategori: 'Literasi' | 'Numerasi' | 'Karakter' | 'Iklim Keamanan' | 'Iklim Kebinekaan' | 'Kualitas Pembelajaran' | string;
  skor: number;
  capaian: 'Sangat Baik' | 'Baik' | 'Sedang' | 'Kurang' | 'Perlu Intervensi Khusus' | string;
  definisi?: string;
  perubahan?: string;
  detailDistribusi?: {
    mahirPercent?: number;
    cakapPercent?: number;
    dasarPercent?: number;
    perluIntervensiPercent?: number;
  };
}

export interface RaporPendidikanRekomendasi {
  id?: string;
  prioritas?: string;
  kodeIndikator?: string;
  indikator: string;
  capaian?: string;
  skor?: number;
  akarMasalah?: string;
  inspirasiBenahi?: string[];
  penjelasan?: string;
  tautanReferensi?: string;
  programKegiatanArkas?: string;
}

export interface RaporPendidikanDoc {
  id: string;
  tahun: number; // e.g. 2024, 2025
  candidateYears?: number[];
  namaSekolah?: string;
  npsn?: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  skorLiterasi: number;
  capaianLiterasi: string;
  literasiMahirPercent: number;
  literasiCakapPercent: number;
  literasiDasarPercent: number;
  literasiPerluIntervensiPercent: number;
  skorNumerasi: number;
  capaianNumerasi: string;
  numerasiMahirPercent: number;
  numerasiCakapPercent: number;
  numerasiDasarPercent: number;
  numerasiPerluIntervensiPercent: number;
  indicators: RaporPendidikanIndicator[];
  rekomendasi?: RaporPendidikanRekomendasi[];
  sheetNames?: string[];
  sheetSummaries?: { name: string; rowCount: number; columns?: string[]; previewRows?: Record<string, any>[] }[];
  rawSummary?: string;
}

export interface LitNumScheduleConfig {
  isEnabled: boolean; // Sakelar Master: Aktifkan / Matikan Pengerjaan LitNum
  scheduleMode?: 'otomatis_resmi' | 'kustom_hari' | 'bebas_setiap_hari';
  // 'otomatis_resmi': Selasa = Literasi, Rabu = Numerasi, Hari lain = Otomatis Tutup/Mati
  // 'kustom_hari': Ditentukan oleh admin/koordinator per hari
  // 'bebas_setiap_hari': Buka setiap hari sesuai jam aktif
  activeDaysLiterasi?: number[]; // [2] untuk Selasa (0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu)
  activeDaysNumerasi?: number[]; // [3] untuk Rabu
  jamMulai: string; // HH:mm format e.g. "07:30"
  jamSelesai: string; // HH:mm format e.g. "12:00"
  activeDomain: 'otomatis_hari' | 'literasi' | 'numerasi' | 'semua';
  bypassScheduleForTesting?: boolean; // Mode bypass untuk simulasi / uji coba proktor
  pesanPengumuman?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==============================================================================
// KESISWAAN - PRESENSI SISWA (DATA CONTRACT & INTERFACES)
// ==============================================================================

// Status Presensi: 'H' (Hadir), 'S' (Sakit), 'I' (Izin), 'A' (Alpha)
export type AttendanceStatusCode = 'H' | 'S' | 'I' | 'A';

export const ATTENDANCE_STATUS: Record<
  AttendanceStatusCode,
  { label: string; badge: string; color: string; border: string; activeClass: string }
> = {
  H: {
    label: 'Hadir',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    color: 'emerald',
    border: 'border-emerald-300',
    activeClass: 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500',
  },
  S: {
    label: 'Sakit',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    color: 'blue',
    border: 'border-blue-300',
    activeClass: 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-500',
  },
  I: {
    label: 'Izin',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    color: 'amber',
    border: 'border-amber-300',
    activeClass: 'bg-amber-600 text-white shadow-amber-600/30 ring-2 ring-amber-500',
  },
  A: {
    label: 'Alpha',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    color: 'rose',
    border: 'border-rose-300',
    activeClass: 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-500',
  },
};

export interface DailyAttendanceRecord {
  studentId: string;
  nama: string;
  noUrut?: number;
  nisn?: string;
  jenisKelamin?: 'L' | 'P';
  status: AttendanceStatusCode; // H | S | I | A
  keterangan?: string; // Catatan tambahan (opsional)
}

export interface DailyClassAttendance {
  id: string; // Format unik: YYYY-MM-DD_KELAS
  tanggal: string; // YYYY-MM-DD
  kelas: string;
  recordedBy: string;
  updatedAt: string;
  records: DailyAttendanceRecord[];
}

export interface TPConfig {
  code: string; // 'TP-1', 'TP-2', etc.
  description: string; // Max 100 characters per e-Rapor SMA official spec
  id_tp?: string; // UUID TP from e-Rapor SMA
  officialCode?: string; // e.g. "TP.1111", "TP.1112"
}

export interface StudentGradeRecord {
  studentId: string;
  studentName: string;
  kelas: string;
  tpScores: Record<string, number | null>; // e.g. { 'TP-1': 85, 'TP-2': 90 }
  tpAchievements?: Record<string, 'T' | 'R' | null>; // e-Rapor TP achievement checkbox: 'T' (Optimal), 'R' (Perlu Peningkatan), or null
  ptsScore: number | null; // ASTS / PTS
  pasScore: number | null; // ASAS / PAS
  manualCompetencyDesc?: string; // Optional manual override of competency description
  syncSources?: Record<string, string>; // e.g. { 'TP-1': 'Asesmen Harian Bab 1' }
  manualFlags?: Record<string, boolean>; // e.g. { 'TP-1': true } if manually edited
  // Optional e-Rapor specific row UUIDs & codes
  anggotaRombelId?: string; // UUID from column B (NILRPT)
  pembelajaranId?: string; // UUID from column C (NILRPT)
  tingkatKode?: string; // e.g. "16" from column D (NILRPT)
  nisn?: string;
}

export interface ERaporMetadata {
  rombelPembelajaranId?: string; // Row 2, Col C
  kodeMapel?: string; // Row 2, Col D
  lastStudentRow?: number; // Row 2, Col B
  totalColumns?: number; // Row 1, Col B
  templateSyncedAt?: string;
}

export interface SubjectGradeRecapSheet {
  id: string; // e.g. `${tahunAjaran}_${semester}_${kelas}_${subject}`
  tahunAjaran: string; // e.g. '2026/2027'
  semester: 'Ganjil' | 'Genap';
  kelas: string; // e.g. 'XII.1'
  fase: 'Fase E' | 'Fase F';
  mataPelajaran: string;
  guruName: string;
  guruNip?: string;
  kktp: number; // e.g. 75
  materiText?: string; // e.g. "HAM, DEMOKRASI & TALENTA"
  capaianPembelajaranText?: string; // General CP description text
  weightTPPercent: number; // default 50
  weightSemesterPercent: number; // default 50
  weightPTSPercent?: number; // default 50
  weightPASPercent?: number; // default 50
  tpConfigs: TPConfig[]; // TP-1 to TP-6 descriptions
  activeTPCount?: number; // 1 to 6 (default 6)
  tanggalCetak?: string; // e.g. "Desember 2026"
  studentRecords: StudentGradeRecord[];
  eraporMetadata?: ERaporMetadata;
  updatedAt: string;
  // Locking & Draft properties
  statusLock?: 'DRAFT' | 'FINAL';
  isFinalLocked?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  finalizedByRole?: string;
  finalizedNote?: string;
  lastAutosavedAt?: string;
  isDraftSaved?: boolean;
}

export interface HistoricalLegerStudentRow {
  studentId?: string; // Terhubung ke ID siswa sistem jika cocok
  matchedBy?: 'nisn' | 'nama' | 'unmatched';
  noUrut?: number;
  nisn?: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelasSekarang?: string;
  kelasAsal?: string;
  scores: Record<string, number | null>; // Mapel -> Nilai
  totalScore?: number;
  averageScore?: number;
  rank?: number;
  catatan?: string;
}

export interface HistoricalLegerImportRecord {
  id: string;
  title: string;
  sourceFileName: string;
  importedAt: string;
  importedBy: string;
  tahunAjaranAsal: string; // e.g. '2024/2025'
  semesterAsal: 'Ganjil' | 'Genap';
  kelasAsal: string; // e.g. 'X.1'
  targetKelas?: string; // e.g. 'XI.1'
  totalStudentsImported: number;
  totalMatchedStudents: number;
  subjectsDetected: string[];
  records: HistoricalLegerStudentRow[];
}

export interface AppState {
  version?: number;
  lastUpdated?: string;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  students: Student[];
  assessments: Assessment[];
  beritaAcaraList?: BeritaAcaraItem[];
  supervisiCatatanList?: SupervisiCatatan[];
  feedbacks?: TeacherFeedback[];
  calendarEvents?: CalendarEvent[];
  announcements?: Announcement[];
  aiStudioPrompts?: AIStudioPromptItem[];
  bkProfiles?: BKProfile[];
  bkEmotionLogs?: BKEmotionLog[];
  bkReferrals?: BKReferral[];
  bkCounselingLogs?: BKCounselingLog[];
  bkHabitLogs?: BKHabitLog[];
  examManagement?: ExamManagementState;
  litnumRecords?: LitNumRecord[];
  raportPendidikanDocs?: RaporPendidikanDoc[];
  litnumScheduleConfig?: LitNumScheduleConfig;
  dailyAttendances?: DailyClassAttendance[];
  gradeRecapSheets?: SubjectGradeRecapSheet[];
  historicalLegers?: HistoricalLegerImportRecord[];
  notifications?: AppNotification[];
  deletedIds?: string[];
  archives?: ArchivedState[];
}
