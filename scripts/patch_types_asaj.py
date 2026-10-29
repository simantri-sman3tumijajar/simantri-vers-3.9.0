with open('src/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Assessment interface
old_asm = """export interface Assessment {
  id: string;
  guruId?: string;
  jenis: 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI';
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
}"""

new_asm = """export interface QuestionWeightsConfig {
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
}"""

if old_asm in text:
    text = text.replace(old_asm, new_asm, 1)
    print('Assessment interface updated for ASAJ')

# 2. Add ExamSessionConfig and update ExamSchedule
old_sched = """export interface ExamSchedule {
  id: string;
  title: string; // Nama Ujian e.g. "ASAS Ganjil Matematika Fase F"
  subjectName: string; // Nama Mata Pelajaran
  category: 'ASAS' | 'ASTS' | "Simulasi D'SMART Lampung" | 'Simulasi CBT' | 'Seleksi OSN/Olimpiade' | 'Olimpiade Sekolah' | 'Remedial/Susulan';
  targetClasses: string[]; // e.g. ['X-1', 'X-2', 'XI-IPA-1']
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm e.g. "07:30"
  endTime: string; // HH:mm e.g. "09:00"
  durationMinutes: number; // e.g. 90
  tokenRequired: boolean;
  activationMode?: 'manual' | 'scheduled'; // Mode aktivasi: Manual (Kapan Saja) vs Otomatis Sesuai Jadwal
  isManuallyActive?: boolean; // Sakelar manual instan 1-klik aktif/nonaktif
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  status: 'Belum Dimulai' | 'Sedang Berlangsung' | 'Selesai' | 'Terkunci';
  totalQuestions?: number;
  passingGrade?: number;
  roomName?: string; // Sesi / Ruang e.g. "Ruang CBT 01"
}"""

new_sched = """export interface ExamSessionConfig {
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
}"""

if old_sched in text:
    text = text.replace(old_sched, new_sched, 1)
    print('ExamSchedule interface updated for ASAJ sessions & device policy')

# 3. Update ExamActivityLogDoc for device type, fingerprint & bound student
old_log = "  extendedMinutesTotal?: number;\n  updatedAt: string;\n}"
new_log = """  extendedMinutesTotal?: number;
  // ASAJ Device Binding & Telemetry
  deviceType?: 'android' | 'chromebook' | 'laptop' | 'desktop' | 'unknown';
  deviceFingerprint?: string;
  boundStudentId?: string;
  boundStudentName?: string;
  sessionNumber?: number;
  deviceDetails?: string;
  deviceBlockedReason?: string;
  updatedAt: string;
}"""

if old_log in text:
    text = text.replace(old_log, new_log, 1)
    print('ExamActivityLogDoc updated for device telemetry')

# 4. Update ExamManagementState activeExamType to include ASAJ
old_em = "  activeExamType?: 'SEMUA' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI';"
new_em = "  activeExamType?: 'SEMUA' | 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI';\n  deviceBindings?: Record<string, { studentId: string; studentName: string; boundAt: string; deviceType: string; isLocked: boolean; }>;"

if old_em in text:
    text = text.replace(old_em, new_em, 1)
    print('ExamManagementState updated for ASAJ')

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('src/types.ts successfully updated with ASAJ specs')
