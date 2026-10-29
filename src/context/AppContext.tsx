import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, SchoolInfo, Teacher, Assessment, Student, ClassItem, SubjectItem, TeacherFeedback, AppNotification, ArchivedState, BeritaAcaraItem, SupervisiCatatan, CalendarEvent, Announcement, AIStudioPromptItem, BKProfile, BKEmotionLog, BKReferral, BKCounselingLog, BKHabitLog, ExamTokenConfig, GradeExamToken, ExamSchedule, TeacherExamAssignment, StudentExamCredential, ExamManagementState, LitNumRecord, RaporPendidikanDoc, LitNumScheduleConfig } from '../types';
import { DEFAULT_CALENDAR_EVENTS } from '../data/defaultCalendarEvents';
import { DEFAULT_ANNOUNCEMENTS } from '../data/defaultAnnouncements';
import { DEFAULT_AISTUDIO_PROMPTS } from '../data/defaultAIStudioPrompts';
import {
  getViewFromPathname,
  getPathnameFromView,
  getModuleFromPathname,
  getPathnameFromModule,
  PATH_TO_VIEW_MAP,
  AppModuleType,
} from '../utils/urlRouter';
import { smartNetworkAdapter, NetworkProfile, UserNetworkPreference } from '../utils/networkAdapter';
import { db } from '../firebase';
import { doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { safeSetDoc, safeOnSnapshot } from '../utils/firestoreSafe';
import { normalizeStateSubjects, normalizeTeacherSubjectList } from '../utils/subjectNormalization';
import { deduplicateAppState } from '../utils/deduplication';
import { isClassMatch } from '../utils/classHelper';
import { webrtcSession } from '../utils/webrtcManager';
import {
  cleanStateForLocalStorage,
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  saveStateToIndexedDB,
  getStateFromIndexedDB,
} from '../utils/safeStorage';
import masterDb from '../data/permanentMasterDatabase.json';
import { getStudentCbtCredentials } from '../utils/cbtCredentialHelper';
import {
  getActivityDescription,
  resolveTeacherRealtimeActivity,
  getModuleDisplayName,
  formatTeacherLastActive,
} from '../utils/teacherActivityHelper';
export { getActivityDescription, resolveTeacherRealtimeActivity, getModuleDisplayName, formatTeacherLastActive };

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  state: AppState;
  currentUser: Teacher | null;
  setCurrentUser: (user: Teacher | null) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedAssessmentId: string | null;
  setSelectedAssessmentId: (id: string | null) => void;
  loading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline';
  forceCloudSync: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  refreshState: (silent?: boolean) => Promise<void>;
  updateSchoolInfo: (info: Partial<SchoolInfo>) => Promise<boolean>;
  saveTeacher: (teacher: Partial<Teacher>) => Promise<boolean>;
  saveTeachersBatch: (teachersBatch: Partial<Teacher>[]) => Promise<boolean>;
  deleteTeacher: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  deleteTeachersBatch: (ids: string[], callback?: (success: boolean) => void) => Promise<boolean>;
  saveAssessment: (assessment: Assessment) => Promise<boolean>;
  saveAssessmentsBatch: (assessments: Assessment[]) => Promise<boolean>;
  deleteAssessment: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  deleteAssessmentsBatch: (ids: string[], callback?: (success: boolean) => void) => Promise<boolean>;
  deleteSubmission: (assessmentId: string, submissionKey: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveStudent: (student: Student) => Promise<boolean>;
  saveStudentsBatch: (students: Student[]) => Promise<boolean>;
  deleteStudent: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  deleteStudentsBatch: (ids: string[], callback?: (success: boolean) => void) => Promise<boolean>;
  saveClass: (cls: ClassItem) => Promise<boolean>;
  deleteClass: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveSubject: (sbj: SubjectItem) => Promise<boolean>;
  saveSubjectsBatch: (subjects: SubjectItem[]) => Promise<boolean>;
  replaceSubjectsAll: (subjects: SubjectItem[]) => Promise<boolean>;
  importSubjectsComplete: (
    subjects: SubjectItem[],
    mode: 'replace' | 'merge',
    autoRegisterTeachers?: boolean,
    autoRegisterClasses?: boolean,
    newTeachers?: string[],
    newClasses?: string[]
  ) => Promise<boolean>;
  deleteSubject: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  deleteSubjectsBatch: (ids: string[], callback?: (success: boolean) => void) => Promise<boolean>;
  saveFeedback: (feedback: TeacherFeedback) => Promise<boolean>;
  updateFeedbackStatus: (id: string, status: 'Baru' | 'Ditinjau' | 'Ditindaklanjuti', adminNote?: string) => Promise<boolean>;
  deleteFeedback: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  clearAllFeedbacks: () => Promise<boolean>;
  addNotification: (notif: Omit<AppNotification, "id" | "createdAt" | "read"> & { id?: string }) => Promise<boolean>;
  markNotificationAsRead: (id: string) => Promise<boolean>;
  markAllNotificationsAsRead: (userId: string, role?: string) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  toggleFeedbackBestTestimonial: (id: string) => Promise<boolean>;
  saveBeritaAcara: (item: BeritaAcaraItem) => Promise<boolean>;
  deleteBeritaAcara: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  deleteBeritaAcaraBatch: (ids: string[], callback?: (success: boolean) => void) => Promise<boolean>;
  verifyBeritaAcaraKepsek: (id: string, verified: boolean, catatan?: string) => Promise<boolean>;
  saveSupervisiCatatan: (item: SupervisiCatatan) => Promise<boolean>;
  deleteSupervisiCatatan: (id: string) => Promise<boolean>;
  saveCalendarEvent: (event: CalendarEvent) => Promise<boolean>;
  deleteCalendarEvent: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  toggleCalendarEventComplete: (id: string) => Promise<boolean>;
  saveCalendarEventsBatch: (events: CalendarEvent[]) => Promise<boolean>;
  saveAnnouncement: (announcement: Announcement) => Promise<boolean>;
  deleteAnnouncement: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  toggleAnnouncementPin: (id: string) => Promise<boolean>;
  toggleAnnouncementActive: (id: string) => Promise<boolean>;
  saveAIStudioPrompt: (prompt: AIStudioPromptItem) => Promise<boolean>;
  deleteAIStudioPrompt: (id: string) => Promise<boolean>;
  resetAIStudioPromptsToDefault: () => Promise<boolean>;
  resetAllData: () => Promise<boolean>;
  resetCorrectionData: () => Promise<boolean>;
  cleanSystemGarbage: () => Promise<boolean>;
  toggleTeacherOnlineStatus: (teacherId: string) => Promise<'online' | 'offline'>;
  setTeachersStatusBatch: (teacherIds: string[], targetStatus: 'online' | 'offline') => Promise<boolean>;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonStr: string) => Promise<boolean>;
  createManualArchive: () => Promise<boolean>;
  deleteArchive: (id: string) => Promise<boolean>;
  saveBKProfile: (profile: BKProfile) => Promise<boolean>;
  deleteBKProfile: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveBKEmotionLog: (log: BKEmotionLog) => Promise<boolean>;
  deleteBKEmotionLog: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveBKReferral: (referral: BKReferral) => Promise<boolean>;
  deleteBKReferral: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveBKCounselingLog: (counseling: BKCounselingLog) => Promise<boolean>;
  deleteBKCounselingLog: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  saveBKHabitLog: (habit: BKHabitLog) => Promise<boolean>;
  deleteBKHabitLog: (id: string, callback?: (success: boolean) => void) => Promise<boolean>;
  resetAllBKData: () => Promise<boolean>;
  updateExamTokenConfig: (tokenStr?: string, isEnabled?: boolean) => Promise<boolean>;
  updateGradeExamToken: (
    jenjang: 'X' | 'XI' | 'XII',
    newToken?: string,
    extra?: { activeExamId?: string; mapelAktif?: string; activeSession?: string | number; isActive?: boolean }
  ) => Promise<boolean>;
  generateAllGradeTokens: () => Promise<boolean>;
  generateStudentExamCredentials: (options?: { classFilter?: string; forceResetAll?: boolean; autoLock?: boolean }) => Promise<boolean>;
  resetSingleStudentExamCredential: (studentId: string) => Promise<string>;
  lockStudentExamCredentials: (classFilter?: string) => Promise<boolean>;
  unlockStudentExamCredentials: (classFilter?: string) => Promise<boolean>;
  updateSingleStudentCredential: (
    studentId: string,
    newUsername: string,
    newPassword: string,
    lockAfterUpdate?: boolean
  ) => Promise<boolean>;
  saveExamSchedule: (schedule: ExamSchedule) => Promise<boolean>;
  deleteExamSchedule: (id: string) => Promise<boolean>;
  saveTeacherExamAssignment: (assignment: TeacherExamAssignment) => Promise<boolean>;
  deleteTeacherExamAssignment: (id: string) => Promise<boolean>;
  updateStudentExamSessionStatus: (
    studentId: string,
    status: 'Belum Login' | 'Sedang Mengerjakan' | 'Selesai' | 'Sesi Terkunci',
    examTitle?: string,
    score?: number
  ) => Promise<boolean>;
  resetStudentLoginSession: (studentId: string) => Promise<boolean>;
  setActiveExamSession: (
    activeType: 'SEMUA' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI',
    activeName?: string,
    activeNote?: string
  ) => Promise<boolean>;
  toggleDisabledExamType: (type: string) => Promise<boolean>;
  toggleAllExamsDisabled: (disabled: boolean) => Promise<boolean>;
  updateExamManagementState: (
    updater:
      | import('../types').ExamManagementState
      | ((prev: import('../types').ExamManagementState) => import('../types').ExamManagementState)
  ) => Promise<boolean>;
  saveLitNumRecordsBatch: (records: LitNumRecord[]) => Promise<boolean>;
  deleteLitNumRecord: (id: string) => Promise<boolean>;
  saveRaporPendidikanDoc: (doc: RaporPendidikanDoc) => Promise<boolean>;
  deleteRaporPendidikanDoc: (id: string) => Promise<boolean>;
  saveLitNumScheduleConfig: (config: LitNumScheduleConfig) => Promise<boolean>;
  saveDailyAttendance: (attendance: import('../types').DailyClassAttendance) => Promise<boolean>;
  deleteDailyAttendance: (id: string) => Promise<boolean>;
  saveDailyAttendanceBatch: (attendances: import('../types').DailyClassAttendance[]) => Promise<boolean>;
  clearAllDailyAttendances: () => Promise<boolean>;
  saveGradeRecapSheet: (sheet: import('../types').SubjectGradeRecapSheet, silent?: boolean) => Promise<boolean>;
  deleteGradeRecapSheet: (id: string) => Promise<boolean>;
  lockGradeRecapSheetFinal: (sheetId: string, note?: string) => Promise<boolean>;
  unlockGradeRecapSheetAdmin: (sheetId: string) => Promise<boolean>;
  saveHistoricalLegerRecord: (record: import('../types').HistoricalLegerImportRecord) => Promise<boolean>;
  deleteHistoricalLegerRecord: (id: string) => Promise<boolean>;
  selectedModule: AppModuleType;
  setSelectedModule: (module: AppModuleType) => void;
  activeExamTab: 'token' | 'credentials' | 'assignments' | 'schedules' | 'cards';
  setActiveExamTab: (tab: 'token' | 'credentials' | 'assignments' | 'schedules' | 'cards') => void;
  activeLitNumTab: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap';
  setActiveLitNumTab: (tab: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap') => void;
  activeSupervisiTab: 'ringkasan-eksekutif' | 'presensi-monitoring' | 'berita-acara' | 'guru-matrix' | 'asesmen-guru' | 'rekap-nilai' | 'bukti-otentik' | 'rapor-pendidikan' | 'bk-monitoring' | 'catatan';
  setActiveSupervisiTab: (tab: 'ringkasan-eksekutif' | 'presensi-monitoring' | 'berita-acara' | 'guru-matrix' | 'asesmen-guru' | 'rekap-nilai' | 'bukti-otentik' | 'rapor-pendidikan' | 'bk-monitoring' | 'catatan') => void;
  handleSaveDraftReview: (item: { id: string; examType: 'CBT_REGULER' | 'CBT_LITNUM'; reviewNotes: string; assessmentId?: string }) => Promise<boolean>;
  handleFinalizeExamScores: (items: Array<{ id: string; examType: 'CBT_REGULER' | 'CBT_LITNUM'; assessmentId?: string }>, reviewerName: string, reviewerRole: 'admin' | 'operator' | 'proktor') => Promise<boolean>;
  networkProfile: NetworkProfile;
  setNetworkPreference: (pref: UserNetworkPreference) => void;
  simulateTeacherSession: (
    teacherId: string,
    action: 'login' | 'login-sumatif' | 'switch_module' | 'switch-module' | 'logout',
    module?: string,
    customActivity?: string
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const defaultFallbackState: AppState = {
  version: Number((masterDb as any).version) || 1,
  lastUpdated: (masterDb as any).lastUpdated || new Date().toISOString(),
  schoolInfo: {
    provinsiText: 'PEMERINTAH PROVINSI LAMPUNG',
    dinasText: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    namaSekolah: 'SMA NEGERI 3 TUMIJAJAR',
    npsn: '69955116',
    nss: '30.1.1812.02.021',
    akreditasi: 'B',
    alamat: 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794',
    email: 'smantitumijajar@gmail.com',
    website: 'https://sman3tumijajar.sch.id',
    kepalaSekolah: 'Erlita Yuani Putri, M.Pd.',
    nipKepalaSekolah: '19850202 200804 2 003',
    tandaTanganKepsekUrl: '/assets/aistudio/TTD_Kepsek_35dbe690.png',
    tahunAjaranAktif: '2026/2027',
    semesterAktif: 'Ganjil',
    kktpDefault: 75,
    logoProvinsiUrl: 'https://iili.io/n1vlpFS.png',
    logoSekolahUrl: 'https://iili.io/n1vlf2t.png',
    logoSekolahScale: 100,
    studentPortalLocked: true,
    studentPortalHidden: false,
    studentPortalLockPreset: 'di_luar_jadwal',
    studentPortalLockTitle: 'Akses Ujian CBT Belum Dibuka (Di Luar Jadwal Sesi)',
    studentPortalLockReason: 'Ruang ujian hanya dibuka sesuai jadwal mata pelajaran dan sesi yang berlangsung.',
    studentPortalNextSessionInfo: '',
    litnumVisibilityMode: 'auto',
    litnumModuleSettings: {
      isHidden: false,
      isLocked: false,
      maintenanceNotice: 'Modul Asesmen LitNum sedang dalam penyesuaian jadwal atau pemeliharaan berkala oleh Koordinator LitNum.',
      visibilityMode: 'auto',
    },
    formatifLocked: true,
    formatifLockReason: 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.',
    studentFeatures: {
      cbtExamLogin: false,
      verificationQR: true,
      aiLearningTutor: true,
      raportDigitalPreview: true,
      remedialAutoTrigger: true,
    },
    ...((masterDb as any).schoolInfo || {}),
  },
  teachers: (Array.isArray((masterDb as any).teachers) && (masterDb as any).teachers.length > 0)
    ? ((masterDb as any).teachers as Teacher[])
    : [
        {
          id: 'tch-admin',
          username: 'adiel',
          password: 'adiel123',
          nama: 'ADIEL ZOVIE CHRISTYAN, M.Pd (Administrator)',
          nip: '19800315 200501 1 004',
          mataPelajaran: ['PENDIDIKAN AGAMA KRISTEN', 'SENI MUSIK', 'PENDIDIKAN ANTI KORUPSI'],
          role: 'admin',
          status: 'online',
          fotoUrl: '',
        },
      ],
  classes: ((masterDb as any).classes || []) as ClassItem[],
  subjects: ((masterDb as any).subjects || []) as SubjectItem[],
  students: ((masterDb as any).students || []) as Student[],
  assessments: ((masterDb as any).assessments || []) as Assessment[],
  calendarEvents: ((masterDb as any).calendarEvents || DEFAULT_CALENDAR_EVENTS) as CalendarEvent[],
  announcements: ((masterDb as any).announcements || DEFAULT_ANNOUNCEMENTS) as Announcement[],
  aiStudioPrompts: ((masterDb as any).aiStudioPrompts || DEFAULT_AISTUDIO_PROMPTS) as AIStudioPromptItem[],
  bkProfiles: ((masterDb as any).bkProfiles || []) as BKProfile[],
  bkEmotionLogs: ((masterDb as any).bkEmotionLogs || []) as BKEmotionLog[],
  bkReferrals: ((masterDb as any).bkReferrals || []) as BKReferral[],
  bkCounselingLogs: ((masterDb as any).bkCounselingLogs || []) as BKCounselingLog[],
  bkHabitLogs: ((masterDb as any).bkHabitLogs || []) as BKHabitLog[],
  examManagement: ((masterDb as any).examManagement || {
    tokenConfig: {
      activeToken: 'SMAN3-9X2K',
      date: new Date().toISOString().split('T')[0],
      isEnabled: true,
      generatedAt: new Date().toISOString(),
      history: [],
    },
    schedules: [],
    teacherAssignments: [],
    studentCredentials: [],
    activeExamType: 'SEMUA',
    activeExamName: 'Semua Jenis Ujian CBT',
    activeExamNote: 'Mode fleksibel: Guru mapel dapat menggarap ASTS, ASAS, Simulasi DSMART, maupun Seleksi OSN / Olimpiade.',
  }) as ExamManagementState,
  litnumScheduleConfig: ((masterDb as any).litnumScheduleConfig || {
    isEnabled: true,
    scheduleMode: 'otomatis_resmi',
    activeDaysLiterasi: [2],
    activeDaysNumerasi: [3],
    jamMulai: '07:30',
    jamSelesai: '12:00',
    activeDomain: 'otomatis_hari',
    pesanPengumuman: 'Jadwal Resmi Pengerjaan Literasi & Numerasi SMAN 3 Tumijajar aktif setiap Selasa & Rabu.',
  }) as LitNumScheduleConfig,
  litnumRecords: ((masterDb as any).litnumRecords || []) as LitNumRecord[],
  raportPendidikanDocs: ((masterDb as any).raportPendidikanDocs || []) as RaporPendidikanDoc[],
  supervisiCatatanList: ((masterDb as any).supervisiCatatanList || []) as SupervisiCatatan[],
  dailyAttendances: [],
  deletedIds: ((masterDb as any).deletedIds || []) as string[],
};

const isDummyRecord = (id?: string) => {
  if (!id) return false;
  const s = String(id).toLowerCase();
  return (
    s === 'test-1' ||
    s.startsWith('dummy-legacy-') ||
    s.startsWith('sample-legacy-') ||
    s.startsWith('bk-demo-') ||
    s.startsWith('bk-seed-') ||
    (s.startsWith('bk-prof-') && s.length <= 15) ||
    (s.startsWith('bk-emo-') && s.length <= 12) ||
    (s.startsWith('bk-ref-') && s.length <= 12) ||
    (s.startsWith('bk-cs-') && s.length <= 12)
  );
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (typeof window !== 'undefined') {
      const cached = safeGetItem('smantri_cloud_state');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            if (parsed.schoolInfo?.googleDriveFolderUrl === 'https://drive.google.com/drive/folders/1SMANTRI_ASESMEN_2026_ASTS_ASAS_TUMIJAJAR') {
              parsed.schoolInfo.googleDriveFolderUrl = '';
            }

            const delSet = new Set<string>(Array.isArray(parsed.deletedIds) ? parsed.deletedIds : []);

            // Permanently filter out any deleted IDs and legacy dummy records
            parsed.students = (Array.isArray(parsed.students) ? parsed.students : []).filter((s: any) => s && !delSet.has(s.id) && !isDummyRecord(s?.id));
            
            // Ensure arrays are initialized safely without overwriting imported custom databases
            if (!Array.isArray(parsed.students)) {
              parsed.students = ((masterDb as any).students || []).filter((s: any) => s && !delSet.has(s.id));
            }
            if (!Array.isArray(parsed.teachers) || parsed.teachers.length === 0) {
              parsed.teachers = (masterDb as any).teachers || [];
            }
            if (!Array.isArray(parsed.classes)) {
              parsed.classes = (masterDb as any).classes || [];
            }
            if (!Array.isArray(parsed.subjects)) {
              parsed.subjects = (masterDb as any).subjects || [];
            }
            if (!Array.isArray(parsed.assessments)) {
              parsed.assessments = (masterDb as any).assessments || [];
            }

            const curClasses = (Array.isArray(parsed.classes) ? parsed.classes : []).filter((c: any) => c && !delSet.has(c.id) && !isDummyRecord(c?.id));
            parsed.classes = curClasses.map((c: any) => ({
              ...c,
              totalSiswa: parsed.students.filter((st: any) => cleanCanonical(st.kelas) === cleanCanonical(c.nama)).length,
            }));
            parsed.subjects = (Array.isArray(parsed.subjects) ? parsed.subjects : []).filter((sbj: any) => sbj && !delSet.has(sbj.id) && !isDummyRecord(sbj?.id));
            parsed.assessments = (Array.isArray(parsed.assessments) ? parsed.assessments : []).filter((a: any) => a && !delSet.has(a.id) && !isDummyRecord(a?.id));
            parsed.bkProfiles = (Array.isArray(parsed.bkProfiles) ? parsed.bkProfiles : []).filter((p: any) => p && !delSet.has(p.id) && !isDummyRecord(p?.id));
            parsed.bkEmotionLogs = (Array.isArray(parsed.bkEmotionLogs) ? parsed.bkEmotionLogs : []).filter((e: any) => e && !delSet.has(e.id) && !isDummyRecord(e?.id));
            parsed.bkReferrals = (Array.isArray(parsed.bkReferrals) ? parsed.bkReferrals : []).filter((r: any) => r && !delSet.has(r.id) && !isDummyRecord(r?.id));
            parsed.bkCounselingLogs = (Array.isArray(parsed.bkCounselingLogs) ? parsed.bkCounselingLogs : []).filter((c: any) => c && !delSet.has(c.id) && !isDummyRecord(c?.id));
            parsed.bkHabitLogs = (Array.isArray(parsed.bkHabitLogs) ? parsed.bkHabitLogs : []).filter((h: any) => h && !delSet.has(h.id) && !isDummyRecord(h?.id));
            parsed.dailyAttendances = (Array.isArray(parsed.dailyAttendances) ? parsed.dailyAttendances : []).filter((a: any) => a && !delSet.has(a.id));
            parsed.deletedIds = Array.from(delSet);

            return normalizeStateSubjects(parsed);
          }
        } catch (e) {}
      }
      // Clean up legacy smantri_pending_sync that exceeded quota
      safeRemoveItem('smantri_pending_sync');
    }
    return normalizeStateSubjects(defaultFallbackState);
  });

  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  // Hydrate asynchronously from IndexedDB for unlimited offline retention without quota limits
  useEffect(() => {
    getStateFromIndexedDB()
      .then((idbState) => {
        if (idbState && typeof idbState === 'object' && (idbState.version || 0) > (stateRef.current?.version || 0)) {
          const delSet = new Set<string>([
            ...(stateRef.current?.deletedIds || []),
            ...(Array.isArray(idbState.deletedIds) ? idbState.deletedIds : [])
          ]);
          if (Array.isArray(idbState.students)) {
            idbState.students = idbState.students.filter((s: any) => s && !delSet.has(s.id) && !isDummyRecord(s?.id));
          }
          if (Array.isArray(idbState.classes)) {
            idbState.classes = idbState.classes.filter((c: any) => c && !delSet.has(c.id) && !isDummyRecord(c?.id));
          }
          if (Array.isArray(idbState.subjects)) {
            idbState.subjects = idbState.subjects.filter((sbj: any) => sbj && !delSet.has(sbj.id) && !isDummyRecord(sbj?.id));
          }
          if (Array.isArray(idbState.assessments)) {
            idbState.assessments = idbState.assessments.filter((a: any) => a && !delSet.has(a.id) && !isDummyRecord(a?.id));
          }
          if (Array.isArray(idbState.bkProfiles)) {
            idbState.bkProfiles = idbState.bkProfiles.filter((p: any) => p && !delSet.has(p.id) && !isDummyRecord(p?.id));
          }
          if (Array.isArray(idbState.bkEmotionLogs)) {
            idbState.bkEmotionLogs = idbState.bkEmotionLogs.filter((e: any) => e && !delSet.has(e.id) && !isDummyRecord(e?.id));
          }
          if (Array.isArray(idbState.bkReferrals)) {
            idbState.bkReferrals = idbState.bkReferrals.filter((r: any) => r && !delSet.has(r.id) && !isDummyRecord(r?.id));
          }
          if (Array.isArray(idbState.bkCounselingLogs)) {
            idbState.bkCounselingLogs = idbState.bkCounselingLogs.filter((c: any) => c && !delSet.has(c.id) && !isDummyRecord(c?.id));
          }
          if (Array.isArray(idbState.bkHabitLogs)) {
            idbState.bkHabitLogs = idbState.bkHabitLogs.filter((h: any) => h && !delSet.has(h.id) && !isDummyRecord(h?.id));
          }
          idbState.deletedIds = Array.from(delSet);
          stateRef.current = idbState;
          setState(idbState);
        }
      })
      .catch(() => {});
  }, []);

  const [currentUser, setCurrentUserState] = useState<Teacher | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUserId = sessionStorage.getItem('smantri_user_id') || localStorage.getItem('smantri_user_id');
      const profileStr = sessionStorage.getItem('smantri_user_profile') || localStorage.getItem('smantri_user_profile');
      if (savedUserId && profileStr) {
        try {
          const parsed = JSON.parse(profileStr);
          if (parsed && (parsed.id === savedUserId || parsed.username)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  });
  
  // Restore view from URL pathname for professional sub-paths and refresh resilience
  const [currentView, setCurrentViewRaw] = useState<string>(() => {
    return getViewFromPathname(window.location.pathname);
  });
  
  const [selectedAssessmentId, setSelectedAssessmentIdState] = useState<string | null>(() => {
    return safeGetItem('smantri_last_assessment_id') || null;
  });

  const [selectedModule, setSelectedModuleState] = useState<AppModuleType>(() => {
    if (typeof window !== 'undefined') {
      const clean = window.location.pathname.replace(/\/$/, '') || '/';
      if (clean === '/portal' || clean === '/pilih-modul' || clean === '/modul' || clean === '/portal-pilihan') {
        return 'portal';
      }
      const modFromPath = getModuleFromPathname(clean);
      if (modFromPath && modFromPath !== 'portal') {
        return modFromPath;
      }
      const saved = safeGetItem('smantri_selected_module');
      if (saved && ['supervisi', 'sumatif', 'rekap-nilai', 'tugas', 'portal', 'manajemen-data', 'bk-hebat', 'manajemen-ujian', 'litnum', 'kesiswaan'].includes(saved)) {
        return saved as AppModuleType;
      }
    }
    return 'portal';
  });

  const setSelectedModuleRef = useRef<(module: AppModuleType) => void>(() => {});
  const setSelectedModule = useCallback((module: AppModuleType) => {
    setSelectedModuleRef.current(module);
  }, []);

  const [activeExamTab, setActiveExamTab] = useState<'token' | 'credentials' | 'assignments' | 'schedules' | 'cards'>('token');
  const [activeLitNumTab, setActiveLitNumTab] = useState<'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap'>('dashboard');
  const [activeSupervisiTab, setActiveSupervisiTab] = useState<'ringkasan-eksekutif' | 'presensi-monitoring' | 'berita-acara' | 'guru-matrix' | 'asesmen-guru' | 'rekap-nilai' | 'bukti-otentik' | 'rapor-pendidikan' | 'bk-monitoring' | 'catatan'>(() => {
    if (typeof window !== 'undefined') {
      const v = getViewFromPathname(window.location.pathname);
      if (v === 'supervisi-presensi') return 'presensi-monitoring';
      if (v === 'supervisi-berita-acara') return 'berita-acara';
      if (v === 'supervisi-guru') return 'guru-matrix';
      if (v === 'supervisi-asesmen') return 'asesmen-guru';
      if (v === 'supervisi-nilai') return 'rekap-nilai';
      if (v === 'supervisi-bukti') return 'bukti-otentik';
      if (v === 'supervisi-rapor') return 'rapor-pendidikan';
      if (v === 'supervisi-bk') return 'bk-monitoring';
      if (v === 'supervisi-catatan') return 'catatan';
    }
    return 'ringkasan-eksekutif';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return safeGetItem('smantri_last_synced_time') || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Smart Adaptive Network & Bandwidth Profile State
  const [networkProfile, setNetworkProfile] = useState<NetworkProfile>(() => smartNetworkAdapter.getProfile());

  const setNetworkPreference = useCallback((pref: UserNetworkPreference) => {
    smartNetworkAdapter.setPreference(pref);
    setNetworkProfile(smartNetworkAdapter.getProfile());
  }, []);

  // Listen for browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const mod = getModuleFromPathname(path);
      setSelectedModuleState(mod);
      safeSetItem('smantri_selected_module', mod);

      const viewFromPath = getViewFromPathname(path);
      setCurrentViewRaw(viewFromPath);
      safeSetItem('smantri_last_view', viewFromPath);

      if (mod === 'supervisi') {
        if (viewFromPath === 'supervisi-dashboard') setActiveSupervisiTab('ringkasan-eksekutif');
        else if (viewFromPath === 'supervisi-presensi') setActiveSupervisiTab('presensi-monitoring');
        else if (viewFromPath === 'supervisi-berita-acara') setActiveSupervisiTab('berita-acara');
        else if (viewFromPath === 'supervisi-guru') setActiveSupervisiTab('guru-matrix');
        else if (viewFromPath === 'supervisi-asesmen') setActiveSupervisiTab('asesmen-guru');
        else if (viewFromPath === 'supervisi-nilai') setActiveSupervisiTab('rekap-nilai');
        else if (viewFromPath === 'supervisi-bukti') setActiveSupervisiTab('bukti-otentik');
        else if (viewFromPath === 'supervisi-rapor') setActiveSupervisiTab('rapor-pendidikan');
        else if (viewFromPath === 'supervisi-bk') setActiveSupervisiTab('bk-monitoring');
        else if (viewFromPath === 'supervisi-catatan') setActiveSupervisiTab('catatan');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Cross-tab broadcast channel
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const isSyncingRef = useRef(false);
  const syncDebounceTimerRef = useRef<any>(null);
  const lastSyncHashRef = useRef<string>('');

  // Centralized local state persistence helper:
  // - Strips heavy base64 images before writing to localStorage
  // - Never throws QuotaExceededError
  // - Saves full state (with images) to IndexedDB with virtually unlimited capacity
  const persistLocalState = useCallback((newState: AppState) => {
    try {
      const clean = cleanStateForLocalStorage(newState);
      safeSetItem('smantri_cloud_state', JSON.stringify(clean));
      safeRemoveItem('smantri_pending_sync'); // Remove the key that caused the quota overflow
      saveStateToIndexedDB(newState).catch(() => {});
    } catch (e) {
      console.warn('[SafeStorage] Persist local state error:', e);
    }
  }, []);

  // Sync state to cloud backend server with reliable immediate persistence & background execution
  const syncStateToServer = useCallback(async (incomingState: AppState, immediate: boolean = false) => {
    const curVer = Number(stateRef.current?.version) || 1;
    const targetVer = Math.max(curVer + 1, (Number(incomingState.version) || 1) + 1);
    const nowIso = new Date().toISOString();

    const newState: AppState = {
      ...incomingState,
      version: targetVer,
      lastUpdated: nowIso,
    };

    // 1. Immediately update UI state, memory reference and Local/IndexedDB cache (zero latency)
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    // 2. Broadcast immediately via BroadcastChannel to other tabs in the same browser (0ms instant sync)
    syncChannelRef.current?.postMessage({
      type: 'STATE_UPDATED',
      version: targetVer,
      lastUpdated: nowIso,
      timestamp: Date.now(),
    });

    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
      syncDebounceTimerRef.current = null;
    }

    const executeRemoteSync = async () => {
      const stateToSync = stateRef.current || newState;
      isSyncingRef.current = true;
      setIsSyncing(true);

      const netProfile = smartNetworkAdapter.getProfile();
      const startTime = Date.now();

      // Real-Time Sync to Firestore Cloud Database across all devices & browsers
      if (db) {
        try {
          const firestoreCleanAssessments = (stateToSync.assessments || []).map((a) => ({
            ...a,
            submissions: (a.submissions || []).map((s) => {
              const { scannedImages, scannedImage, ...cleanSub } = s;
              return cleanSub;
            }),
          }));

          const firestoreCleanArchives = (stateToSync.archives || []).map((arch) => ({
            ...arch,
            assessments: (arch.assessments || []).map((a) => ({
              ...a,
              submissions: (a.submissions || []).map((s) => {
                const { scannedImages, scannedImage, ...cleanSub } = s;
                return cleanSub;
              }),
            })),
          }));

          // Clean teacher photos to keep Firestore document well within 1MB limit
          const firestoreCleanTeachers = (stateToSync.teachers || []).map((t) => {
            if (t.fotoUrl && typeof t.fotoUrl === 'string' && t.fotoUrl.startsWith('data:image/') && t.fotoUrl.length > 2000) {
              return { ...t, fotoUrl: '' };
            }
            return t;
          });

          await safeSetDoc(
            doc(db, 'system_state', 'master'),
            {
              id: 'master',
              version: stateToSync.version || 1,
              lastUpdated: stateToSync.lastUpdated || new Date().toISOString(),
              schoolInfo: stateToSync.schoolInfo,
              teachers: firestoreCleanTeachers,
              classes: stateToSync.classes,
              subjects: stateToSync.subjects,
              students: stateToSync.students,
              assessments: firestoreCleanAssessments,
              feedbacks: stateToSync.feedbacks || [],
              archives: firestoreCleanArchives,
              deletedIds: stateToSync.deletedIds || [],
              examManagement: stateToSync.examManagement || null,
              litnumScheduleConfig: stateToSync.litnumScheduleConfig || null,
              litnumRecords: stateToSync.litnumRecords || [],
              raportPendidikanDocs: stateToSync.raportPendidikanDocs || [],
              supervisiCatatanList: stateToSync.supervisiCatatanList || [],
              bkProfiles: stateToSync.bkProfiles || [],
              bkEmotionLogs: stateToSync.bkEmotionLogs || [],
              bkReferrals: stateToSync.bkReferrals || [],
              bkCounselingLogs: stateToSync.bkCounselingLogs || [],
              bkHabitLogs: stateToSync.bkHabitLogs || [],
              calendarEvents: stateToSync.calendarEvents || [],
              announcements: stateToSync.announcements || [],
              aiStudioPrompts: stateToSync.aiStudioPrompts || [],
            }
          );
        } catch (e) {
          console.warn('[Firestore Sync Exception]:', e);
        }
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/state/sync', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(stateToSync),
        });
        clearTimeout(timeoutId);

        smartNetworkAdapter.recordLatency(Date.now() - startTime);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            let cleanData = deduplicateAppState(json.data as AppState);
            cleanData = normalizeStateSubjects(cleanData);
            cleanData.deletedIds = Array.from(new Set([...(stateToSync.deletedIds || []), ...(cleanData.deletedIds || [])]));
            stateRef.current = cleanData;
            setState(cleanData);
            persistLocalState(cleanData);
            safeRemoveItem('smantri_pending_sync');
            const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            setLastSyncTime(timeNow);
            safeSetItem('smantri_last_synced_time', timeNow);
          }
        }
        syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
      } catch (err) {
        // Retain pending sync in localStorage for automatic retry when network reconnects
        safeSetItem('smantri_pending_sync', JSON.stringify(stateToSync));
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    };

    // Run remote sync non-blocking in background so UI saves instantly (0 ms delay)
    executeRemoteSync().catch(() => {
      safeSetItem('smantri_pending_sync', JSON.stringify(newState));
    });

    return Promise.resolve(true);
  }, [persistLocalState]);

  const currentUserRef = useRef<Teacher | null>(currentUser);
  currentUserRef.current = currentUser;
  const selectedModuleRef = useRef<AppModuleType>(selectedModule);
  selectedModuleRef.current = selectedModule;
  const currentViewRef = useRef<string>(currentView);
  currentViewRef.current = currentView;
  const selectedAssessmentIdRef = useRef<string | null>(selectedAssessmentId);
  selectedAssessmentIdRef.current = selectedAssessmentId;

  // Real-Time Module Switch Handler:
  // When teacher switches module (e.g. from sumatif to portal/bk/kesiswaan/cbt),
  // immediately update their activeModule in state.teachers and broadcast,
  // causing them to automatically disappear from "Monitor Real-Time Aktivitas Guru Mapel"
  useEffect(() => {
    setSelectedModuleRef.current = (module: AppModuleType) => {
      setSelectedModuleState(module);
      selectedModuleRef.current = module;
      if (typeof window !== 'undefined') {
        safeSetItem('smantri_selected_module', module);
      }

      const cur = stateRef.current;
      const curUser = currentUserRef.current;
      if (cur && curUser && Array.isArray(cur.teachers)) {
        const nowIso = new Date().toISOString();
        const targetAsm = curUser.activeAssessmentId
          ? (cur.assessments || []).find((a) => a.id === curUser.activeAssessmentId)
          : null;
        const asmInfo = targetAsm ? `${targetAsm.mataPelajaran} • Kelas ${targetAsm.kelas} (${targetAsm.jenis})` : curUser.activeAssessmentInfo;

        const curVw = currentViewRef.current || 'dashboard';
        const curAct = getActivityDescription(curVw, asmInfo, module, curUser, cur);

        const updatedTeachers = cur.teachers.map((t) => {
          if (t.id === curUser.id) {
            return {
              ...t,
              activeModule: module,
              lastActive: nowIso,
              currentActivity: curAct,
            };
          }
          return t;
        });
        const newState = { ...cur, teachers: updatedTeachers };
        stateRef.current = newState;
        setState(newState);
        persistLocalState(newState);
        syncChannelRef.current?.postMessage({
          type: 'TEACHER_MODULE_CHANGED',
          teacherId: curUser.id,
          module,
          timestamp: nowIso,
        });
        fetch('/api/teachers/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: curUser.id,
            status: 'online',
            activeModule: module,
            currentView: curVw,
            currentActivity: curAct,
            lastActive: nowIso,
          }),
        }).catch(() => {});
        syncStateToServer(newState);
      }
    };
  }, [persistLocalState, syncStateToServer]);

  // Real-Time Login & Logout Handler:
  // Automatically detects teacher accounts on login, updates status to online & module,
  // and immediately removes them from monitors on logout.
  const setCurrentUser = useCallback((user: Teacher | null) => {
    // 1. Immediately capture the teacher being logged in/out before state/storage is mutated
    const previousUser = currentUserRef.current;
    const targetUserId = user?.id ||
      previousUser?.id ||
      sessionStorage.getItem('smantri_user_id') ||
      safeGetItem('smantri_user_id') ||
      safeGetItem('smantri_last_user_info_id');

    setCurrentUserState(user);
    currentUserRef.current = user;

    if (user) {
      sessionStorage.setItem('smantri_user_id', user.id);
      sessionStorage.setItem('smantri_user_profile', JSON.stringify(user));
      safeSetItem('smantri_last_user_info_id', user.id);
      safeSetItem('smantri_last_user_info', JSON.stringify({
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
      }));
      safeSetItem('smantri_user_id', user.id);
      safeSetItem('smantri_user_profile', JSON.stringify(user));
      
      const nowIso = new Date().toISOString();
      const cur = stateRef.current;
      if (cur && Array.isArray(cur.teachers)) {
        const curMod = selectedModuleRef.current || 'sumatif';
        const curVw = currentViewRef.current || 'dashboard';
        const teacherMapel = user.mataPelajaran?.[0];
        const targetAsm = (cur.assessments || []).find(
          (a) => a.guruId === user.id || a.guruPengampu === user.nama || (teacherMapel && a.mataPelajaran === teacherMapel)
        );
        const asmInfo = targetAsm ? `${targetAsm.mataPelajaran} • Kelas ${targetAsm.kelas} (${targetAsm.jenis})` : undefined;
        const curAct = getActivityDescription(curVw, asmInfo, curMod, user, cur);

        const updatedTeachers = cur.teachers.map((t) => {
          if (t.id === user.id) {
            return {
              ...t,
              status: 'online' as const,
              lastLogin: nowIso,
              lastActive: nowIso,
              hasLoggedIn: true,
              activeModule: curMod,
              currentView: curVw,
              activeAssessmentId: targetAsm?.id,
              activeAssessmentInfo: asmInfo,
              currentActivity: curAct,
            };
          }
          return t;
        });
        const newState = { ...cur, teachers: updatedTeachers };
        stateRef.current = newState;
        setState(newState);
        persistLocalState(newState);

        // Instant cross-tab broadcast
        syncChannelRef.current?.postMessage({
          type: 'TEACHER_LOGGED_IN',
          teacherId: user.id,
          status: 'online',
          module: curMod,
          view: curVw,
          timestamp: nowIso,
        });

        // Instant presence endpoint notification with zero lag
        fetch('/api/teachers/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: user.id,
            status: 'online',
            activeModule: curMod,
            currentView: curVw,
            currentActivity: curAct,
            activeAssessmentId: targetAsm?.id,
            activeAssessmentInfo: asmInfo,
          }),
        }).catch(() => {});

        syncStateToServer(newState);
      }
    } else {
      sessionStorage.removeItem('smantri_user_id');
      sessionStorage.removeItem('smantri_user_profile');
      safeRemoveItem('smantri_user_id');
      safeRemoveItem('smantri_user_profile');
      safeRemoveItem('smantri_session_expires');
      safeRemoveItem('smantri_last_user_info_id');
      
      const teacherToLogout = targetUserId;
      if (teacherToLogout) {
        const cur = stateRef.current;
        if (cur && Array.isArray(cur.teachers)) {
          const nowIso = new Date().toISOString();
          const updatedTeachers = cur.teachers.map((t) => {
            if (t.id === teacherToLogout) {
              return {
                ...t,
                status: 'offline' as const,
                activeModule: undefined,
                currentView: undefined,
                currentActivity: undefined,
                lastActive: nowIso,
              };
            }
            return t;
          });
          const newState = { ...cur, teachers: updatedTeachers };
          stateRef.current = newState;
          setState(newState);
          persistLocalState(newState);

          // Instant cross-tab broadcast
          syncChannelRef.current?.postMessage({
            type: 'TEACHER_LOGGED_OUT',
            teacherId: teacherToLogout,
            status: 'offline',
            timestamp: nowIso,
          });

          // Instant presence endpoint notification to mark offline on server immediately
          fetch('/api/teachers/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacherId: teacherToLogout,
              status: 'offline',
            }),
          }).catch(() => {});

          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            try {
              const blob = new Blob([JSON.stringify({ teacherId: teacherToLogout, status: 'offline' })], { type: 'application/json' });
              navigator.sendBeacon('/api/teachers/presence', blob);
            } catch (e) {}
          }

          syncStateToServer(newState);
        }
      }
    }
  }, [syncStateToServer, persistLocalState]);

  const setSelectedAssessmentId = useCallback((id: string | null) => {
    setSelectedAssessmentIdState(id);
    selectedAssessmentIdRef.current = id;
    if (id) {
      safeSetItem('smantri_last_assessment_id', id);
    } else {
      safeRemoveItem('smantri_last_assessment_id');
    }

    const cur = stateRef.current;
    const curUser = currentUserRef.current;
    if (cur && curUser && Array.isArray(cur.teachers)) {
      const targetAsm = id ? (cur.assessments || []).find((a) => a.id === id) : null;
      const infoStr = targetAsm ? `${targetAsm.mataPelajaran} • Kelas ${targetAsm.kelas} (${targetAsm.jenis})` : undefined;
      const nowIso = new Date().toISOString();
      const updatedTeachers = cur.teachers.map((t) => {
        if (t.id === curUser.id) {
          return {
            ...t,
            activeAssessmentId: id || undefined,
            activeAssessmentInfo: infoStr,
            lastActive: nowIso,
            currentActivity: getActivityDescription(currentViewRef.current, infoStr, selectedModuleRef.current, curUser, cur),
          };
        }
        return t;
      });
      const newState = { ...cur, teachers: updatedTeachers };
      stateRef.current = newState;
      setState(newState);
      persistLocalState(newState);
    }
  }, [persistLocalState]);

  // Function to set current active view state with real-time activity tracking
  const setCurrentView = useCallback((view: string) => {
    setCurrentViewRaw(view);
    currentViewRef.current = view;
    safeSetItem('smantri_last_view', view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const cur = stateRef.current;
    const curUser = currentUserRef.current;
    if (cur && curUser && Array.isArray(cur.teachers)) {
      const targetAsm = curUser.activeAssessmentId
        ? (cur.assessments || []).find((a) => a.id === curUser.activeAssessmentId)
        : null;
      const asmInfo = targetAsm ? `${targetAsm.mataPelajaran} • Kelas ${targetAsm.kelas} (${targetAsm.jenis})` : curUser.activeAssessmentInfo;
      const nowIso = new Date().toISOString();
      const curMod = selectedModuleRef.current || 'sumatif';
      const curAct = getActivityDescription(view, asmInfo, curMod, curUser, cur);

      const updatedTeachers = cur.teachers.map((t) => {
        if (t.id === curUser.id) {
          return {
            ...t,
            currentView: view,
            lastActive: nowIso,
            currentActivity: curAct,
          };
        }
        return t;
      });
      const newState = { ...cur, teachers: updatedTeachers };
      stateRef.current = newState;
      setState(newState);
      persistLocalState(newState);
      syncChannelRef.current?.postMessage({
        type: 'TEACHER_VIEW_CHANGED',
        teacherId: curUser.id,
        view,
        timestamp: nowIso,
      });
      fetch('/api/teachers/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: curUser.id,
          status: 'online',
          activeModule: curMod,
          currentView: view,
          currentActivity: curAct,
          lastActive: nowIso,
        }),
      }).catch(() => {});
    }
  }, [persistLocalState]);

  // Cache to track recent toasts and prevent duplicate/flooding toasts
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    // 1. Strictly block any unwanted background sync toasts
    const lowerTitle = (title || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();
    if (
      lowerTitle.includes('sinkronisasi database') ||
      lowerMsg.includes('disinkronkan secara otomatis') ||
      lowerTitle.includes('.json real-time')
    ) {
      return;
    }

    // 2. Prevent identical toast flooding (deduplicate within 4 seconds window)
    const key = `${type}::${title}::${message}`;
    const now = Date.now();
    const lastShown = recentToastsRef.current.get(key) || 0;
    if (now - lastShown < 4000) {
      return; // Skip duplicate toast
    }
    recentToastsRef.current.set(key, now);

    // Housekeeping: clean up old toast keys from map
    if (recentToastsRef.current.size > 50) {
      for (const [k, time] of recentToastsRef.current.entries()) {
        if (now - time > 15000) recentToastsRef.current.delete(k);
      }
    }

    // 3. Add toast and cap maximum visible toasts to 3
    const id = `toast-${now}-${Math.random()}`;
    setToasts((prev) => {
      // Filter out any older duplicate with the exact same content
      const filtered = prev.filter((t) => t.title !== title || t.message !== message);
      // Keep at most 2 previous toasts + 1 new toast = max 3
      const capped = filtered.slice(-2);
      return [...capped, { id, title, message, type }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to instantly load latest local state from storage for cross-tab sync
  const reloadFromLocalStorage = useCallback(() => {
    const rawLocal = safeGetItem('smantri_cloud_state') || safeGetItem('smantri_app_state');
    if (rawLocal) {
      try {
        const parsed = JSON.parse(rawLocal);
        if (parsed && typeof parsed === 'object') {
          const curVer = stateRef.current?.version || 0;
          const localVer = parsed.version || 0;
          if (!stateRef.current || localVer >= curVer || parsed.lastUpdated !== stateRef.current?.lastUpdated) {
            let cleanCached = deduplicateAppState(parsed);
            cleanCached = normalizeStateSubjects(cleanCached);
            stateRef.current = cleanCached;
            setState(cleanCached);
            const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            setLastSyncTime(timeNow);
            safeSetItem('smantri_last_synced_time', timeNow);

            const savedUserId = safeGetItem('smantri_user_id') || sessionStorage.getItem('smantri_user_id');
            if (savedUserId && cleanCached.teachers) {
              const found = cleanCached.teachers.find((t: Teacher) => t.id === savedUserId);
              if (found) setCurrentUserState(found);
            }
          }
        }
      } catch (e) {}
    }
  }, []);

  // Fetch state from cloud server with auto-recovery for AI Studio republish/rebuilds & static custom domains
  const refreshState = useCallback(async (silent = false, forceLocalReload = false) => {
    if (forceLocalReload) {
      reloadFromLocalStorage();
    }

    if (isSyncingRef.current) {
      return;
    }

    // High Scale & Low-Bitrate: Lightweight version check before downloading full payload from server
    let shouldFetchFullState = !silent || !stateRef.current;
    if (silent && stateRef.current) {
      try {
        const vStart = Date.now();
        const vRes = await fetch(`/api/state/version?_t=${Date.now()}`, { cache: 'no-store' });
        if (vRes.ok) {
          smartNetworkAdapter.recordLatency(Date.now() - vStart);
          const vJson = await vRes.json();
          if (vJson && vJson.success) {
            if (vJson.version <= (stateRef.current?.version || 0)) {
              // Server version is not newer than local state version - skip full fetch!
              setIsOnline(true);
              return;
            } else {
              shouldFetchFullState = true;
            }
          }
        } else {
          // Endpoint unavailable on static custom domain; reload local storage state directly
          reloadFromLocalStorage();
        }
      } catch (e) {
        reloadFromLocalStorage();
        return;
      }
    }

    if (!shouldFetchFullState) return;

    try {
      if (!silent) setLoading(true);
      setIsSyncing(true);

      let serverData: AppState | null = null;
      const fStart = Date.now();

      // Fetch state directly from local Express server
      const res = await fetch(`/api/state?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        smartNetworkAdapter.recordLatency(Date.now() - fStart);
        const json = await res.json();
        if (json && json.success && json.data) {
          serverData = json.data;
        }
      }

      if (serverData) {
        // Prevent regressing to an older server snapshot if local state is newer
        if (stateRef.current && (serverData.version || 0) < (stateRef.current.version || 0)) {
          return;
        }
        setIsOnline(true);
        let activeData: AppState = serverData;

        const allDeleted = new Set<string>([
          ...(stateRef.current?.deletedIds || []),
          ...(Array.isArray(activeData.deletedIds) ? activeData.deletedIds : [])
        ]);

        // Respect user data state (never re-inject deleted records or tombstones)
        activeData.assessments = (Array.isArray(activeData.assessments) ? activeData.assessments : []).filter((a: any) => a && !allDeleted.has(a.id) && !isDummyRecord(a.id));
        activeData.students = (Array.isArray(activeData.students) ? activeData.students : []).filter((s: any) => s && !allDeleted.has(s.id) && !isDummyRecord(s.id));
        activeData.classes = (Array.isArray(activeData.classes) ? activeData.classes : []).filter((c: any) => c && !allDeleted.has(c.id) && !isDummyRecord(c.id));
        activeData.subjects = (Array.isArray(activeData.subjects) ? activeData.subjects : []).filter((s: any) => s && !allDeleted.has(s.id) && !isDummyRecord(s.id));
        const protectedIds = new Set(['tch-admin', 'tch-operator', 'tch-kepala-sekolah']);
        activeData.teachers = (Array.isArray(activeData.teachers) ? activeData.teachers : []).filter((t: any) => t && (!allDeleted.has(t.id) || protectedIds.has(t.id)) && !isDummyRecord(t.id));
        activeData.deletedIds = Array.from(allDeleted).slice(-1000);

        // Strictly deduplicate and normalize state across devices & browsers
        activeData = deduplicateAppState(activeData);
        activeData = normalizeStateSubjects(activeData);

        stateRef.current = activeData;
        setState(activeData);
        const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeNow);
        safeSetItem('smantri_last_synced_time', timeNow);
        persistLocalState(activeData);

        // Auto-restore login session seamlessly across reload/refresh
        const savedUserId = safeGetItem('smantri_user_id') || sessionStorage.getItem('smantri_user_id');
        if (savedUserId && activeData.teachers) {
          const found = activeData.teachers.find((t: Teacher) => t.id === savedUserId);
          if (found) {
            setCurrentUserState(found);
          }
        }
      } else {
        reloadFromLocalStorage();
      }
    } catch (err) {
      reloadFromLocalStorage();
    } finally {
      setIsSyncing(false);
      if (!silent) setLoading(false);
    }
  }, [persistLocalState, reloadFromLocalStorage]);

  // Export complete JSON backup
  const exportBackupJSON = useCallback(() => {
    if (!state) return;
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `smantri_backup_asesmen_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Ekspor Cadangan Berhasil', 'File cadangan data sistem (.json) telah diunduh.', 'success');
  }, [state, showToast]);

  // Import complete JSON backup
  const importBackupJSON = useCallback(async (jsonStr: string): Promise<boolean> => {
    try {
      if (!jsonStr || typeof jsonStr !== 'string') {
        showToast('Format Tidak Valid', 'File cadangan JSON tidak valid atau kosong.', 'error');
        return false;
      }

      // Strip UTF-8 Byte Order Mark (BOM) if present
      const cleanStr = jsonStr.replace(/^\uFEFF/, '').trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanStr);
      } catch (pErr) {
        showToast('Format Tidak Valid', 'File cadangan JSON rusak atau tidak berformat JSON valid.', 'error');
        return false;
      }

      if (!parsed || typeof parsed !== 'object') {
        showToast('Format Tidak Valid', 'File cadangan JSON tidak valid.', 'error');
        return false;
      }

      // Unwrap nested structures if present (e.g., parsed.data, parsed.state, parsed.database)
      if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
        parsed = parsed.data;
      } else if (parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)) {
        parsed = parsed.state;
      } else if (parsed.database && typeof parsed.database === 'object' && !Array.isArray(parsed.database)) {
        parsed = parsed.database;
      }

      // Ensure minimal structure exists or default it gracefully
      const curState = stateRef.current;
      const normalizedData: AppState = {
        version: (Math.max(Number(curState?.version) || 0, Number(parsed.version) || 0)) + 10,
        lastUpdated: new Date().toISOString(),
        schoolInfo: parsed.schoolInfo || curState?.schoolInfo || (masterDb as any).schoolInfo,
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : (curState?.teachers || []),
        students: Array.isArray(parsed.students) ? parsed.students : (curState?.students || []),
        classes: Array.isArray(parsed.classes) ? parsed.classes : (curState?.classes || []),
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : (curState?.subjects || []),
        assessments: Array.isArray(parsed.assessments) ? parsed.assessments : (curState?.assessments || []),
        announcements: Array.isArray(parsed.announcements) ? parsed.announcements : (curState?.announcements || []),
        archives: Array.isArray(parsed.archives) ? parsed.archives : (curState?.archives || []),
        feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : (curState?.feedbacks || []),
        deletedIds: [],
        ...(parsed.litnumScheduleConfig ? { litnumScheduleConfig: parsed.litnumScheduleConfig } : {}),
        ...(parsed.litnumLogs ? { litnumLogs: parsed.litnumLogs } : {}),
        ...(parsed.cbtExams ? { cbtExams: parsed.cbtExams } : {}),
        ...(parsed.bkEntries ? { bkEntries: parsed.bkEntries } : {}),
        ...(parsed.aiStudioPrompts ? { aiStudioPrompts: parsed.aiStudioPrompts } : {}),
      };

      setLoading(true);

      // Attempt server-side import first
      let serverSuccess = false;
      let freshData: AppState = normalizedData;

      try {
        const res = await fetch('/api/state/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedData),
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.success && json.data) {
            freshData = json.data;
            serverSuccess = true;
          }
        }
      } catch (netErr) {
        console.warn('[Import Server Fetch Warning]: Network/host error, falling back to client-side restore:', netErr);
      }

      // Apply imported data to client state and persist locally & to Cloud Firestore
      stateRef.current = freshData;
      setState(freshData);
      persistLocalState(freshData);

      // Force clear any pending offline sync
      safeRemoveItem('smantri_pending_sync');

      // Sync clean data to Firestore safely
      if (db) {
        try {
          safeSetDoc(doc(db, 'system_state', 'master'), freshData).catch((fsErr) => {
            console.warn('[Import FS Sync Warning]:', fsErr);
          });
        } catch (fsErr) {
          console.warn('[Import FS Sync Exception]:', fsErr);
        }
      }

      // Trigger same-browser cross-tab state refresh
      syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

      // Synchronize currently logged-in user profile with restored teachers
      const savedUserId = safeGetItem('smantri_user_id') || sessionStorage.getItem('smantri_user_id');
      if (Array.isArray(freshData.teachers) && freshData.teachers.length > 0) {
        const found = savedUserId ? freshData.teachers.find((t: Teacher) => t.id === savedUserId) : null;
        if (found) {
          setCurrentUserState(found);
          safeSetItem('smantri_user_profile', JSON.stringify(found));
        } else {
          const adminUser = freshData.teachers.find((t: Teacher) => t.role === 'admin' || t.id === 'tch-admin') || freshData.teachers[0];
          if (adminUser) {
            setCurrentUserState(adminUser);
            safeSetItem('smantri_user_id', adminUser.id);
            sessionStorage.setItem('smantri_user_id', adminUser.id);
            safeSetItem('smantri_user_profile', JSON.stringify(adminUser));
          }
        }
      }

      showToast(
        'Restorasi Berhasil',
        serverSuccess
          ? 'Seluruh data sistem berhasil dipulihkan secara bersih dan tersimpan di server & cloud.'
          : 'Data sistem berhasil dipulihkan secara lokal & tersinkron ke Cloud Firestore.',
        'success'
      );
      return true;
    } catch (err) {
      console.error('importBackupJSON Error:', err);
      showToast('Gagal Membaca File', 'Terjadi kesalahan saat memproses file JSON cadangan.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast, persistLocalState]);

  // Initial load + Real-time Multi-Device Polling & Cross-Tab Broadcast Channel
  useEffect(() => {
    let isMounted = true;
    refreshState();

    // Flush any pending unsynced changes
    const pending = localStorage.getItem('smantri_pending_sync');
    if (pending) {
      try {
        const parsedPending = JSON.parse(pending);
        syncStateToServer(parsedPending);
      } catch (e) {}
    }

    // BroadcastChannel for instant same-browser cross-tab & cross-window sync
    try {
      const channel = new BroadcastChannel('smantri_sync_channel');
      syncChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (!event?.data) return;
        const { type, teacherId, status, module } = event.data;

        if (type === 'TEACHER_LOGGED_IN' || type === 'TEACHER_LOGGED_OUT' || type === 'TEACHER_PRESENCE_UPDATED' || type === 'TEACHER_MODULE_CHANGED') {
          if (teacherId) {
            const cur = stateRef.current;
            if (cur && Array.isArray(cur.teachers)) {
              const nowIso = new Date().toISOString();
              const isOnline = status === 'online' || type === 'TEACHER_LOGGED_IN';
              const updated = cur.teachers.map((t) => {
                if (t.id === teacherId) {
                  return {
                    ...t,
                    status: (isOnline ? 'online' : 'offline') as 'online' | 'offline',
                    lastActive: nowIso,
                    ...(isOnline ? { hasLoggedIn: true, activeModule: module || t.activeModule || 'sumatif' } : { activeModule: undefined, currentActivity: undefined }),
                  };
                }
                return t;
              });
              const newState = { ...cur, teachers: updated };
              stateRef.current = newState;
              setState(newState);
              persistLocalState(newState);
            }
          }
        } else if (type === 'STATE_UPDATED' || type === 'STATE_IMPORTED') {
          reloadFromLocalStorage();
        }
      };
    } catch (e) {}

    // Storage Event Listener for instant same-origin multi-window/tab updates
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'smantri_cloud_state' ||
        e.key === 'smantri_app_state'
      ) {
        reloadFromLocalStorage();
      }
    };

    // Real-Time Server-Sent Events (SSE) Push Listener across all devices, browsers & networks
    let eventSource: EventSource | null = null;
    let sseRetryTimer: any = null;
    let sseFailures = 0;

    const initSSE = () => {
      if (!isMounted || typeof window === 'undefined' || typeof EventSource === 'undefined') return;

      try {
        eventSource = new EventSource('/api/state/stream');

        eventSource.onopen = () => {
          setIsOnline(true);
          sseFailures = 0; // Reset failure count on success
        };

        eventSource.onmessage = (event) => {
          if (!event.data) return;
          try {
            const payload = JSON.parse(event.data);

            if (payload.type === 'TEACHER_PRESENCE_UPDATED') {
              const { teacherId, status, teacher } = payload;
              const cur = stateRef.current;
              if (cur && Array.isArray(cur.teachers) && teacherId) {
                const nowIso = new Date().toISOString();
                const isOnline = status === 'online';
                const updated = cur.teachers.map((t) => {
                  if (t.id === teacherId) {
                    return teacher || {
                      ...t,
                      status: (isOnline ? 'online' : 'offline') as 'online' | 'offline',
                      lastActive: nowIso,
                      ...(isOnline ? { hasLoggedIn: true } : { activeModule: undefined, currentActivity: undefined }),
                    };
                  }
                  return t;
                });
                const newState = { ...cur, teachers: updated };
                stateRef.current = newState;
                setState(newState);
                persistLocalState(newState);
              }
              return;
            }

            if (payload.type === 'STATE_CHANGED' || payload.type === 'STATE_IMPORTED') {
              const currentVersion = stateRef.current?.version || 0;
              const isNewer =
                (payload.version && payload.version > currentVersion) ||
                (payload.lastUpdated && payload.lastUpdated !== stateRef.current?.lastUpdated);

              if (isNewer) {
                reloadFromLocalStorage();
                refreshState(true, true);
              }
            }
          } catch (err) {}
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          sseFailures++;
          if (isMounted) {
            // Progressive backoff: 5s, 7.5s, 11s, up to max 60s
            const delay = Math.min(5000 * Math.pow(1.5, Math.min(sseFailures, 6)), 60000);
            sseRetryTimer = setTimeout(initSSE, delay);
          }
        };
      } catch (err) {
        if (isMounted) {
          sseRetryTimer = setTimeout(initSSE, 15000);
        }
      }
    };

    initSSE();

    // Smart Adaptive Background Polling Engine
    let pollTimeoutId: any = null;

    const runSmartPoll = async () => {
      if (!isMounted) return;
      if (document.visibilityState === 'visible' && !isSyncingRef.current) {
        await refreshState(true);
      }
      if (isMounted) {
        const interval = smartNetworkAdapter.getProfile().pollIntervalMs;
        pollTimeoutId = setTimeout(runSmartPoll, interval);
      }
    };

    // Schedule initial poll after smart adaptive delay
    pollTimeoutId = setTimeout(runSmartPoll, smartNetworkAdapter.getProfile().pollIntervalMs);

    // Subscribe to dynamic network adjustments (e.g. WiFi becomes tethered / weak 2G/3G)
    const unsubNetwork = smartNetworkAdapter.subscribe((profile) => {
      setNetworkProfile(profile);
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = setTimeout(runSmartPoll, profile.pollIntervalMs);
      }
    });

    // Automatic Online & Offline System Detection Handlers
    const handleOnline = () => {
      reloadFromLocalStorage();
      refreshState(true, true);
      safeRemoveItem('smantri_pending_sync');
      showToast('Status Koneksi Online', 'Sistem terhubung kembali. Akun guru aktif dan dapat melakukan sinkronisasi real-time.', 'success');
      if (currentUser) {
        const cur = stateRef.current;
        if (cur && Array.isArray(cur.teachers)) {
          const updatedTeachers = cur.teachers.map((t) =>
            t.id === currentUser.id ? { ...t, status: 'online' as const, lastActive: new Date().toISOString() } : t
          );
          const nextState = { ...cur, teachers: updatedTeachers };
          stateRef.current = nextState;
          setState(nextState);
          persistLocalState(nextState);
        }
      }
    };

    const handleOffline = () => {
      showToast('Status Koneksi Offline', 'Sistem beralih ke Mode Offline. Draf & data tersimpan aman secara lokal di perangkat.', 'warning');
      if (currentUser) {
        const cur = stateRef.current;
        if (cur && Array.isArray(cur.teachers)) {
          const updatedTeachers = cur.teachers.map((t) =>
            t.id === currentUser.id ? { ...t, status: 'offline' as const, lastActive: new Date().toISOString() } : t
          );
          const nextState = { ...cur, teachers: updatedTeachers };
          stateRef.current = nextState;
          setState(nextState);
          persistLocalState(nextState);
        }
      }
    };

    // Refresh when user returns to window/tab or network reconnects
    const handleFocus = () => {
      reloadFromLocalStorage();
      refreshState(true, true);
      safeRemoveItem('smantri_pending_sync');
    };

    // Silent background state archiving on tab exit / reload (Zero popups)
    const handleTeardown = () => {
      try {
        const cur = stateRef.current;
        if (cur) {
          persistLocalState(cur);
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const clean = cleanStateForLocalStorage(cur);
            const blob = new Blob([JSON.stringify(clean)], { type: 'application/json' });
            navigator.sendBeacon('/api/state/sync', blob);
          }
        }
      } catch (e) {}
    };

    // Periodic Real-Time Presence Heartbeat (Every 10 seconds)
    const presenceHeartbeat = setInterval(() => {
      const curUser = currentUserRef.current;
      const cur = stateRef.current;
      if (!cur || !Array.isArray(cur.teachers)) return;

      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      let stateChanged = false;

      const updatedTeachers = cur.teachers.map((t) => {
        // 1. Refresh active session for the local logged-in user
        if (curUser && t.id === curUser.id) {
          const curMod = selectedModuleRef.current || 'sumatif';
          const curVw = currentViewRef.current || 'dashboard';
          return {
            ...t,
            status: 'online' as const,
            lastActive: nowIso,
            activeModule: curMod,
            currentView: curVw,
            currentActivity: getActivityDescription(curVw, t.activeAssessmentInfo, curMod, curUser, cur),
          };
        }

        // 2. Clear stale online status for remote accounts inactive for > 2.5 minutes
        if (t.status === 'online') {
          const lastActiveTime = t.lastActive ? new Date(t.lastActive).getTime() : 0;
          if (!lastActiveTime || now - lastActiveTime > 150000) {
            stateChanged = true;
            return {
              ...t,
              status: 'offline' as const,
              activeModule: undefined,
              currentActivity: undefined,
            };
          }
        }
        return t;
      });

      if (stateChanged) {
        const newState = { ...cur, teachers: updatedTeachers };
        stateRef.current = newState;
        setState(newState);
        persistLocalState(newState);
      }

      if (curUser) {
        syncChannelRef.current?.postMessage({
          type: 'HEARTBEAT',
          teacherId: curUser.id,
          module: selectedModuleRef.current,
          view: currentViewRef.current,
          timestamp: nowIso,
        });
      }
    }, 10000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleTeardown);
    window.addEventListener('pagehide', handleTeardown);
    document.addEventListener('visibilitychange', handleFocus);

    // Real-Time Firestore Cloud Listener (Non-looping, low bitrate) across all devices
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      if (db) {
        unsubscribeFirestore = safeOnSnapshot(
          doc(db, 'system_state', 'master'),
          (snapshot) => {
            if (snapshot.exists()) {
              // Ignore local uncommitted writes to prevent cyclical re-render
              if (snapshot.metadata && snapshot.metadata.hasPendingWrites) {
                return;
              }

              const data = snapshot.data();
              if (data && (data.version !== undefined || data.lastUpdated)) {
                const curVer = Number(stateRef.current?.version) || 0;
                const incomingVer = Number(data.version) || 0;
                const isNewer =
                  !stateRef.current ||
                  incomingVer > curVer ||
                  (incomingVer === curVer && data.lastUpdated !== stateRef.current?.lastUpdated);

                if (isNewer) {
                  const allDeleted = new Set<string>([
                    ...(stateRef.current?.deletedIds || []),
                    ...(Array.isArray(data.deletedIds) ? data.deletedIds : [])
                  ]);

                  // Merge preserving any full photos in local memory
                  const localTeacherPhotos = new Map<string, string>();
                  (stateRef.current?.teachers || []).forEach((t) => {
                    if (t.fotoUrl) localTeacherPhotos.set(t.id, t.fotoUrl);
                  });

                  if (Array.isArray(data.teachers)) {
                    data.teachers = data.teachers
                      .filter((t: any) => t && (!allDeleted.has(t.id) || t.id === 'tch-admin') && !isDummyRecord(t.id))
                      .map((t: any) => {
                        const localPhoto = localTeacherPhotos.get(t.id);
                        if (!t.fotoUrl && localPhoto) {
                          return { ...t, fotoUrl: localPhoto };
                        }
                        return t;
                      });
                  }

                  // Preserve local scanned images if present
                  const localSubImages = new Map<string, { scannedImage?: string; scannedImages?: string[] }>();
                  (stateRef.current?.assessments || []).forEach((asm) => {
                    (asm.submissions || []).forEach((sub) => {
                      if (sub.scannedImage || (sub.scannedImages && sub.scannedImages.length > 0)) {
                        localSubImages.set(`${asm.id}_${sub.studentId}`, {
                          scannedImage: sub.scannedImage,
                          scannedImages: sub.scannedImages,
                        });
                      }
                    });
                  });

                  if (Array.isArray(data.assessments)) {
                    data.assessments = data.assessments
                      .filter((a: any) => a && !allDeleted.has(a.id) && !isDummyRecord(a.id))
                      .map((a: any) => {
                        if (Array.isArray(a.submissions)) {
                          const mergedSubs = a.submissions.map((sub: any) => {
                            const localImgs = localSubImages.get(`${a.id}_${sub.studentId}`);
                            if (localImgs) {
                              return {
                                ...sub,
                                scannedImage: sub.scannedImage || localImgs.scannedImage,
                                scannedImages: sub.scannedImages || localImgs.scannedImages,
                              };
                            }
                            return sub;
                          });
                          return { ...a, submissions: mergedSubs };
                        }
                        return a;
                      });
                  }

                  if (Array.isArray(data.students)) {
                    data.students = data.students.filter((s: any) => s && !allDeleted.has(s.id) && !isDummyRecord(s.id));
                  }
                  if (Array.isArray(data.classes)) {
                    data.classes = data.classes.filter((c: any) => c && !allDeleted.has(c.id) && !isDummyRecord(c.id));
                  }
                  if (Array.isArray(data.subjects)) {
                    data.subjects = data.subjects.filter((s: any) => s && !allDeleted.has(s.id) && !isDummyRecord(s.id));
                  }

                  data.deletedIds = Array.from(allDeleted).slice(-1000);
                  const cleanData = normalizeStateSubjects(data as AppState);
                  persistLocalState(cleanData);
                  stateRef.current = cleanData;
                  setState(cleanData);

                  const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  setLastSyncTime(timeNow);
                  safeSetItem('smantri_last_synced_time', timeNow);

                  // Re-bind logged-in user profile
                  const savedUserId = safeGetItem('smantri_user_id') || sessionStorage.getItem('smantri_user_id');
                  if (savedUserId && cleanData.teachers) {
                    const found = cleanData.teachers.find((t: Teacher) => t.id === savedUserId);
                    if (found) setCurrentUserState(found);
                  }

                  // Broadcast to other tabs on same device
                  try {
                    syncChannelRef.current?.postMessage({
                      type: 'STATE_UPDATED',
                      source: 'firestore_onSnapshot',
                      version: cleanData.version,
                      lastUpdated: cleanData.lastUpdated,
                    });
                  } catch (e) {}
                }
              }
            }
          }
        );
      }
    } catch (e) {
      console.warn('[Firestore Listener Setup Exception]:', e);
    }

    return () => {
      isMounted = false;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
      try {
        eventSource?.close();
      } catch (e) {}
      clearInterval(presenceHeartbeat);
      unsubNetwork();
      unsubscribeFirestore?.();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleTeardown);
      window.removeEventListener('pagehide', handleTeardown);
      document.removeEventListener('visibilitychange', handleFocus);
      syncChannelRef.current?.close();
    };
  }, [refreshState, syncStateToServer, showToast, reloadFromLocalStorage]);

  const updateSchoolInfo = async (info: Partial<SchoolInfo>): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    let updatedArchives = cur.archives ? [...cur.archives] : [];

    // Check if school year or semester is changing
    const isYearChanging = info.tahunAjaranAktif && info.tahunAjaranAktif !== cur.schoolInfo.tahunAjaranAktif;
    const isSemesterChanging = info.semesterAktif && info.semesterAktif !== cur.schoolInfo.semesterAktif;

    if (isYearChanging || isSemesterChanging) {
      // Archive current state BEFORE switching to the new year/semester
      const oldYear = cur.schoolInfo.tahunAjaranAktif;
      const oldSemester = cur.schoolInfo.semesterAktif;

      // Prevent duplicate archive for the same year and semester
      const archiveId = `arch-${oldYear.replace(/[^a-zA-Z0-9]/g, '_')}-${oldSemester.toLowerCase()}`;
      const alreadyArchived = updatedArchives.some((a) => a.id === archiveId);

      if (!alreadyArchived) {
        // Filter assessments for that specific period
        const periodAssessments = (cur.assessments || []).filter(
          (a) => a.tahunAjaran === oldYear && a.semester === oldSemester
        );

        const newArchive: ArchivedState = {
          id: archiveId,
          tahunAjaran: oldYear,
          semester: oldSemester,
          archivedAt: new Date().toISOString(),
          archivedBy: currentUser?.nama || 'System',
          schoolInfo: { ...cur.schoolInfo },
          assessments: periodAssessments,
          students: [...(cur.students || [])],
          teachers: [...(cur.teachers || [])],
          classes: [...(cur.classes || [])],
          subjects: [...(cur.subjects || [])],
        };

        updatedArchives.push(newArchive);
        showToast('Arsip Otomatis Terbuat', `Data untuk Tahun Ajaran ${oldYear} - ${oldSemester} berhasil diarsipkan.`, 'success');
      }
    }

    const newSchoolInfo = {
      ...cur.schoolInfo,
      ...info,
      ...(info.litnumModuleSettings ? {
        litnumModuleSettings: {
          ...(cur.schoolInfo.litnumModuleSettings || {}),
          ...info.litnumModuleSettings,
        }
      } : {}),
    };
    const newState = { 
      ...cur, 
      version: (cur.version || 1) + 1, 
      schoolInfo: newSchoolInfo,
      archives: updatedArchives 
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Profil Diperbarui', 'Data sekolah & tahun ajaran aktif berhasil disimpan ke semua perangkat.', 'success');
    await syncStateToServer(newState);
    return true;
  };

  const createManualArchive = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const year = cur.schoolInfo.tahunAjaranAktif;
    const semester = cur.schoolInfo.semesterAktif;
    const archiveId = `arch-${year.replace(/[^a-zA-Z0-9]/g, '_')}-${semester.toLowerCase()}-${Date.now()}`;

    const periodAssessments = (cur.assessments || []).filter(
      (a) => a.tahunAjaran === year && a.semester === semester
    );

    const newArchive: ArchivedState = {
      id: archiveId,
      tahunAjaran: year,
      semester,
      archivedAt: new Date().toISOString(),
      archivedBy: currentUser?.nama || 'System',
      schoolInfo: { ...cur.schoolInfo },
      assessments: periodAssessments,
      students: [...(cur.students || [])],
      teachers: [...(cur.teachers || [])],
      classes: [...(cur.classes || [])],
      subjects: [...(cur.subjects || [])],
    };

    const updatedArchives = cur.archives ? [...cur.archives] : [];
    updatedArchives.push(newArchive);

    const newState = {
      ...cur,
      version: (cur.version || 1) + 1,
      archives: updatedArchives,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Arsip Manual Berhasil', `Data untuk Tahun Ajaran ${year} - ${semester} berhasil diarsipkan secara manual.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteArchive = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updatedArchives = (cur.archives || []).filter((a) => a.id !== id);
    const newState = {
      ...cur,
      version: (cur.version || 1) + 1,
      archives: updatedArchives,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Arsip Dihapus', 'Data arsip terpilih berhasil dihapus dari sistem.', 'info');
    syncStateToServer(newState);
    return true;
  };

  const saveTeacher = async (teacher: Partial<Teacher>): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    // Clean, deduplicate and normalize teacher's subjects against official master subjects
    const cleanSubjects = normalizeTeacherSubjectList(
      teacher.mataPelajaran,
      cur.subjects || []
    );

    let updatedTeachers = [...(cur.teachers || [])];
    let updatedTargetTeacher: Teacher;

    const cleanNip = (teacher.nip || '').trim();
    const cleanNama = (teacher.nama || '').trim().toLowerCase();
    const cleanUser = (teacher.username || '').trim().toLowerCase();

    const existingIdx = updatedTeachers.findIndex((t) => {
      if (teacher.id && t.id === teacher.id) return true;
      if (cleanNip && cleanNip !== '-' && t.nip && t.nip.trim() === cleanNip) return true;
      if (cleanUser && t.username && t.username.trim().toLowerCase() === cleanUser) return true;
      if (cleanNama && t.nama && t.nama.trim().toLowerCase() === cleanNama) return true;
      return false;
    });

    if (existingIdx >= 0) {
      updatedTargetTeacher = {
        ...updatedTeachers[existingIdx],
        ...teacher,
        id: updatedTeachers[existingIdx].id,
        mataPelajaran: cleanSubjects,
      } as Teacher;
      updatedTeachers[existingIdx] = updatedTargetTeacher;
    } else {
      updatedTargetTeacher = {
        id: teacher.id || `tch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        username: teacher.username || (teacher.nama ? teacher.nama.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guru_baru'),
        password: teacher.password || '123456',
        nama: teacher.nama || 'Guru Baru',
        nip: teacher.nip || '',
        mataPelajaran:
          cleanSubjects.length > 0
            ? cleanSubjects
            : (cur.subjects && cur.subjects.length > 0)
            ? [cur.subjects[0].nama]
            : ['Bahasa Indonesia'],
        role: teacher.role || 'guru',
        status: 'online',
        fotoUrl: teacher.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };
      updatedTeachers.push(updatedTargetTeacher);
    }

    // Two-way synchronization with official subjects & state normalization
    const interimState: AppState = {
      ...cur,
      teachers: updatedTeachers,
      deletedIds: (cur.deletedIds || []).filter((d) => d !== updatedTargetTeacher.id),
    };
    const cleanState = normalizeStateSubjects(interimState);

    const newState = { ...cleanState, version: (cur.version || 1) + 1 };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    if (currentUser && currentUser.id === updatedTargetTeacher.id) {
      const latestUser = newState.teachers.find((t) => t.id === updatedTargetTeacher.id) || updatedTargetTeacher;
      setCurrentUserState(latestUser);
      sessionStorage.setItem('smantri_user_id', latestUser.id);
      safeSetItem('smantri_user_id', latestUser.id);
    }

    showToast('Berhasil Disimpan', `Data akun guru ${updatedTargetTeacher.nama} berhasil disimpan dan tampil di sistem.`, 'success');
    syncStateToServer(newState, true);
    return true;
  };

  const saveTeachersBatch = async (teachersBatch: Partial<Teacher>[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !teachersBatch || teachersBatch.length === 0) return false;

    let updatedTeachers = [...(cur.teachers || [])];

    teachersBatch.forEach((tInput) => {
      const cleanSubjects = normalizeTeacherSubjectList(
        tInput.mataPelajaran,
        cur.subjects || []
      );
      const cleanNip = (tInput.nip || '').trim();
      const cleanNama = (tInput.nama || '').trim().toLowerCase();
      const cleanUser = (tInput.username || '').trim().toLowerCase();

      const idx = updatedTeachers.findIndex((t) => {
        if (tInput.id && t.id === tInput.id) return true;
        if (cleanNip && cleanNip !== '-' && t.nip && t.nip.trim() === cleanNip) return true;
        if (cleanUser && t.username && t.username.trim().toLowerCase() === cleanUser) return true;
        if (cleanNama && t.nama && t.nama.trim().toLowerCase() === cleanNama) return true;
        return false;
      });

      if (idx >= 0) {
        updatedTeachers[idx] = {
          ...updatedTeachers[idx],
          ...tInput,
          id: updatedTeachers[idx].id,
          mataPelajaran: cleanSubjects,
        } as Teacher;
      } else {
        const newTeacher: Teacher = {
          id: tInput.id || `tch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          username: tInput.username || (tInput.nama ? tInput.nama.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guru_baru'),
          password: tInput.password || '123456',
          nama: tInput.nama || 'Guru Baru',
          nip: tInput.nip || '',
          mataPelajaran:
            cleanSubjects.length > 0
              ? cleanSubjects
              : (cur.subjects && cur.subjects.length > 0)
              ? [cur.subjects[0].nama]
              : ['Bahasa Indonesia'],
          role: tInput.role || 'guru',
          status: tInput.status || 'offline',
          fotoUrl: tInput.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };
        updatedTeachers.push(newTeacher);
      }
    });

    const interimState: AppState = {
      ...cur,
      teachers: updatedTeachers,
    };
    const cleanState = normalizeStateSubjects(interimState);
    const newState = { ...cleanState, version: (cur.version || 1) + 1 };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    if (currentUser) {
      const latestUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (latestUser) {
        setCurrentUserState(latestUser);
      }
    }

    showToast(
      'Perubahan Massal Berhasil Disimpan',
      `Berhasil memperbarui data ${teachersBatch.length} akun guru secara bersamaan.`,
      'success'
    );
    syncStateToServer(newState, true);
    return true;
  };

  const deleteTeacher = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    if (id === 'tch-admin') {
      showToast('Akses Ditolak', 'Akun Administrator utama tidak dapat dihapus.', 'error');
      if (callback) callback(false);
      return false;
    }
    // 1. Optimistic UI update
    const previousState = cur;
    const updatedTeachers = (cur.teachers || []).filter((t) => t.id !== id);
    const updatedDeleted = Array.from(new Set([...(cur.deletedIds || []), id]));
    const newState = { ...cur, version: (cur.version || 1) + 1, teachers: updatedTeachers, deletedIds: updatedDeleted };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...updatedDeleted, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
          if (db) safeSetDoc(doc(db, 'system_state', 'master'), cleanData);
        }
        showToast('Akun Dihapus', json.message || 'Data akun guru berhasil dihapus.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Gagal menghapus akun guru di server.');
      }
    } catch (err: any) {
      console.error('[deleteTeacher Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const deleteTeachersBatch = async (ids: string[], callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !ids || ids.length === 0) return false;
    const previousState = cur;
    const idSet = new Set(ids);
    idSet.delete('tch-admin');

    // 1. Optimistic UI update
    const updatedTeachers = (cur.teachers || []).filter((t) => !idSet.has(t.id));
    const updatedDeleted = Array.from(new Set([...(cur.deletedIds || []), ...Array.from(idSet)]));
    const newState = { ...cur, version: (cur.version || 1) + 1, teachers: updatedTeachers, deletedIds: updatedDeleted };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch('/api/teachers/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(idSet) }),
      });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...updatedDeleted, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
          if (db) safeSetDoc(doc(db, 'system_state', 'master'), cleanData);
        }
        showToast('Akun Guru Dihapus', json.message || `${idSet.size} akun guru berhasil dihapus.`, 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus batch guru.');
      }
    } catch (err: any) {
      console.error('[deleteTeachersBatch Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Batch', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveAssessment = async (assessment: Assessment): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !assessment) return false;
    let updated = [...(cur.assessments || [])];
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const idx = updated.findIndex(
      (a) =>
        a.id === assessment.id ||
        (cleanCanonical(a.mataPelajaran) === cleanCanonical(assessment.mataPelajaran) &&
          (cleanCanonical(a.kelas) === cleanCanonical(assessment.kelas) ||
            isClassMatch(a.kelas, assessment.kelas) ||
            isClassMatch(assessment.kelas, a.kelas)) &&
          a.jenis === assessment.jenis &&
          (a.semester || '').toLowerCase() === (assessment.semester || '').toLowerCase() &&
          (a.tahunAjaran || '') === (assessment.tahunAjaran || ''))
    );

    let finalAssessment = { ...assessment };
    if (idx >= 0) {
      const existing = updated[idx];
      finalAssessment.id = existing.id;
      // Do not resurrect removed submissions: use assessment.submissions if provided
      if (!assessment.submissions && existing.submissions) {
        finalAssessment.submissions = existing.submissions;
      }
      updated[idx] = finalAssessment;
    } else {
      finalAssessment.id = finalAssessment.id || `asm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      updated.unshift(finalAssessment);
    }

    const interimState = { ...cur, version: (cur.version || 1) + 1, assessments: updated };
    const newState = deduplicateAppState(interimState);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Asesmen Tersimpan', `Modul ${finalAssessment.jenis} (${finalAssessment.mataPelajaran}) berhasil disimpan & tampil di sistem.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const saveAssessmentsBatch = async (assessments: Assessment[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !assessments || assessments.length === 0) return false;
    let updated = [...(cur.assessments || [])];
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    assessments.forEach((asm) => {
      const idx = updated.findIndex(
        (a) =>
          a.id === asm.id ||
          (cleanCanonical(a.mataPelajaran) === cleanCanonical(asm.mataPelajaran) &&
            cleanCanonical(a.kelas) === cleanCanonical(asm.kelas) &&
            a.jenis === asm.jenis &&
            (a.semester || '').toLowerCase() === (asm.semester || '').toLowerCase() &&
            (a.tahunAjaran || '') === (asm.tahunAjaran || ''))
      );
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          ...asm,
          id: updated[idx].id,
        };
      } else {
        updated.unshift({
          ...asm,
          id: asm.id || `asm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        });
      }
    });

    const interimState = { ...cur, version: (cur.version || 1) + 1, assessments: updated };
    const newState = deduplicateAppState(interimState);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Asesmen Multi-Kelas Tersimpan', `${assessments.length} modul asesmen berhasil dibuat & tampil di Bank Asesmen.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteAssessment = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    // 1. Optimistic UI update: Immediately remove from state, add to deletedIds tombstone set, and save to cache
    const updated = (cur.assessments || []).filter((a) => a.id !== id);
    const newDeletedIds = Array.from(new Set([...(cur.deletedIds || []), id]));
    const newState = { ...cur, version: (cur.version || 1) + 1, assessments: updated, deletedIds: newDeletedIds };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      // 2. Direct REST controller delete execution
      const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Asesmen Dihapus', json.message || 'Data modul asesmen berhasil dihapus.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus data asesmen.');
      }
    } catch (err: any) {
      console.error('[deleteAssessment Error]:', err);
      // Rollback on failure
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Asesmen', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const deleteAssessmentsBatch = async (ids: string[], callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !ids || ids.length === 0) return false;
    const previousState = cur;

    const idSet = new Set(ids);
    const updated = (cur.assessments || []).filter((a) => !idSet.has(a.id));
    const newDeletedIds = Array.from(new Set([...(cur.deletedIds || []), ...ids]));
    const newState = { ...cur, version: (cur.version || 1) + 1, assessments: updated, deletedIds: newDeletedIds };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch('/api/assessments/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Asesmen Dihapus', json.message || `${ids.length} asesmen berhasil dihapus.`, 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Gagal menghapus batch asesmen.');
      }
    } catch (err: any) {
      console.error('[deleteAssessmentsBatch Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Batch', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const deleteSubmission = async (
    assessmentId: string,
    submissionKey: string,
    callback?: (success: boolean) => void
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    const targetAsm = (cur.assessments || []).find((a) => a.id === assessmentId);
    if (!targetAsm) return false;

    const filteredSubs = (targetAsm.submissions || []).filter(
      (s) => s.id !== submissionKey && s.studentId !== submissionKey && s.studentName !== submissionKey
    );

    const updatedAssessments = (cur.assessments || []).map((a) =>
      a.id === assessmentId ? { ...a, submissions: filteredSubs } : a
    );

    const newState = { ...cur, version: (cur.version || 1) + 1, assessments: updatedAssessments };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch(
        `/api/assessments/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionKey)}`,
        { method: 'DELETE', headers: { 'Accept': 'application/json' } }
      );
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
          if (db) safeSetDoc(doc(db, 'system_state', 'master'), cleanData);
        }
        showToast('Hasil Koreksi Dihapus', json.message || 'Hasil koreksi siswa berhasil dihapus secara permanen.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal memproses penghapusan data koreksi.');
      }
    } catch (err: any) {
      console.error('[deleteSubmission Error]:', err);
      // Rollback state on failure
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Hasil Koreksi', err.message || 'Terjadi kendala pada server.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveStudent = async (student: Student): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    let updated = [...(cur.students || [])];
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isValidRealNisn = (val: string) => {
      if (!val) return false;
      const clean = val.trim();
      if (clean === '' || clean === '-' || clean === '0' || clean.length < 8) return false;
      if (/^0+$/.test(clean) || clean.startsWith('0087412')) return false;
      return /^\d{8,12}$/.test(clean);
    };

    const cleanNama = (student.nama || '').trim().toUpperCase();
    const cleanKelas = (student.kelas || 'X.1').trim();
    const cleanNisn = (student.nisn || '-').trim();

    const cleanStudent: Student = {
      ...student,
      id: student.id || `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      nama: cleanNama,
      nisn: cleanNisn,
      kelas: cleanKelas,
    };

    // Find existing student by ID, or by valid NISN, or by same Name + Class
    const idx = updated.findIndex(
      (s) =>
        (student.id && s.id === student.id) ||
        (isValidRealNisn(cleanNisn) && isValidRealNisn(s.nisn) && s.nisn.trim() === cleanNisn) ||
        (s.nama.trim().toUpperCase() === cleanNama && cleanCanonical(s.kelas) === cleanCanonical(cleanKelas))
    );

    if (idx >= 0) {
      cleanStudent.id = updated[idx].id; // Keep persistent ID
      cleanStudent.noUrut = cleanStudent.noUrut || updated[idx].noUrut;
      updated[idx] = cleanStudent;
    } else {
      cleanStudent.noUrut = cleanStudent.noUrut || updated.filter((s) => cleanCanonical(s.kelas) === cleanCanonical(cleanKelas)).length + 1;
      updated.push(cleanStudent);
    }

    // Auto-register missing class and recalculate class student counts
    const updatedClasses = [...(cur.classes || [])];
    const canonicalTargetClass = cleanCanonical(cleanKelas);
    const existingClassIdx = updatedClasses.findIndex(
      (c) => cleanCanonical(c.nama) === canonicalTargetClass
    );

    const studentCount = updated.filter((s) => cleanCanonical(s.kelas) === canonicalTargetClass).length;

    if (existingClassIdx >= 0) {
      updatedClasses[existingClassIdx] = {
        ...updatedClasses[existingClassIdx],
        totalSiswa: studentCount,
      };
    } else {
      updatedClasses.push({
        id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama: cleanKelas,
        fase: cleanKelas.startsWith('X.') ? 'Fase E' : 'Fase F',
        waliKelas: '-',
        totalSiswa: studentCount,
      });
    }

    const interimState = { ...cur, version: (cur.version || 1) + 1, students: updated, classes: updatedClasses };
    const newState = deduplicateAppState(interimState);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Siswa Tersimpan', `Data siswa ${cleanStudent.nama} berhasil disimpan dan tampil di sistem.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const saveStudentsBatch = async (newStudents: Student[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !newStudents || newStudents.length === 0) return false;
    const existing = [...(cur.students || [])];
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isValidRealNisn = (val: string) => {
      if (!val) return false;
      const clean = val.trim();
      if (clean === '' || clean === '-' || clean === '0' || clean.length < 8) return false;
      if (/^0+$/.test(clean) || clean.startsWith('0087412')) return false;
      return /^\d{8,12}$/.test(clean);
    };
    
    newStudents.forEach((ns, index) => {
      const cleanNama = (ns.nama || '').trim().toUpperCase();
      const cleanKelas = (ns.kelas || 'X.1').trim();
      const cleanNisn = (ns.nisn || '-').trim();

      const cleanNs: Student = {
        ...ns,
        nama: cleanNama,
        nisn: cleanNisn,
        kelas: cleanKelas,
      };

      const idx = existing.findIndex(
        (s) =>
          (cleanNs.id && s.id === cleanNs.id) ||
          (isValidRealNisn(cleanNisn) && isValidRealNisn(s.nisn) && s.nisn.trim() === cleanNisn) ||
          (s.nama.trim().toUpperCase() === cleanNama && cleanCanonical(s.kelas) === cleanCanonical(cleanKelas))
      );
      if (idx >= 0) {
        cleanNs.id = existing[idx].id;
        existing[idx] = { ...existing[idx], ...cleanNs };
      } else {
        existing.push({
          ...cleanNs,
          id: cleanNs.id || `std-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
          noUrut: cleanNs.noUrut || existing.filter((s) => cleanCanonical(s.kelas) === cleanCanonical(cleanKelas)).length + 1,
        });
      }
    });

    // Auto-register missing classes and sync student counts
    const updatedClasses = [...(cur.classes || [])];
    const uniqueClassNames = Array.from(new Set(existing.map((s) => s.kelas).filter(Boolean)));
    
    uniqueClassNames.forEach((clsName) => {
      const canonName = cleanCanonical(clsName);
      const classIdx = updatedClasses.findIndex((c) => cleanCanonical(c.nama) === canonName);
      const studentCount = existing.filter((s) => cleanCanonical(s.kelas) === canonName).length;
      if (classIdx >= 0) {
        updatedClasses[classIdx] = {
          ...updatedClasses[classIdx],
          totalSiswa: studentCount,
        };
      } else {
        updatedClasses.push({
          id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nama: clsName,
          fase: clsName.startsWith('X.') ? 'Fase E' : 'Fase F',
          waliKelas: '-',
          totalSiswa: studentCount,
        });
      }
    });

    const interimState = { ...cur, version: (cur.version || 1) + 1, students: existing, classes: updatedClasses };
    const newState = deduplicateAppState(interimState);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Data Siswa Tersimpan', `${newStudents.length} data siswa berhasil diverifikasi, tampil di tabel & disinkronkan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteStudent = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const updated = (cur.students || []).filter((s) => s.id !== id);
    const newDeletedIds = Array.from(new Set([...(cur.deletedIds || []), id]));
    const newState = { ...cur, version: (cur.version || 1) + 1, students: updated, deletedIds: newDeletedIds };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Siswa Dihapus', json.message || 'Data siswa berhasil dihapus.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus data siswa.');
      }
    } catch (err: any) {
      console.error('[deleteStudent Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Siswa', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const deleteStudentsBatch = async (ids: string[], callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !ids || ids.length === 0) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const idSet = new Set(ids);
    const updated = (cur.students || []).filter((s) => !idSet.has(s.id));
    const newDeletedIds = Array.from(new Set([...(cur.deletedIds || []), ...ids]));
    const newState = { ...cur, version: (cur.version || 1) + 1, students: updated, deletedIds: newDeletedIds };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch('/api/students/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Siswa Dihapus', json.message || `${ids.length} data siswa berhasil dihapus.`, 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus data siswa batch.');
      }
    } catch (err: any) {
      console.error('[deleteStudentsBatch Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Batch', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveClass = async (cls: ClassItem): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !cls || !cls.nama || !cls.nama.trim()) return false;
    
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const canonicalName = cleanCanonical(cls.nama);
    const cleanNama = cls.nama.trim();

    // Always calculate real enrolled student count
    const realCount = (cur.students || []).filter((s) => cleanCanonical(s.kelas) === canonicalName).length;
    const cleanClass: ClassItem = {
      ...cls,
      nama: cleanNama,
      totalSiswa: realCount,
    };

    let updated = [...(cur.classes || [])];
    const idx = updated.findIndex((c) => c.id === cleanClass.id || cleanCanonical(c.nama) === canonicalName);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...cleanClass, id: updated[idx].id };
    } else {
      cleanClass.id = cleanClass.id || `cls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      updated.push(cleanClass);
    }
    const newState = { ...cur, version: (cur.version || 1) + 1, classes: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Kelas Tersimpan', `Data kelas ${cleanClass.nama} berhasil disimpan dan tampil di sistem.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteClass = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const targetClass = (cur.classes || []).find((c) => c.id === id);
    const updatedClasses = (cur.classes || []).filter((c) => c.id !== id);

    // Cascade delete: Purge any students registered to this deleted class to prevent orphaned data
    let updatedStudents = cur.students || [];
    if (targetClass) {
      updatedStudents = updatedStudents.filter((s) => s.kelas !== targetClass.nama);
    }

    const newDeletedIds = Array.from(
      new Set([
        ...(cur.deletedIds || []),
        id,
        ...(targetClass ? [targetClass.nama, targetClass.nama.toLowerCase().replace(/[^a-z0-9]/g, '')] : []),
      ])
    );

    const newState = {
      ...cur,
      version: (cur.version || 1) + 1,
      classes: updatedClasses,
      students: updatedStudents,
      deletedIds: newDeletedIds,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Kelas Dihapus', json.message || 'Data kelas berhasil dihapus.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Gagal menghapus kelas di server.');
      }
    } catch (err: any) {
      console.error('[deleteClass Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Kelas', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveSubject = async (sbj: SubjectItem): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !sbj || !sbj.nama || !sbj.nama.trim()) return false;

    // Check if subject was renamed from a previous name
    let oldName: string | null = null;
    let updatedSubjects = [...(cur.subjects || [])];
    const cleanNama = sbj.nama.trim();

    const idx = updatedSubjects.findIndex((s) => s.id === sbj.id);
    if (idx >= 0) {
      const existing = updatedSubjects[idx];
      if (existing.nama && existing.nama.trim().toLowerCase() !== cleanNama.toLowerCase()) {
        oldName = existing.nama.trim();
      }
      updatedSubjects[idx] = {
        ...existing,
        ...sbj,
        nama: cleanNama,
        id: existing.id || sbj.id,
      };
    } else {
      const nameMatchIdx = updatedSubjects.findIndex((s) => s.nama.trim().toLowerCase() === cleanNama.toLowerCase());
      if (nameMatchIdx >= 0) {
        updatedSubjects[nameMatchIdx] = {
          ...updatedSubjects[nameMatchIdx],
          ...sbj,
          nama: cleanNama,
        };
      } else {
        const newId = sbj.id || `sbj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        updatedSubjects.push({
          ...sbj,
          id: newId,
          nama: cleanNama,
        });
      }
    }

    const renameMap: Record<string, string> = {};
    if (oldName) {
      renameMap[oldName] = cleanNama;
      renameMap[oldName.toLowerCase()] = cleanNama;
    }

    // Two-way cascading sync: Update all teachers' mataPelajaran & assessments with new official name
    const interimState: AppState = {
      ...cur,
      subjects: updatedSubjects,
    };
    const cleanState = normalizeStateSubjects(interimState, renameMap);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    // Keep currentUser synchronized if their subject was renamed
    if (currentUser) {
      const updatedCurUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (updatedCurUser) {
        setCurrentUserState(updatedCurUser);
        sessionStorage.setItem('smantri_user_id', updatedCurUser.id);
        safeSetItem('smantri_user_id', updatedCurUser.id);
      }
    }

    showToast(
      'Mata Pelajaran Tersimpan',
      oldName
        ? `Mapel "${oldName}" berhasil diubah menjadi "${cleanNama}", dan data seluruh akun guru telah otomatis diperbarui.`
        : `Mapel ${cleanNama} berhasil disimpan.`,
      'success'
    );
    syncStateToServer(newState);
    return true;
  };

  const deleteSubject = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const target = (cur.subjects || []).find((s) => s.id === id);
    const updatedSubjects = (cur.subjects || []).filter((s) => s.id !== id);

    // Clean up deleted subject from teachers' assigned subjects
    let updatedTeachers = cur.teachers || [];
    if (target) {
      const deletedNameLower = target.nama.trim().toLowerCase();
      updatedTeachers = updatedTeachers.map((t) => ({
        ...t,
        mataPelajaran: (t.mataPelajaran || []).filter((m) => m.trim().toLowerCase() !== deletedNameLower),
      }));
    }

    const newDeletedIds = Array.from(
      new Set([
        ...(cur.deletedIds || []),
        id,
        ...(target ? [target.nama, target.nama.trim().toLowerCase()] : []),
      ])
    );

    const interimState: AppState = {
      ...cur,
      subjects: updatedSubjects,
      teachers: updatedTeachers,
      deletedIds: newDeletedIds,
    };
    const cleanState = normalizeStateSubjects(interimState);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    if (currentUser) {
      const updatedCurUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (updatedCurUser) {
        setCurrentUserState(updatedCurUser);
        sessionStorage.setItem('smantri_user_id', updatedCurUser.id);
        safeSetItem('smantri_user_id', updatedCurUser.id);
      }
    }

    try {
      const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          cleanData.deletedIds = Array.from(new Set([...newDeletedIds, ...(cleanData.deletedIds || [])]));
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
        }
        showToast('Mata Pelajaran Dihapus', json.message || 'Data mapel & referensi di akun guru berhasil dibersihkan.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Gagal menghapus mata pelajaran di server.');
      }
    } catch (err: any) {
      console.error('[deleteSubject Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Mapel', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveSubjectsBatch = async (subjectsToSave: SubjectItem[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !subjectsToSave || subjectsToSave.length === 0) return false;

    const renameMap: Record<string, string> = {};
    const existingList = [...(cur.subjects || [])];

    subjectsToSave.forEach((newSbj, index) => {
      if (!newSbj || !newSbj.nama || !newSbj.nama.trim()) return;
      const cleanNama = newSbj.nama.trim();

      const idx = existingList.findIndex(
        (s) =>
          (s.id && s.id === newSbj.id) ||
          s.nama.trim().toLowerCase() === cleanNama.toLowerCase()
      );

      if (idx >= 0) {
        const existing = existingList[idx];
        if (existing.nama && existing.nama.trim().toLowerCase() !== cleanNama.toLowerCase()) {
          renameMap[existing.nama.trim()] = cleanNama;
        }
        existingList[idx] = {
          ...existing,
          ...newSbj,
          id: existing.id || newSbj.id,
          nama: cleanNama,
          kode: newSbj.kode || existing.kode,
          guruPengampu: newSbj.guruPengampu && newSbj.guruPengampu.length > 0 ? newSbj.guruPengampu : existing.guruPengampu,
          guruAssignments: newSbj.guruAssignments && newSbj.guruAssignments.length > 0 ? newSbj.guruAssignments : existing.guruAssignments,
          kelasAjar: newSbj.kelasAjar && newSbj.kelasAjar.length > 0 ? newSbj.kelasAjar : existing.kelasAjar,
        };
      } else {
        const newId = newSbj.id || `sbj-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
        existingList.push({
          ...newSbj,
          id: newId,
          nama: cleanNama,
        });
      }
    });

    const interimState: AppState = {
      ...cur,
      subjects: existingList,
    };
    const cleanState = normalizeStateSubjects(interimState, renameMap);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    if (currentUser) {
      const updatedCurUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (updatedCurUser) {
        setCurrentUserState(updatedCurUser);
        sessionStorage.setItem('smantri_user_id', updatedCurUser.id);
        safeSetItem('smantri_user_id', updatedCurUser.id);
      }
    }

    showToast(
      'Mata Pelajaran Berhasil Disimpan',
      `${subjectsToSave.length} mata pelajaran telah tersimpan ke sistem database.`,
      'success'
    );
    syncStateToServer(newState);
    return true;
  };

  const replaceSubjectsAll = async (newSubjects: SubjectItem[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const defaultKktp = 75;
    const cleanList: SubjectItem[] = newSubjects.map((s, idx) => {
      const cleanNama = s.nama.trim();
      const base = typeof s.kktp === 'number' && s.kktp > 0 ? s.kktp : defaultKktp;
      const kX = typeof s.kktpX === 'number' && s.kktpX > 0 ? s.kktpX : base;
      const kXI = typeof s.kktpXI === 'number' && s.kktpXI > 0 ? s.kktpXI : base;
      const kXII = typeof s.kktpXII === 'number' && s.kktpXII > 0 ? s.kktpXII : base;

      const guruPengampu = Array.isArray(s.guruPengampu)
        ? Array.from(new Set(s.guruPengampu.filter((g) => g && typeof g === 'string' && g.trim().length > 0)))
        : [];

      const guruAssignments = Array.isArray(s.guruAssignments) && s.guruAssignments.length > 0
        ? s.guruAssignments
        : guruPengampu.map((gName) => ({
            teacherId: gName,
            teacherName: gName,
            kktp: base,
            kktpX: kX,
            kktpXI: kXI,
            kktpXII: kXII,
            kelasAjar: s.kelasAjar || (cur.classes || []).map((c) => c.nama),
          }));

      return {
        ...s,
        id: s.id || `sbj-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        kode: s.kode ? s.kode.trim() : `MP-${idx + 1}`,
        nama: cleanNama,
        kktp: base,
        kktpX: kX,
        kktpXI: kXI,
        kktpXII: kXII,
        guruPengampu,
        guruAssignments,
        kelasAjar: Array.isArray(s.kelasAjar) ? s.kelasAjar : (cur.classes || []).map((c) => c.nama),
      };
    });

    const interimState: AppState = {
      ...cur,
      subjects: cleanList,
    };
    const cleanState = normalizeStateSubjects(interimState);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    try {
      await fetch('/api/subjects/replace-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: cleanList }),
      });
    } catch (e) {}

    await syncStateToServer(newState);

    showToast(
      'Mata Pelajaran Diperbarui Total',
      `Berhasil memperbarui ${cleanList.length} mata pelajaran dari file Excel.`,
      'success'
    );
    return true;
  };

  const importSubjectsComplete = async (
    subjectsToImport: SubjectItem[],
    mode: 'replace' | 'merge',
    autoRegisterTeachers: boolean = true,
    autoRegisterClasses: boolean = true,
    newTeachersList: string[] = [],
    newClassesList: string[] = []
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !subjectsToImport || subjectsToImport.length === 0) return false;

    const defaultKktp = 75;

    // 1. Prepare classes atomically
    let updatedClasses = [...(cur.classes || [])];
    if (autoRegisterClasses && Array.isArray(newClassesList) && newClassesList.length > 0) {
      newClassesList.forEach((clsName) => {
        if (!updatedClasses.some((c) => c.nama.toLowerCase().trim() === clsName.toLowerCase().trim())) {
          updatedClasses.push({
            id: `cls-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            nama: clsName,
            fase: clsName.startsWith('X.') ? 'Fase E' : 'Fase F',
            waliKelas: '-',
            totalSiswa: (cur.students || []).filter((st) => st.kelas === clsName).length,
          });
        }
      });
    }

    // 2. Prepare teachers atomically
    let updatedTeachers = [...(cur.teachers || [])];
    if (autoRegisterTeachers && Array.isArray(newTeachersList) && newTeachersList.length > 0) {
      newTeachersList.forEach((tName) => {
        if (!updatedTeachers.some((t) => t.nama.toLowerCase().trim() === tName.toLowerCase().trim())) {
          const cleanUser =
            tName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .substring(0, 16) || `guru_${Date.now()}`;
          const taughtSubjects = subjectsToImport
            .filter((s) => s.guruPengampu?.includes(tName))
            .map((s) => s.nama);

          updatedTeachers.push({
            id: `tch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            nama: tName,
            username: cleanUser,
            password: '123',
            role: 'guru',
            status: 'offline',
            mataPelajaran: taughtSubjects,
          });
        }
      });
    }

    // 3. Prepare clean subjects
    const cleanList: SubjectItem[] = subjectsToImport.map((s, idx) => {
      const cleanNama = s.nama.trim();
      const base = typeof s.kktp === 'number' && s.kktp > 0 ? s.kktp : defaultKktp;
      const kX = typeof s.kktpX === 'number' && s.kktpX > 0 ? s.kktpX : base;
      const kXI = typeof s.kktpXI === 'number' && s.kktpXI > 0 ? s.kktpXI : base;
      const kXII = typeof s.kktpXII === 'number' && s.kktpXII > 0 ? s.kktpXII : base;

      const guruPengampu = Array.isArray(s.guruPengampu)
        ? Array.from(new Set(s.guruPengampu.filter((g) => typeof g === 'string' && g.trim().length > 0)))
        : [];

      const guruAssignments = Array.isArray(s.guruAssignments) && s.guruAssignments.length > 0
        ? s.guruAssignments
        : guruPengampu.map((gName) => ({
            teacherId: gName,
            teacherName: gName,
            kktp: base,
            kktpX: kX,
            kktpXI: kXI,
            kktpXII: kXII,
            kelasAjar: s.kelasAjar && s.kelasAjar.length > 0 ? s.kelasAjar : updatedClasses.map((c) => c.nama),
          }));

      return {
        ...s,
        id: s.id || `sbj-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        kode: s.kode ? s.kode.trim() : `MP-${idx + 1}`,
        nama: cleanNama,
        kktp: base,
        kktpX: kX,
        kktpXI: kXI,
        kktpXII: kXII,
        guruPengampu,
        guruAssignments,
        kelasAjar: Array.isArray(s.kelasAjar) ? s.kelasAjar : updatedClasses.map((c) => c.nama),
      };
    });

    let finalSubjects: SubjectItem[] = [];
    if (mode === 'replace') {
      finalSubjects = cleanList;
    } else {
      const existing = [...(cur.subjects || [])];
      cleanList.forEach((newSbj) => {
        const idx = existing.findIndex(
          (s) =>
            (s.id && s.id === newSbj.id) ||
            s.nama.trim().toLowerCase() === newSbj.nama.trim().toLowerCase()
        );
        if (idx >= 0) {
          existing[idx] = {
            ...existing[idx],
            ...newSbj,
            guruPengampu: Array.from(new Set([...(existing[idx].guruPengampu || []), ...(newSbj.guruPengampu || [])])),
            kelasAjar: Array.from(new Set([...(existing[idx].kelasAjar || []), ...(newSbj.kelasAjar || [])])),
          };
        } else {
          existing.push(newSbj);
        }
      });
      finalSubjects = existing;
    }

    // Update teachers' mataPelajaran for newly assigned subjects
    updatedTeachers = updatedTeachers.map((t) => {
      const additional = finalSubjects
        .filter((s) => (s.guruPengampu || []).includes(t.nama))
        .map((s) => s.nama);
      const combined = Array.from(new Set([...(t.mataPelajaran || []), ...additional]));
      return {
        ...t,
        mataPelajaran: combined,
      };
    });

    const interimState: AppState = {
      ...cur,
      classes: updatedClasses,
      teachers: updatedTeachers,
      subjects: finalSubjects,
    };
    const cleanState = normalizeStateSubjects(interimState);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    if (currentUser) {
      const updatedCurUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (updatedCurUser) {
        setCurrentUserState(updatedCurUser);
        sessionStorage.setItem('smantri_user_id', updatedCurUser.id);
        safeSetItem('smantri_user_id', updatedCurUser.id);
      }
    }

    if (mode === 'replace') {
      try {
        await fetch('/api/subjects/replace-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjects: cleanState.subjects }),
        });
      } catch (e) {}
    }

    showToast(
      mode === 'replace' ? 'Mata Pelajaran Diperbarui Total' : 'Mata Pelajaran Ditambahkan',
      `${cleanList.length} mata pelajaran dari file Excel berhasil diterapkan permanen ke sistem.`,
      'success'
    );
    syncStateToServer(newState);
    return true;
  };

  const deleteSubjectsBatch = async (ids: string[], callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !ids || ids.length === 0) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const idSet = new Set(ids);
    const targetNames = new Set((cur.subjects || []).filter((s) => idSet.has(s.id)).map((s) => s.nama.trim().toLowerCase()));
    const updatedSubjects = (cur.subjects || []).filter((s) => !idSet.has(s.id));

    const updatedTeachers = (cur.teachers || []).map((t) => ({
      ...t,
      mataPelajaran: (t.mataPelajaran || []).filter((m) => !targetNames.has(m.trim().toLowerCase())),
    }));

    const interimState: AppState = {
      ...cur,
      subjects: updatedSubjects,
      teachers: updatedTeachers,
    };
    const cleanState = normalizeStateSubjects(interimState);

    const newState: AppState = {
      ...cleanState,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    if (currentUser) {
      const updatedCurUser = newState.teachers.find((t) => t.id === currentUser.id);
      if (updatedCurUser) {
        setCurrentUserState(updatedCurUser);
        sessionStorage.setItem('smantri_user_id', updatedCurUser.id);
        safeSetItem('smantri_user_id', updatedCurUser.id);
      }
    }

    try {
      const res = await fetch('/api/subjects/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
          if (db) safeSetDoc(doc(db, 'system_state', 'master'), cleanData);
        }
        showToast('Mapel Dihapus', json.message || `${ids.length} mata pelajaran berhasil dihapus.`, 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus batch mata pelajaran.');
      }
    } catch (err: any) {
      console.error('[deleteSubjectsBatch Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus Batch', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const saveFeedback = async (feedback: TeacherFeedback): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentFeedbacks = cur.feedbacks || [];
    let updated = [...currentFeedbacks];
    const idx = updated.findIndex((f) => f.id === feedback.id);
    if (idx >= 0) {
      updated[idx] = feedback;
    } else {
      feedback.id = feedback.id || `fb-${Date.now()}`;
      feedback.createdAt = feedback.createdAt || new Date().toISOString();
      updated.unshift(feedback);
    }
    const feedbackNotif: AppNotification = {
      id: `notif-fb-${feedback.id || Date.now()}-${Date.now()}`,
      recipientId: 'ROLE_ADMIN',
      recipientRole: 'admin',
      category: 'feedback_baru',
      title: 'Masukan / Feedback Baru Masuk',
      message: `${feedback.teacherName} (${feedback.userRole || 'Guru'}) mengirimkan ${feedback.kategori}: "${feedback.judul}" (${feedback.rating || 5} Bintang).`,
      targetModule: 'manajemen-data',
      targetView: 'feedback-center',
      targetId: feedback.id,
      read: false,
      createdAt: new Date().toISOString(),
      priority: 'normal',
      senderName: feedback.teacherName,
      senderRole: feedback.userRole || 'Guru',
    };
    const currentNotifs = cur.notifications || [];
    const updatedNotifs = [feedbackNotif, ...currentNotifs].slice(0, 150);

    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated, notifications: updatedNotifs };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Umpan Balik Terkirim!', 'Terima kasih, saran & masukan Anda telah terkirim dan langsung termonitor oleh Administrator.', 'success');
    syncStateToServer(newState);
    return true;
  };

  const updateFeedbackStatus = async (
    id: string,
    status: 'Baru' | 'Ditinjau' | 'Ditindaklanjuti',
    adminNote?: string
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentFeedbacks = cur.feedbacks || [];
    const updated = currentFeedbacks.map((f) => {
      if (f.id === id) {
        return {
          ...f,
          status,
          ...(adminNote !== undefined ? { adminNote } : {}),
        };
      }
      return f;
    });
    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Status Diperbarui', `Status feedback berhasil diubah menjadi "${status}".`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteFeedback = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;

    // 1. Optimistic UI update
    const currentFeedbacks = cur.feedbacks || [];
    const updated = currentFeedbacks.filter((f) => f.id !== id);
    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch(`/api/feedbacks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (json.data) {
          const cleanData = normalizeStateSubjects(json.data as AppState);
          stateRef.current = cleanData;
          setState(cleanData);
          persistLocalState(cleanData);
          if (db) safeSetDoc(doc(db, 'system_state', 'master'), cleanData);
        }
        showToast('Umpan Balik Dihapus', json.message || 'Data masukan guru berhasil dihapus.', 'info');
        if (callback) callback(true);
        return true;
      } else {
        throw new Error(json?.message || 'Server gagal menghapus feedback.');
      }
    } catch (err: any) {
      console.error('[deleteFeedback Error]:', err);
      stateRef.current = previousState;
      setState(previousState);
      persistLocalState(previousState);
      showToast('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error');
      if (callback) callback(false);
      return false;
    }
  };

  const clearAllFeedbacks = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const previousState = cur;
    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: [] };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    try {
      const res = await fetch('/api/feedbacks', { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json && json.success) {
        if (db) safeSetDoc(doc(db, 'system_state', 'master'), newState);
        showToast('Umpan Balik Direset', 'Seluruh data umpan balik guru berhasil direset ke semula.', 'success');
        return true;
      }
      throw new Error(json?.message || 'Server gagal mereset feedback.');
    } catch (err: any) {
      console.error('[clearAllFeedbacks Error]:', err);
      if (db) safeSetDoc(doc(db, 'system_state', 'master'), newState);
      showToast('Umpan Balik Direset', 'Data umpan balik lokal & cloud berhasil dibersihkan ke semula.', 'success');
      return true;
    }
  };

  const addNotification = async (
    notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const notif: AppNotification = {
      ...notifData,
      id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const currentNotifs = cur.notifications || [];
    const isDup = currentNotifs.some(
      (n) =>
        n.recipientId === notif.recipientId &&
        n.category === notif.category &&
        n.targetId === notif.targetId &&
        Date.now() - new Date(n.createdAt).getTime() < 2 * 60 * 1000
    );
    if (isDup) return true;

    const updated = [notif, ...currentNotifs].slice(0, 150);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const markNotificationAsRead = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.map((n) =>
      n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
    );

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const markAllNotificationsAsRead = async (userId: string, role?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.map((n) => {
      const isForUser =
        n.recipientId === userId ||
        (role === 'admin' && (n.recipientId === 'ROLE_ADMIN' || n.recipientRole === 'admin')) ||
        (role === 'operator' && (n.recipientId === 'ROLE_OPERATOR' || n.recipientRole === 'operator')) ||
        ((role === 'guru' || role === 'kesiswaan') &&
          (n.recipientId === 'ALL_TEACHERS' || n.recipientRole === 'guru'));

      if (isForUser && !n.read) {
        return { ...n, read: true, readAt: new Date().toISOString() };
      }
      return n;
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.filter((n) => n.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: [],
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const toggleFeedbackBestTestimonial = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentFeedbacks = cur.feedbacks || [];
    const updated = currentFeedbacks.map((f) => {
      if (f.id === id) {
        return { ...f, isBestTestimonial: !f.isBestTestimonial };
      }
      return f;
    });

    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncStateToServer(newState);
    showToast('Testimoni Diperbarui', 'Status testimoni unggulan berhasil diubah.', 'info');
    return true;
  };

  const saveBeritaAcara = async (item: BeritaAcaraItem): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.beritaAcaraList || [];
    let updated = [...currentList];
    const idx = updated.findIndex((b) => b.id === item.id);
    if (idx >= 0) {
      updated[idx] = item;
    } else {
      item.id = item.id || `ba-${Date.now()}`;
      item.uploadedAt = item.uploadedAt || new Date().toISOString();
      updated.unshift(item);
    }
    const newState = { ...cur, version: (cur.version || 1) + 1, beritaAcaraList: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast(
      'Berita Acara Tersimpan!',
      `Berita Acara ${item.assessmentType} ${item.mataPelajaran} (${item.kelasRuang}) berhasil disimpan.`,
      'success'
    );
    syncStateToServer(newState);
    return true;
  };

  const deleteBeritaAcara = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.beritaAcaraList || [];
    const updated = currentList.filter((b) => b.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState = { ...cur, version: (cur.version || 1) + 1, beritaAcaraList: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    await syncStateToServer(newState);
    showToast('Berita Acara Dihapus', 'Data Berita Acara berhasil dihapus.', 'info');
    if (callback) callback(true);
    return true;
  };

  const verifyBeritaAcaraKepsek = async (id: string, verified: boolean, catatan?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.beritaAcaraList || [];
    const updated = currentList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          verifiedByKepsek: verified,
          catatanKepsek: catatan || item.catatanKepsek || '',
          verifiedAtKepsek: new Date().toISOString(),
          verifiedStatus: verified ? ('Verified' as const) : ('Pending' as const),
        };
      }
      return item;
    });
    const newState = { ...cur, version: (cur.version || 1) + 1, beritaAcaraList: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Supervisi Disimpan', verified ? 'Berita Acara diverifikasi oleh Kepala Sekolah.' : 'Catatan supervisi disimpan.', 'success');
    syncStateToServer(newState);
    return true;
  };

  const saveSupervisiCatatan = async (item: SupervisiCatatan): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const list = cur.supervisiCatatanList || [];
    const existingIdx = list.findIndex((s) => s.id === item.id);
    let updated: SupervisiCatatan[];
    if (existingIdx >= 0) {
      updated = list.map((s, idx) => (idx === existingIdx ? item : s));
    } else {
      updated = [item, ...list];
    }
    const newState = { ...cur, version: (cur.version || 1) + 1, supervisiCatatanList: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Catatan Disimpan', 'Catatan supervisi Kepala Sekolah berhasil diperbarui.', 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteSupervisiCatatan = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const list = cur.supervisiCatatanList || [];
    const updated = list.filter((s) => s.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState = { ...cur, version: (cur.version || 1) + 1, supervisiCatatanList: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Catatan Dihapus', 'Catatan supervisi berhasil dihapus.', 'info');
    syncStateToServer(newState);
    return true;
  };

  const saveCalendarEvent = async (event: CalendarEvent): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentEvents = cur.calendarEvents && cur.calendarEvents.length > 0 ? [...cur.calendarEvents] : [...DEFAULT_CALENDAR_EVENTS];
    const idx = currentEvents.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      currentEvents[idx] = { ...event, updatedAt: new Date().toISOString() };
    } else {
      const newEv = {
        ...event,
        id: event.id || `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: event.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentEvents.unshift(newEv);
    }
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      calendarEvents: currentEvents,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Agenda Kalender Disimpan', `Agenda "${event.title}" berhasil diperbarui.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteCalendarEvent = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentEvents = cur.calendarEvents && cur.calendarEvents.length > 0 ? cur.calendarEvents : DEFAULT_CALENDAR_EVENTS;
    const updated = currentEvents.filter((e) => e.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      calendarEvents: updated,
      deletedIds: Array.from(delSet),
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Agenda Dihapus', 'Agenda kalender berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const toggleCalendarEventComplete = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentEvents = cur.calendarEvents && cur.calendarEvents.length > 0 ? [...cur.calendarEvents] : [...DEFAULT_CALENDAR_EVENTS];
    const idx = currentEvents.findIndex((e) => e.id === id);
    if (idx < 0) return false;
    const isNow = !currentEvents[idx].isCompleted;
    currentEvents[idx] = {
      ...currentEvents[idx],
      isCompleted: isNow,
      updatedAt: new Date().toISOString(),
    };
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      calendarEvents: currentEvents,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast(
      isNow ? 'Agenda Selesai' : 'Status Aktif',
      `"${currentEvents[idx].title}" ${isNow ? 'telah ditandai selesai.' : 'diaktifkan kembali.'}`,
      'info'
    );
    syncStateToServer(newState);
    return true;
  };

  const saveCalendarEventsBatch = async (eventsToSave: CalendarEvent[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentEvents = cur.calendarEvents && cur.calendarEvents.length > 0 ? [...cur.calendarEvents] : [...DEFAULT_CALENDAR_EVENTS];
    eventsToSave.forEach((ev) => {
      const idx = currentEvents.findIndex((e) => e.id === ev.id);
      if (idx >= 0) {
        currentEvents[idx] = { ...ev, updatedAt: new Date().toISOString() };
      } else {
        currentEvents.push({
          ...ev,
          id: ev.id || `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: ev.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      calendarEvents: currentEvents,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Kalender Diperbarui', `${eventsToSave.length} agenda berhasil disinkronkan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const saveAnnouncement = async (announcement: Announcement): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.announcements && cur.announcements.length > 0 ? [...cur.announcements] : [...DEFAULT_ANNOUNCEMENTS];
    const idx = currentList.findIndex((a) => a.id === announcement.id);
    if (idx >= 0) {
      currentList[idx] = { ...announcement, updatedAt: new Date().toISOString() };
    } else {
      const newAnc: Announcement = {
        ...announcement,
        id: announcement.id || `anc-${Date.now()}`,
        createdAt: announcement.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentList.unshift(newAnc);
    }
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      announcements: currentList,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncStateToServer(newState);
    return true;
  };

  const deleteAnnouncement = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.announcements && cur.announcements.length > 0 ? cur.announcements : DEFAULT_ANNOUNCEMENTS;
    const updated = currentList.filter((a) => a.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      announcements: updated,
      deletedIds: Array.from(delSet),
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const toggleAnnouncementPin = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.announcements && cur.announcements.length > 0 ? [...cur.announcements] : [...DEFAULT_ANNOUNCEMENTS];
    const idx = currentList.findIndex((a) => a.id === id);
    if (idx < 0) return false;
    const nextPin = !currentList[idx].isPin;
    currentList[idx] = {
      ...currentList[idx],
      isPin: nextPin,
      updatedAt: new Date().toISOString(),
    };
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      announcements: currentList,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast(
      nextPin ? 'Disematkan' : 'Sematan Dilepas',
      `Pengumuman "${currentList[idx].judul}" ${nextPin ? 'disematkan di bagian atas dashboard.' : 'dilepas dari sematan.'}`,
      'info'
    );
    syncStateToServer(newState);
    return true;
  };

  const toggleAnnouncementActive = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.announcements && cur.announcements.length > 0 ? [...cur.announcements] : [...DEFAULT_ANNOUNCEMENTS];
    const idx = currentList.findIndex((a) => a.id === id);
    if (idx < 0) return false;
    const nextActive = !currentList[idx].isActive;
    currentList[idx] = {
      ...currentList[idx],
      isActive: nextActive,
      updatedAt: new Date().toISOString(),
    };
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      announcements: currentList,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast(
      nextActive ? 'Disiarkan' : 'Disembunyikan',
      `Pengumuman "${currentList[idx].judul}" ${nextActive ? 'sekarang aktif disiarkan.' : 'disembunyikan dari dashboard.'}`,
      'info'
    );
    syncStateToServer(newState);
    return true;
  };

  const saveAIStudioPrompt = async (prompt: AIStudioPromptItem): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.aiStudioPrompts && cur.aiStudioPrompts.length > 0 ? [...cur.aiStudioPrompts] : [...DEFAULT_AISTUDIO_PROMPTS];
    const idx = currentList.findIndex((p) => p.id === prompt.id);
    if (idx >= 0) {
      currentList[idx] = { ...prompt, updatedAt: new Date().toISOString() };
    } else {
      const newPrompt: AIStudioPromptItem = {
        ...prompt,
        id: prompt.id || `prompt-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      currentList.unshift(newPrompt);
    }
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      aiStudioPrompts: currentList,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Prompt AI Studio Disimpan!', `Konfigurasi System Prompt "${prompt.nama}" berhasil diperbarui.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteAIStudioPrompt = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.aiStudioPrompts && cur.aiStudioPrompts.length > 0 ? cur.aiStudioPrompts : DEFAULT_AISTUDIO_PROMPTS;
    const updated = currentList.filter((p) => p.id !== id);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      aiStudioPrompts: updated,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Prompt Dihapus', 'Prompt sistem AI Studio berhasil dihapus.', 'info');
    syncStateToServer(newState);
    return true;
  };

  const resetAIStudioPromptsToDefault = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      aiStudioPrompts: DEFAULT_AISTUDIO_PROMPTS,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Prompt Direset', 'Seluruh System Instructions AI Studio direset ke konfigurasi awal.', 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBeritaAcaraBatch = async (ids: string[], callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const idSet = new Set(ids);
    const currentList = cur.beritaAcaraList || [];
    const updated = currentList.filter((b) => !idSet.has(b.id));
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    ids.forEach((id) => delSet.add(id));
    const newState = { ...cur, version: (cur.version || 1) + 1, beritaAcaraList: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    await syncStateToServer(newState);
    showToast('Berita Acara Dihapus', `${ids.length} data Berita Acara berhasil dihapus.`, 'info');
    if (callback) callback(true);
    return true;
  };

  const resetAllData = async (): Promise<boolean> => {
    try {
      setLoading(true);

      // Purge Firestore Live Proctor logs
      if (db) {
        try {
          const logsRef = collection(db, 'exam_activity_logs');
          const snap = await getDocs(logsRef);
          const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        } catch (e) {
          console.warn('[AppContext] Firestore proctor purge skipped:', e);
        }
      }

      // Purge local browser storage CBT drafts
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('simantri_cbt_') || k.startsWith('smantri_cbt_'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch (e) {}
      }

      const res = await fetch('/api/state/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        stateRef.current = json.data;
        setState(json.data);
        persistLocalState(json.data);
        syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
        showToast('Reset Selesai', 'Seluruh data sistem dan sesi live proktor berhasil dikosongkan ke 0.', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Reset failed:', err);
      showToast('Gagal Reset', 'Terjadi kesalahan saat mengosongkan data.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetCorrectionData = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    try {
      setLoading(true);
      
      // Clear submissions for all assessments to reset diagram bars, lines, and student grades to 0
      const updatedAssessments = (cur.assessments || []).map((a) => ({
        ...a,
        submissions: [],
      }));

      const newState = {
        ...cur,
        version: (cur.version || 1) + 1,
        assessments: updatedAssessments,
      };

      stateRef.current = newState;
      setState(newState);
      persistLocalState(newState);
      await syncStateToServer(newState);
      showToast(
        'Koreksi & Grafik Direset!', 
        'Semua nilai siswa dan diagram progress berhasil dikosongkan ke 0. Anda siap memulai penilaian dari awal!', 
        'success'
      );
      return true;
    } catch (err) {
      console.error('Failed to reset submissions:', err);
      showToast('Gagal Reset', 'Terjadi kesalahan saat mengosongkan hasil koreksi.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cleanSystemGarbage = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/cleanup', { method: 'POST' });
      const json = await res.json();
      if (json && json.success && json.data) {
        stateRef.current = json.data;
        setState(json.data);
        persistLocalState(json.data);
        safeRemoveItem('smantri_pending_sync');
        safeRemoveItem('smantri_firestore_quota_exceeded');
        safeRemoveItem('smantri_firestore_quota_time');
        safeRemoveItem('smantri_last_sync_error');
        webrtcSession.clearHistory();
        syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
        showToast(
          'Pembersihan Selesai',
          'Seluruh sampah sistem bekas, residu error, dan cache berhasil dihapus permanen. Sistem kini bersih dan normal.',
          'success'
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('System cleanup failed:', err);
      showToast('Gagal Membersihkan', 'Terjadi kesalahan saat membersihkan sampah sistem.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacherOnlineStatus = async (teacherId: string): Promise<'online' | 'offline'> => {
    const cur = stateRef.current;
    if (!cur) return 'offline';
    const currentTeacher = (cur.teachers || []).find((t) => t.id === teacherId);
    const nextStatus: 'online' | 'offline' = currentTeacher?.status === 'online' ? 'offline' : 'online';
    const nowIso = new Date().toISOString();
    let targetTch: any = null;

    const updated = (cur.teachers || []).map((t) => {
      if (t.id === teacherId) {
        const effectiveMod = t.activeModule || 'sumatif';
        const effectiveAct = nextStatus === 'online'
          ? getActivityDescription(t.currentView || 'dashboard', t.activeAssessmentInfo, effectiveMod, t, cur)
          : undefined;

        const upd = {
          ...t,
          status: nextStatus,
          lastActive: nowIso,
          ...(nextStatus === 'offline'
            ? { activeModule: undefined, currentActivity: undefined }
            : { activeModule: effectiveMod, currentActivity: effectiveAct }),
        };
        targetTch = upd;
        return upd;
      }
      return t;
    });
    const newState = { ...cur, version: (cur.version || 1) + 1, teachers: updated };
    stateRef.current = newState;
    setState(newState);
    if (currentUser && currentUser.id === teacherId) {
      setCurrentUserState((prev) => (prev ? { ...prev, status: nextStatus, currentActivity: targetTch?.currentActivity } : prev));
    }
    persistLocalState(newState);

    syncChannelRef.current?.postMessage({
      type: 'TEACHER_PRESENCE_UPDATED',
      teacherId,
      status: nextStatus,
      timestamp: nowIso,
    });

    fetch('/api/teachers/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        status: nextStatus,
        activeModule: nextStatus === 'online' ? (targetTch?.activeModule || 'sumatif') : undefined,
        currentActivity: targetTch?.currentActivity,
      }),
    }).catch(() => {});

    await syncStateToServer(newState);
    return nextStatus;
  };

  const setTeachersStatusBatch = async (teacherIds: string[], targetStatus: 'online' | 'offline'): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !teacherIds || teacherIds.length === 0) return false;
    const targetSet = new Set(teacherIds);
    const nowIso = new Date().toISOString();

    const updated = (cur.teachers || []).map((t) => {
      if (targetSet.has(t.id)) {
        const effectiveMod = t.activeModule || 'sumatif';
        const effectiveAct = targetStatus === 'online'
          ? getActivityDescription(t.currentView || 'dashboard', t.activeAssessmentInfo, effectiveMod, t, cur)
          : undefined;

        return {
          ...t,
          status: targetStatus,
          lastActive: nowIso,
          ...(targetStatus === 'offline'
            ? { activeModule: undefined, currentActivity: undefined }
            : { activeModule: effectiveMod, currentActivity: effectiveAct }),
        };
      }
      return t;
    });
    const newState = { ...cur, version: (cur.version || 1) + 1, teachers: updated };
    stateRef.current = newState;
    setState(newState);
    if (currentUser && targetSet.has(currentUser.id)) {
      setCurrentUserState((prev) => (prev ? { ...prev, status: targetStatus } : prev));
    }
    persistLocalState(newState);

    teacherIds.forEach((id) => {
      syncChannelRef.current?.postMessage({
        type: 'TEACHER_PRESENCE_UPDATED',
        teacherId: id,
        status: targetStatus,
        timestamp: nowIso,
      });
      fetch('/api/teachers/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: id, status: targetStatus }),
      }).catch(() => {});
    });

    await syncStateToServer(newState);
    return true;
  };

  const simulateTeacherSession = async (
    teacherId: string,
    action: 'login' | 'login-sumatif' | 'switch_module' | 'switch-module' | 'logout',
    moduleParam?: string,
    customActivity?: string
  ): Promise<void> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.teachers)) return;
    const nowIso = new Date().toISOString();
    const targetTeacher = cur.teachers.find((t) => t.id === teacherId);
    if (!targetTeacher) return;

    let updatedTeachers = cur.teachers;
    if (action === 'login' || action === 'login-sumatif') {
      const teacherMapel = targetTeacher.mataPelajaran?.[0] || 'Umum';
      const targetAsm = (cur.assessments || []).find(
        (a) => a.guruId === teacherId || a.guruPengampu === targetTeacher.nama || a.mataPelajaran === teacherMapel
      );
      const asmInfo = targetAsm ? `${targetAsm.mataPelajaran} • Kelas ${targetAsm.kelas} (${targetAsm.jenis})` : undefined;
      const act = customActivity || `Sedang Mengoreksi Draf Jawaban & Nilai Siswa (${asmInfo || teacherMapel})`;
      const mod = (moduleParam as any) || 'sumatif';

      updatedTeachers = cur.teachers.map((t) => {
        if (t.id === teacherId) {
          return {
            ...t,
            status: 'online' as const,
            hasLoggedIn: true,
            lastLogin: nowIso,
            lastActive: nowIso,
            activeModule: mod,
            currentView: 'mass-grading',
            activeAssessmentId: targetAsm?.id,
            activeAssessmentInfo: asmInfo,
            currentActivity: act,
          };
        }
        return t;
      });

      syncChannelRef.current?.postMessage({
        type: 'TEACHER_LOGGED_IN',
        teacherId,
        status: 'online',
        module: mod,
        timestamp: nowIso,
      });

      fetch('/api/teachers/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          status: 'online',
          activeModule: mod,
          currentView: 'mass-grading',
          currentActivity: act,
          activeAssessmentId: targetAsm?.id,
          activeAssessmentInfo: asmInfo,
        }),
      }).catch(() => {});

      showToast(
        'Sesi Guru Terhubung Real-Time',
        `Akun "${targetTeacher.nama}" berhasil login dan terdeteksi aktif di Modul Asesmen & Draf.`,
        'success'
      );
    } else if (action === 'switch_module' || action === 'switch-module') {
      const nextMod = moduleParam || 'portal';
      updatedTeachers = cur.teachers.map((t) => {
        if (t.id === teacherId) {
          return {
            ...t,
            activeModule: nextMod,
            currentView: nextMod === 'portal' ? 'portal' : 'dashboard',
            lastActive: nowIso,
            currentActivity: `Beralih ke Modul ${nextMod.toUpperCase()}`,
          };
        }
        return t;
      });

      syncChannelRef.current?.postMessage({
        type: 'TEACHER_MODULE_CHANGED',
        teacherId,
        module: nextMod,
        timestamp: nowIso,
      });

      fetch('/api/teachers/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          status: 'online',
          activeModule: nextMod,
          currentView: nextMod === 'portal' ? 'portal' : 'dashboard',
          currentActivity: `Beralih ke Modul ${nextMod.toUpperCase()}`,
        }),
      }).catch(() => {});

      showToast(
        'Akun Guru Berpindah Modul',
        `Akun "${targetTeacher.nama}" berpindah ke Modul ${nextMod.toUpperCase()}. Akun otomatis keluar dari Monitor Real-Time Asesmen.`,
        'info'
      );
    } else if (action === 'logout') {
      updatedTeachers = cur.teachers.map((t) => {
        if (t.id === teacherId) {
          return {
            ...t,
            status: 'offline' as const,
            activeModule: undefined,
            currentView: undefined,
            currentActivity: undefined,
            lastActive: nowIso,
          };
        }
        return t;
      });

      syncChannelRef.current?.postMessage({
        type: 'TEACHER_LOGGED_OUT',
        teacherId,
        status: 'offline',
        timestamp: nowIso,
      });

      fetch('/api/teachers/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          status: 'offline',
        }),
      }).catch(() => {});

      showToast(
        'Akun Guru Logout',
        `Akun "${targetTeacher.nama}" telah logout. Sesi berakhir dan akun hilang dari monitor.`,
        'info'
      );
    }

    const newState = { ...cur, version: (cur.version || 1) + 1, teachers: updatedTeachers };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({
      type: 'SIMULATE_TEACHER_SESSION',
      teacherId,
      action,
      timestamp: nowIso,
    });
    await syncStateToServer(newState);
  };

  const saveBKProfile = async (profile: BKProfile): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkProfiles || [];
    let updated = [...currentList];
    const idx = updated.findIndex((p) => p.id === profile.id || (p.studentId && p.studentId === profile.studentId));
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        ...profile,
        updatedAt: profile.updatedAt || new Date().toISOString().split('T')[0],
      };
    } else {
      const newProf: BKProfile = {
        ...profile,
        id: profile.id || `bk-prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: profile.updatedAt || new Date().toISOString().split('T')[0],
      };
      updated.unshift(newProf);
    }
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkProfiles: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Profil Siswa Tersimpan', `Data potensi & minat bakat untuk ${profile.studentName || 'peserta didik'} berhasil disimpan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBKProfile = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkProfiles || [];
    const updated = currentList.filter((p) => p.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkProfiles: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Profil Dihapus', 'Data profil potensi siswa berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const saveBKEmotionLog = async (log: BKEmotionLog): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkEmotionLogs || [];
    let updated = [...currentList];
    const idx = updated.findIndex((e) => e.id === log.id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...log };
    } else {
      const newLog: BKEmotionLog = {
        ...log,
        id: log.id || `bk-emo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: log.createdAt || new Date().toISOString(),
      };
      updated.unshift(newLog);
    }
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkEmotionLogs: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Jurnal Emosi Tersimpan', `Check-in emosi ${log.studentName || 'siswa'} (${log.emotionCategory}) berhasil dicatat.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBKEmotionLog = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkEmotionLogs || [];
    const updated = currentList.filter((e) => e.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkEmotionLogs: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Log Emosi Dihapus', 'Catatan emosi berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const saveBKReferral = async (referral: BKReferral): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkReferrals || [];
    let updated = [...currentList];
    const idx = updated.findIndex((r) => r.id === referral.id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...referral };
    } else {
      const newRef: BKReferral = {
        ...referral,
        id: referral.id || `bk-ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: referral.createdAt || new Date().toISOString().split('T')[0],
      };
      updated.unshift(newRef);
    }
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkReferrals: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Tiket Rujukan Tersimpan', `Tiket rujukan ${referral.studentName || 'siswa'} berhasil disimpan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBKReferral = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkReferrals || [];
    const updated = currentList.filter((r) => r.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkReferrals: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Rujukan Dihapus', 'Tiket rujukan kasus berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const saveBKCounselingLog = async (counseling: BKCounselingLog): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkCounselingLogs || [];
    let updated = [...currentList];
    const idx = updated.findIndex((c) => c.id === counseling.id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...counseling };
    } else {
      const newCs: BKCounselingLog = {
        ...counseling,
        id: counseling.id || `bk-cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: counseling.createdAt || new Date().toISOString().split('T')[0],
      };
      updated.unshift(newCs);
    }
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkCounselingLogs: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Sesi Konseling Tersimpan', `Catatan konseling & resiliensi ${counseling.studentName || 'siswa'} berhasil disimpan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBKCounselingLog = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkCounselingLogs || [];
    const updated = currentList.filter((c) => c.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkCounselingLogs: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Log Konseling Dihapus', 'Catatan sesi konseling berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const saveBKHabitLog = async (habit: BKHabitLog): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkHabitLogs || [];
    let updated = [...currentList];
    const idx = updated.findIndex((h) => h.id === habit.id || (h.studentId === habit.studentId && h.date === habit.date));
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...habit };
    } else {
      const newHabit: BKHabitLog = {
        ...habit,
        id: habit.id || `bk-hbt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      updated.unshift(newHabit);
    }
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkHabitLogs: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Habit Tracker Tersimpan', `Catatan pembiasaan 7 Karakter ${habit.studentName || 'siswa'} berhasil disimpan.`, 'success');
    syncStateToServer(newState);
    return true;
  };

  const deleteBKHabitLog = async (id: string, callback?: (success: boolean) => void): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentList = cur.bkHabitLogs || [];
    const updated = currentList.filter((h) => h.id !== id);
    const delSet = new Set<string>(Array.isArray(cur.deletedIds) ? cur.deletedIds : []);
    delSet.add(id);
    const newState: AppState = { ...cur, version: (cur.version || 1) + 1, bkHabitLogs: updated, deletedIds: Array.from(delSet) };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Habit Log Dihapus', 'Catatan habit tracker berhasil dihapus.', 'info');
    if (callback) callback(true);
    syncStateToServer(newState);
    return true;
  };

  const resetAllBKData = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      bkProfiles: [],
      bkEmotionLogs: [],
      bkReferrals: [],
      bkCounselingLogs: [],
      bkHabitLogs: [],
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Data BK Dimulai dari 0',
      'Seluruh data modul Bimbingan Konseling telah dikosongkan dan siap digunakan dari awal.',
      'info'
    );
    await syncStateToServer(newState);
    return true;
  };

  // --- MANAJEMEN UJIAN METHODS ---
  const getRandom8DigitString = (): string => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  // Generator Token 6 Karakter Alfanumerik (Huruf Kapital & Angka tanpa O, I, 0, 1)
  const generateRandom6DigitToken = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const updateExamTokenConfig = async (tokenStr?: string, isEnabled?: boolean): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const prevConfig = cur.examManagement?.tokenConfig || {
      activeToken: generateRandom6DigitToken(),
      date: todayStr,
      isEnabled: true,
      generatedAt: new Date().toISOString(),
      gradeTokens: {
        X: { jenjang: 'X', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
        XI: { jenjang: 'XI', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
        XII: { jenjang: 'XII', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
      },
      history: [],
    };

    const newActiveToken = tokenStr ? tokenStr.trim().toUpperCase() : (prevConfig.activeToken || generateRandom6DigitToken());
    const newEnabled = isEnabled !== undefined ? isEnabled : prevConfig.isEnabled;

    const historyList = [...(prevConfig.history || [])];
    if (tokenStr && tokenStr.trim() !== prevConfig.activeToken) {
      historyList.unshift({
        date: todayStr,
        token: newActiveToken,
        jenjang: 'SEMUA',
        generatedBy: currentUser?.nama || 'Admin System',
      });
    }

    const updatedTokenConfig: ExamTokenConfig = {
      ...prevConfig,
      activeToken: newActiveToken,
      date: todayStr,
      isEnabled: newEnabled,
      generatedAt: new Date().toISOString(),
      history: historyList.slice(0, 30),
    };

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        tokenConfig: updatedTokenConfig,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Token Ujian Diperbarui',
      `Token aktif: ${newActiveToken} (${newEnabled ? 'Aktif' : 'Nonaktif'})`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const updateGradeExamToken = async (
    jenjang: 'X' | 'XI' | 'XII',
    newToken?: string,
    extra?: { activeExamId?: string; mapelAktif?: string; activeSession?: string | number; isActive?: boolean }
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const prevConfig = cur.examManagement?.tokenConfig || {
      activeToken: generateRandom6DigitToken(),
      date: todayStr,
      isEnabled: true,
      generatedAt: new Date().toISOString(),
      history: [],
    };

    const currentGradeTokens = prevConfig.gradeTokens || {
      X: { jenjang: 'X', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
      XI: { jenjang: 'XI', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
      XII: { jenjang: 'XII', token: generateRandom6DigitToken(), mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
    };

    const tokenToSet = newToken ? newToken.trim().toUpperCase() : generateRandom6DigitToken();
    const prevItem = currentGradeTokens[jenjang] || { jenjang, token: tokenToSet, isActive: true, updatedAt: new Date().toISOString() };

    const updatedGradeItem: GradeExamToken = {
      ...prevItem,
      token: tokenToSet,
      activeExamId: extra?.activeExamId !== undefined ? extra.activeExamId : prevItem.activeExamId,
      mapelAktif: extra?.mapelAktif !== undefined ? extra.mapelAktif : prevItem.mapelAktif,
      activeSession: extra?.activeSession !== undefined ? extra.activeSession : prevItem.activeSession,
      isActive: extra?.isActive !== undefined ? extra.isActive : prevItem.isActive,
      updatedAt: new Date().toISOString(),
    };

    const newGradeTokens = {
      ...currentGradeTokens,
      [jenjang]: updatedGradeItem,
    };

    const historyList = [...(prevConfig.history || [])];
    historyList.unshift({
      date: todayStr,
      token: tokenToSet,
      jenjang,
      generatedBy: currentUser?.nama || 'Proktor CBT',
    });

    const updatedTokenConfig: ExamTokenConfig = {
      ...prevConfig,
      date: todayStr,
      gradeTokens: newGradeTokens,
      history: historyList.slice(0, 30),
      generatedAt: new Date().toISOString(),
    };

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        tokenConfig: updatedTokenConfig,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      `Token Kelas ${jenjang} Diperbarui`,
      `Token baru Kelas ${jenjang}: ${tokenToSet} (${updatedGradeItem.mapelAktif || 'Ujian Aktif'})`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const generateAllGradeTokens = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const prevConfig = cur.examManagement?.tokenConfig;
    const currentGradeTokens = prevConfig?.gradeTokens;

    const tokenX = generateRandom6DigitToken();
    const tokenXI = generateRandom6DigitToken();
    const tokenXII = generateRandom6DigitToken();
    const nowIso = new Date().toISOString();

    const newGradeTokens: Record<'X' | 'XI' | 'XII', GradeExamToken> = {
      X: {
        jenjang: 'X',
        token: tokenX,
        mapelAktif: currentGradeTokens?.X?.mapelAktif || 'Bahasa Indonesia',
        activeSession: currentGradeTokens?.X?.activeSession || 'Sesi 1',
        isActive: currentGradeTokens?.X?.isActive ?? true,
        updatedAt: nowIso,
      },
      XI: {
        jenjang: 'XI',
        token: tokenXI,
        mapelAktif: currentGradeTokens?.XI?.mapelAktif || 'Bahasa Indonesia',
        activeSession: currentGradeTokens?.XI?.activeSession || 'Sesi 1',
        isActive: currentGradeTokens?.XI?.isActive ?? true,
        updatedAt: nowIso,
      },
      XII: {
        jenjang: 'XII',
        token: tokenXII,
        mapelAktif: currentGradeTokens?.XII?.mapelAktif || 'Bahasa Indonesia',
        activeSession: currentGradeTokens?.XII?.activeSession || 'Sesi 1',
        isActive: currentGradeTokens?.XII?.isActive ?? true,
        updatedAt: nowIso,
      },
    };

    const historyList = [...(prevConfig?.history || [])];
    historyList.unshift(
      { date: todayStr, token: tokenX, jenjang: 'X', generatedBy: currentUser?.nama || 'Proktor CBT' },
      { date: todayStr, token: tokenXI, jenjang: 'XI', generatedBy: currentUser?.nama || 'Proktor CBT' },
      { date: todayStr, token: tokenXII, jenjang: 'XII', generatedBy: currentUser?.nama || 'Proktor CBT' }
    );

    const updatedTokenConfig: ExamTokenConfig = {
      activeToken: tokenX,
      date: todayStr,
      isEnabled: true,
      gradeTokens: newGradeTokens,
      history: historyList.slice(0, 30),
      generatedAt: nowIso,
    };

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        tokenConfig: updatedTokenConfig,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Semua Token Jenjang Diperbarui',
      `Kelas X: ${tokenX} | Kelas XI: ${tokenXI} | Kelas XII: ${tokenXII}`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const generateStudentExamCredentials = async (options?: { classFilter?: string; forceResetAll?: boolean; autoLock?: boolean }): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.students)) return false;

    const targetClass = options?.classFilter || 'ALL';
    const forceReset = options?.forceResetAll ?? true;
    const shouldLock = options?.autoLock ?? true;
    const nowIso = new Date().toISOString();
    const lockerName = currentUser?.nama || 'Admin/Operator/Proktor';

    const usedUsernames = new Set<string>();

    const updatedStudents = cur.students.map((std) => {
      if (targetClass !== 'ALL' && std.kelas !== targetClass) {
        if (std.examUsername) usedUsernames.add(std.examUsername);
        return std;
      }

      if (!forceReset && std.examUsername && std.examPassword) {
        usedUsernames.add(std.examUsername);
        return shouldLock
          ? {
              ...std,
              isLocked: true,
              lockedAt: std.lockedAt || nowIso,
              lockedBy: std.lockedBy || lockerName,
            }
          : std;
      }

      let newCode = getRandom8DigitString();
      while (usedUsernames.has(newCode)) {
        newCode = getRandom8DigitString();
      }
      usedUsernames.add(newCode);

      return {
        ...std,
        examUsername: newCode,
        examPassword: newCode,
        isLocked: shouldLock,
        lockedAt: shouldLock ? nowIso : std.lockedAt,
        lockedBy: shouldLock ? lockerName : std.lockedBy,
      };
    });

    const studentCredentials: StudentExamCredential[] = updatedStudents.map((s) => ({
      studentId: s.id,
      studentName: s.nama,
      nisn: s.nisn,
      kelas: s.kelas,
      examUsername: s.examUsername || getRandom8DigitString(),
      examPassword: s.examPassword || getRandom8DigitString(),
      isLocked: s.isLocked ?? shouldLock,
      lockedAt: s.lockedAt || (shouldLock ? nowIso : undefined),
      lockedBy: s.lockedBy || (shouldLock ? lockerName : undefined),
      loginStatus: 'Belum Login',
      lastResetAt: nowIso,
    }));

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      students: updatedStudents,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials,
        credentialsLocked: shouldLock,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Kredensial CBT 8-Digit Terkunci & Permanen',
      `Berhasil meng-generate dan mengunci kredensial login CBT untuk ${targetClass === 'ALL' ? 'seluruh siswa' : `kelas ${targetClass}`}. Akun tersimpan permanen di database.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const resetSingleStudentExamCredential = async (studentId: string): Promise<string> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.students)) return '';

    const newCode = getRandom8DigitString();
    const nowIso = new Date().toISOString();
    const lockerName = currentUser?.nama || 'Admin/Operator/Proktor';

    const updatedStudents = cur.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          examUsername: newCode,
          examPassword: newCode,
          isLocked: true,
          lockedAt: nowIso,
          lockedBy: lockerName,
        };
      }
      return s;
    });

    const targetStudent = updatedStudents.find((s) => s.id === studentId);

    const credsList = (cur.examManagement?.studentCredentials || []).map((c) => {
      if (c.studentId === studentId) {
        return {
          ...c,
          examUsername: newCode,
          examPassword: newCode,
          isLocked: true,
          lockedAt: nowIso,
          lockedBy: lockerName,
          lastResetAt: nowIso,
        };
      }
      return c;
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      students: updatedStudents,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: credsList,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Kredensial Siswa Di-reset & Dikunci',
      `Kredensial ${targetStudent?.nama || 'Siswa'}: Username/Password baru = ${newCode} (Tersimpan & Terkunci Permanen).`,
      'info'
    );
    await syncStateToServer(newState);
    return newCode;
  };

  const lockStudentExamCredentials = async (classFilter?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.students)) return false;

    const targetClass = classFilter || 'ALL';
    const nowIso = new Date().toISOString();
    const lockerName = currentUser?.nama || 'Admin/Operator/Proktor';

    const updatedStudents = cur.students.map((s) => {
      if (targetClass !== 'ALL' && s.kelas !== targetClass) return s;
      const creds = getStudentCbtCredentials(s);
      return {
        ...s,
        examUsername: s.examUsername && s.examUsername.trim().length === 8 ? s.examUsername.trim() : creds.username,
        examPassword: s.examPassword && s.examPassword.trim().length >= 4 ? s.examPassword.trim() : creds.password,
        isLocked: true,
        lockedAt: nowIso,
        lockedBy: lockerName,
      };
    });

    const updatedCreds = updatedStudents.map((s) => {
      const existing = (cur.examManagement?.studentCredentials || []).find((c) => c.studentId === s.id);
      return {
        studentId: s.id,
        studentName: s.nama,
        nisn: s.nisn,
        kelas: s.kelas,
        examUsername: s.examUsername || getRandom8DigitString(),
        examPassword: s.examPassword || getRandom8DigitString(),
        isLocked: true,
        lockedAt: nowIso,
        lockedBy: lockerName,
        loginStatus: existing?.loginStatus || ('Belum Login' as const),
        lastResetAt: existing?.lastResetAt || nowIso,
      };
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      students: updatedStudents,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: updatedCreds,
        credentialsLocked: true,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Akun CBT Siswa Dikunci Permanen',
      `Berhasil mengunci dan menyimpan kredensial login CBT untuk ${targetClass === 'ALL' ? 'seluruh siswa' : `kelas ${targetClass}`}. Akun tersimpan permanen dan terhubung ke Kartu Ujian.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const unlockStudentExamCredentials = async (classFilter?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.students)) return false;

    const targetClass = classFilter || 'ALL';

    const updatedStudents = cur.students.map((s) => {
      if (targetClass !== 'ALL' && s.kelas !== targetClass) return s;
      return {
        ...s,
        isLocked: false,
      };
    });

    const updatedCreds = (cur.examManagement?.studentCredentials || []).map((c) => {
      if (targetClass !== 'ALL' && c.kelas !== targetClass) return c;
      return {
        ...c,
        isLocked: false,
      };
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      students: updatedStudents,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: updatedCreds,
        credentialsLocked: false,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Kunci Akun CBT Dibuka',
      `Status kunci kredensial untuk ${targetClass === 'ALL' ? 'seluruh siswa' : `kelas ${targetClass}`} telah dibuka untuk pengeditan.`,
      'info'
    );
    await syncStateToServer(newState);
    return true;
  };

  const updateSingleStudentCredential = async (
    studentId: string,
    newUsername: string,
    newPassword: string,
    lockAfterUpdate: boolean = true
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !Array.isArray(cur.students)) return false;

    const nowIso = new Date().toISOString();
    const lockerName = currentUser?.nama || 'Admin Sistem';

    const updatedStudents = cur.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          examUsername: newUsername.trim(),
          examPassword: newPassword.trim(),
          isLocked: lockAfterUpdate,
          lockedAt: lockAfterUpdate ? nowIso : s.lockedAt,
          lockedBy: lockAfterUpdate ? lockerName : s.lockedBy,
        };
      }
      return s;
    });

    const targetStudent = updatedStudents.find((s) => s.id === studentId);

    const credsList = (cur.examManagement?.studentCredentials || []).map((c) => {
      if (c.studentId === studentId) {
        return {
          ...c,
          examUsername: newUsername.trim(),
          examPassword: newPassword.trim(),
          isLocked: lockAfterUpdate,
          lockedAt: lockAfterUpdate ? nowIso : c.lockedAt,
          lockedBy: lockAfterUpdate ? lockerName : c.lockedBy,
          lastResetAt: nowIso,
        };
      }
      return c;
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      students: updatedStudents,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: credsList,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Kredensial Siswa Diperbarui',
      `Akun ${targetStudent?.nama || 'Siswa'}: Username = ${newUsername} ${lockAfterUpdate ? '(Terkunci Permanen)' : ''}`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const updateStudentExamSessionStatus = async (
    studentId: string,
    status: 'Belum Login' | 'Sedang Mengerjakan' | 'Selesai' | 'Sesi Terkunci',
    examTitle?: string,
    score?: number
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existingCreds: StudentExamCredential[] = cur.examManagement?.studentCredentials || [];
    const index = existingCreds.findIndex((c) => c.studentId === studentId);

    const nowIso = new Date().toISOString();
    let updatedCreds: StudentExamCredential[];

    if (index >= 0) {
      const existing = existingCreds[index];
      const updatedItem: StudentExamCredential = {
        ...existing,
        loginStatus: status,
        lastLoginAt: status === 'Sedang Mengerjakan' ? nowIso : existing.lastLoginAt,
        currentExamTitle: examTitle !== undefined ? examTitle : existing.currentExamTitle,
        score: score !== undefined ? score : existing.score,
        completedAt: status === 'Selesai' ? nowIso : existing.completedAt,
      };
      updatedCreds = [...existingCreds];
      updatedCreds[index] = updatedItem;
    } else {
      const student = (cur.students || []).find((s) => s.id === studentId);
      if (student) {
        const creds = getStudentCbtCredentials(student);
        const newItem: StudentExamCredential = {
          studentId: student.id,
          studentName: student.nama,
          nisn: student.nisn,
          kelas: student.kelas,
          examUsername: student.examUsername || creds.username,
          examPassword: student.examPassword || creds.password,
          loginStatus: status,
          lastLoginAt: status === 'Sedang Mengerjakan' ? nowIso : undefined,
          currentExamTitle: examTitle,
          score,
          completedAt: status === 'Selesai' ? nowIso : undefined,
        };
        updatedCreds = [newItem, ...existingCreds];
      } else {
        return false;
      }
    }

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: updatedCreds,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    await syncStateToServer(newState);
    return true;
  };

  const resetStudentLoginSession = async (studentId: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existingCreds = cur.examManagement?.studentCredentials || [];
    const student = (cur.students || []).find((s) => s.id === studentId);
    const updatedCreds = existingCreds.map((c) => {
      if (c.studentId === studentId) {
        return {
          ...c,
          loginStatus: 'Belum Login' as const,
          lastResetAt: new Date().toISOString(),
        };
      }
      return c;
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        studentCredentials: updatedCreds,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Sesi Login Siswa Di-reset',
      `Sesi CBT ${student?.nama || 'Siswa'} telah dibuka kunci. Siswa dapat login kembali.`,
      'info'
    );
    await syncStateToServer(newState);
    return true;
  };

  const saveExamSchedule = async (schedule: ExamSchedule): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existingSchedules = cur.examManagement?.schedules || [];
    const index = existingSchedules.findIndex((s) => s.id === schedule.id);

    let updatedSchedules: ExamSchedule[];
    if (index >= 0) {
      updatedSchedules = [...existingSchedules];
      updatedSchedules[index] = schedule;
    } else {
      updatedSchedules = [schedule, ...existingSchedules];
    }

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        schedules: updatedSchedules,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Jadwal Ujian Tersimpan', `Jadwal ${schedule.title} berhasil diperbarui.`, 'success');
    await syncStateToServer(newState);
    return true;
  };

  const deleteExamSchedule = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updatedSchedules = (cur.examManagement?.schedules || []).filter((s) => s.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        schedules: updatedSchedules,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Jadwal Dihapus', 'Jadwal pelaksanaan ujian telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const saveTeacherExamAssignment = async (assignment: TeacherExamAssignment): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existingAssignments = cur.examManagement?.teacherAssignments || [];
    const index = existingAssignments.findIndex((a) => a.id === assignment.id);

    let updatedAssignments: TeacherExamAssignment[];
    if (index >= 0) {
      updatedAssignments = [...existingAssignments];
      updatedAssignments[index] = assignment;
    } else {
      updatedAssignments = [assignment, ...existingAssignments];
    }

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        teacherAssignments: updatedAssignments,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    const currentNotifs = cur.notifications || [];
    let updatedNotifs = [...currentNotifs];

    if (index < 0) {
      // Penugasan Soal Baru
      updatedNotifs.unshift({
        id: `notif-asgn-${assignment.id}-${Date.now()}`,
        recipientId: assignment.teacherId,
        recipientRole: 'guru',
        category: 'penugasan_baru',
        title: 'Penugasan Paket Soal Baru',
        message: `Anda ditugaskan menyusun paket soal ${assignment.subjectName} (${assignment.category}) target ${assignment.targetQuestions} butir soal. Batas waktu: ${assignment.dueDate}.`,
        targetModule: 'sumatif',
        targetView: 'assessments',
        targetId: assignment.id,
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high',
        senderName: 'Admin / Operator',
        senderRole: 'admin',
      });
    } else {
      const oldAsgn = existingAssignments[index];
      if (assignment.status === 'Telah Diverifikasi' && oldAsgn?.status !== 'Telah Diverifikasi') {
        updatedNotifs.unshift({
          id: `notif-vld-${assignment.id}-${Date.now()}`,
          recipientId: assignment.teacherId,
          recipientRole: 'guru',
          category: 'validasi_revisi',
          title: 'Paket Soal Disetujui (Approved)',
          message: `Selamat, paket soal ${assignment.subjectName} (${assignment.category}) Anda telah disetujui & diverifikasi oleh Admin/Kurikulum.`,
          targetModule: 'sumatif',
          targetView: 'assessments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'normal',
          senderName: 'Admin / Kurikulum',
          senderRole: 'admin',
        });
      } else if (assignment.status === 'Sedang Digarap' && assignment.validationNotes && assignment.validationNotes !== oldAsgn?.validationNotes) {
        updatedNotifs.unshift({
          id: `notif-rev-${assignment.id}-${Date.now()}`,
          recipientId: assignment.teacherId,
          recipientRole: 'guru',
          category: 'validasi_revisi',
          title: 'Catatan Revisi Paket Soal',
          message: `Paket soal ${assignment.subjectName} (${assignment.category}) memerlukan revisi: "${assignment.validationNotes}".`,
          targetModule: 'sumatif',
          targetView: 'assessments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high',
          senderName: 'Admin / Kurikulum',
          senderRole: 'admin',
        });
      } else if (assignment.status === 'Selesai Digarap' && oldAsgn?.status !== 'Selesai Digarap') {
        updatedNotifs.unshift({
          id: `notif-done-${assignment.id}-${Date.now()}`,
          recipientId: 'ROLE_ADMIN',
          recipientRole: 'admin',
          category: 'tugas_selesai',
          title: 'Penyelesaian Tugas Soal',
          message: `Guru ${assignment.teacherName} telah menyelesaikan 100% target butir soal (${assignment.targetQuestions} butir) untuk ${assignment.subjectName} (${assignment.category}). Siap diverifikasi.`,
          targetModule: 'manajemen-ujian',
          targetView: 'exam-assignments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high',
          senderName: assignment.teacherName,
          senderRole: 'guru',
        });
      }
    }

    newState.notifications = updatedNotifs.slice(0, 150);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    showToast('Penugasan Guru Tersimpan', `Penggarapan soal ${assignment.subjectName} oleh ${assignment.teacherName} diperbarui.`, 'success');
    await syncStateToServer(newState);
    return true;
  };

  const deleteTeacherExamAssignment = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updatedAssignments = (cur.examManagement?.teacherAssignments || []).filter((a) => a.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        teacherAssignments: updatedAssignments,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast('Penugasan Dihapus', 'Penugasan penggarapan soal guru telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const setActiveExamSession = async (
    activeType: 'SEMUA' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI',
    activeName?: string,
    activeNote?: string
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const resolvedName =
      activeName ||
      (activeType === 'Olimpiade'
        ? 'Seleksi OSN / Olimpiade Sains'
        : activeType === 'DSMART'
        ? "Simulasi D'SMART Lampung (4 Instrumen)"
        : activeType === 'ASTS'
        ? 'Asesmen Sumatif Tengah Semester (ASTS)'
        : activeType === 'ASAS'
        ? 'Asesmen Sumatif Akhir Semester (ASAS)'
        : activeType === 'SIMULASI'
        ? 'Simulasi & Latihan Ujian CBT'
        : 'Semua Jenis Ujian CBT');

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        activeExamType: activeType,
        activeExamName: resolvedName,
        activeExamNote: activeNote !== undefined ? activeNote : cur.examManagement?.activeExamNote,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Sesi Ujian CBT Diperbarui',
      `Jenis ujian aktif saat ini ditetapkan ke: ${resolvedName}.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const toggleDisabledExamType = async (type: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentDisabled = cur.examManagement?.disabledExamTypes || [];
    const isCurrentlyDisabled = currentDisabled.includes(type);

    let updatedDisabled: string[];
    if (isCurrentlyDisabled) {
      updatedDisabled = currentDisabled.filter((t) => t !== type);
    } else {
      updatedDisabled = [...currentDisabled, type];
    }

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        disabledExamTypes: updatedDisabled,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      isCurrentlyDisabled ? `Jenis Ujian ${type} DIAKTIFKAN` : `Jenis Ujian ${type} DINONAKTIFKAN`,
      isCurrentlyDisabled
        ? `Jenis Ujian ${type} kini dapat diakses oleh peserta didik.`
        : `Peserta didik tidak dapat memilih ujian ${type} saat login.`,
      isCurrentlyDisabled ? 'success' : 'warning'
    );
    await syncStateToServer(newState);
    return true;
  };

  const toggleAllExamsDisabled = async (disabled: boolean): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: {
        ...(cur.examManagement || {}),
        allExamsDisabled: disabled,
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      disabled ? 'Semua Ujian Dinonaktifkan' : 'Semua Ujian Diaktifkan',
      disabled
        ? "Siswa yang login hari ini akan melihat status 'TIDAK ADA UJIAN UNTUK HARI INI'."
        : 'Siswa kini dapat memilih modul ujian CBT yang tersedia.',
      disabled ? 'warning' : 'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const updateExamManagementState = async (
    updater:
      | import('../types').ExamManagementState
      | ((prev: import('../types').ExamManagementState) => import('../types').ExamManagementState)
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;
    const prevExam = cur.examManagement || {};
    const updatedExam = typeof updater === 'function' ? updater(prevExam) : updater;
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      examManagement: updatedExam,
    };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    await syncStateToServer(newState);
    return true;
  };

  const saveLitNumRecordsBatch = async (records: LitNumRecord[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !records || records.length === 0) return false;

    const existing = cur.litnumRecords || [];
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const updated = [...existing];
    let insertedCount = 0;
    let updatedCount = 0;

    records.forEach((newRec) => {
      const existingIdx = updated.findIndex((r) => {
        if (r.id === newRec.id) return true;
        const matchesStudent =
          (r.studentId && newRec.studentId && r.studentId === newRec.studentId && !r.studentId.startsWith('st-unmatched')) ||
          cleanCanonical(r.studentName) === cleanCanonical(newRec.studentName);
        return matchesStudent && r.type === newRec.type && r.date === newRec.date;
      });

      if (existingIdx >= 0) {
        const oldRec = updated[existingIdx];
        const bestScore = Math.max(oldRec.score, newRec.score);
        updated[existingIdx] = {
          ...oldRec,
          ...newRec,
          id: oldRec.id,
          score: bestScore,
          notes: `${oldRec.notes || ''} [Anti-Ganda: Skor Terbaik ${bestScore}]`.trim(),
        };
        updatedCount++;
      } else {
        updated.push(newRec);
        insertedCount++;
      }
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      litnumRecords: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Data Literasi & Numerasi Disimpan',
      `Berhasil memproses ${records.length} data: ${insertedCount} data baru ditambahkan, ${updatedCount} data diperbarui rapi bebas duplikasi.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const deleteLitNumRecord = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updated = (cur.litnumRecords || []).filter((r) => r.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      litnumRecords: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Data Dihapus', 'Data hasil literasi/numerasi telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const handleSaveDraftReview = async (item: {
    id: string;
    examType: 'CBT_REGULER' | 'CBT_LITNUM';
    reviewNotes: string;
    assessmentId?: string;
  }): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    if (item.examType === 'CBT_REGULER') {
      const assessments = [...(cur.assessments || [])];
      let targetAsmIdx = -1;
      let targetSubIdx = -1;

      if (item.assessmentId) {
        targetAsmIdx = assessments.findIndex((a) => a.id === item.assessmentId);
        if (targetAsmIdx >= 0) {
          targetSubIdx = (assessments[targetAsmIdx].submissions || []).findIndex(
            (s) => s.id === item.id
          );
        }
      }

      if (targetAsmIdx === -1) {
        for (let i = 0; i < assessments.length; i++) {
          const sIdx = (assessments[i].submissions || []).findIndex((s) => s.id === item.id);
          if (sIdx >= 0) {
            targetAsmIdx = i;
            targetSubIdx = sIdx;
            break;
          }
        }
      }

      if (targetAsmIdx >= 0 && targetSubIdx >= 0) {
        const asm = { ...assessments[targetAsmIdx] };
        const subs = [...(asm.submissions || [])];
        subs[targetSubIdx] = {
          ...subs[targetSubIdx],
          reviewNotes: item.reviewNotes,
          status: 'draft',
        };
        asm.submissions = subs;
        assessments[targetAsmIdx] = asm;

        const newState: AppState = {
          ...cur,
          version: (cur.version || 1) + 1,
          assessments,
        };
        stateRef.current = newState;
        setState(newState);
        persistLocalState(newState);
        syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
        showToast('Draf Tinjauan Disimpan', 'Catatan tinjauan telah disimpan sementara sebagai Draf.', 'info');
        await syncStateToServer(newState);
        return true;
      }
    } else {
      // CBT_LITNUM
      const litRecords = [...(cur.litnumRecords || [])];
      const rIdx = litRecords.findIndex((r) => r.id === item.id);
      if (rIdx >= 0) {
        litRecords[rIdx] = {
          ...litRecords[rIdx],
          reviewNotes: item.reviewNotes,
          status: 'draft',
        };

        const newState: AppState = {
          ...cur,
          version: (cur.version || 1) + 1,
          litnumRecords: litRecords,
        };
        stateRef.current = newState;
        setState(newState);
        persistLocalState(newState);
        syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
        showToast('Draf Tinjauan Disimpan', 'Catatan tinjauan LitNum telah disimpan sementara sebagai Draf.', 'info');
        await syncStateToServer(newState);
        return true;
      }
    }
    return false;
  };

  const handleFinalizeExamScores = async (
    items: Array<{ id: string; examType: 'CBT_REGULER' | 'CBT_LITNUM'; assessmentId?: string }>,
    reviewerName: string,
    reviewerRole: 'admin' | 'operator' | 'proktor'
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !items || items.length === 0) return false;

    const nowIso = new Date().toISOString();
    let updatedAssessments = [...(cur.assessments || [])];
    let updatedLitRecords = [...(cur.litnumRecords || [])];
    let finalizedCount = 0;

    items.forEach((item) => {
      if (item.examType === 'CBT_REGULER') {
        let asmIdx = -1;
        let subIdx = -1;
        if (item.assessmentId) {
          asmIdx = updatedAssessments.findIndex((a) => a.id === item.assessmentId);
          if (asmIdx >= 0) {
            subIdx = (updatedAssessments[asmIdx].submissions || []).findIndex((s) => s.id === item.id);
          }
        }
        if (asmIdx === -1) {
          for (let i = 0; i < updatedAssessments.length; i++) {
            const sIdx = (updatedAssessments[i].submissions || []).findIndex((s) => s.id === item.id);
            if (sIdx >= 0) {
              asmIdx = i;
              subIdx = sIdx;
              break;
            }
          }
        }

        if (asmIdx >= 0 && subIdx >= 0) {
          const asm = { ...updatedAssessments[asmIdx] };
          const subs = [...(asm.submissions || [])];
          subs[subIdx] = {
            ...subs[subIdx],
            status: 'final',
            isLocked: true,
            reviewedBy: reviewerName,
            reviewerRole,
            finalizedAt: nowIso,
            statusKoreksi: 'Final / Terverifikasi Proktor',
          };
          asm.submissions = subs;
          updatedAssessments[asmIdx] = asm;
          finalizedCount++;
        }
      } else {
        // CBT_LITNUM
        const rIdx = updatedLitRecords.findIndex((r) => r.id === item.id);
        if (rIdx >= 0) {
          updatedLitRecords[rIdx] = {
            ...updatedLitRecords[rIdx],
            status: 'final',
            isLocked: true,
            reviewedBy: reviewerName,
            reviewerRole,
            finalizedAt: nowIso,
          };
          finalizedCount++;
        }
      }
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      assessments: updatedAssessments,
      litnumRecords: updatedLitRecords,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    showToast(
      'Nilai Berhasil Difinalisasi!',
      `${finalizedCount} hasil ujian telah dikunci secara PERMANEN (Final) oleh ${reviewerName} (${reviewerRole.toUpperCase()}). Nilai kini otomatis masuk ke buku nilai & rapor pendidikan.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const saveRaporPendidikanDoc = async (docData: RaporPendidikanDoc): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existing = cur.raportPendidikanDocs || [];
    const filtered = existing.filter((d) => d.id !== docData.id && d.tahun !== docData.tahun);
    const updated = [docData, ...filtered];

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      raportPendidikanDocs: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Rapor Pendidikan Disimpan',
      `Berhasil membaca dan menyimpan data RAPOR-PBD Kemendikdasmen Tahun ${docData.tahun}.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const deleteRaporPendidikanDoc = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updated = (cur.raportPendidikanDocs || []).filter((d) => d.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      raportPendidikanDocs: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Rapor Pendidikan Dihapus', 'File Rapor Pendidikan telah dihapus dari sistem.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const saveLitNumScheduleConfig = async (config: LitNumScheduleConfig): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      litnumScheduleConfig: {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.nama || 'Koordinator LitNum',
      },
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      config.isEnabled ? 'Penjadwalan LitNum DIAKTIFKAN' : 'Penjadwalan LitNum DINONAKTIFKAN',
      config.isEnabled
        ? `Siswa dapat mengerjakan Literasi & Numerasi pada jam ${config.jamMulai} - ${config.jamSelesai} WIB.`
        : 'Pengerjaan Literasi & Numerasi telah ditutup untuk siswa.',
      config.isEnabled ? 'success' : 'warning'
    );
    await syncStateToServer(newState);
    return true;
  };

  const saveDailyAttendance = async (attendance: import('../types').DailyClassAttendance): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existing = cur.dailyAttendances || [];
    const index = existing.findIndex((a) => a.id === attendance.id);
    let updated: import('../types').DailyClassAttendance[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = attendance;
    } else {
      updated = [attendance, ...existing];
    }

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      dailyAttendances: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Presensi Siswa Tersimpan',
      `Presensi kelas ${attendance.kelas} tanggal ${attendance.tanggal} berhasil disimpan & disinkronkan ke cloud.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const deleteDailyAttendance = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const updated = (cur.dailyAttendances || []).filter((a) => a.id !== id);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      dailyAttendances: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Presensi Dihapus', 'Data presensi harian rombel telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const saveDailyAttendanceBatch = async (attendances: import('../types').DailyClassAttendance[]): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !attendances || attendances.length === 0) return false;

    const existing = cur.dailyAttendances || [];
    const map = new Map<string, import('../types').DailyClassAttendance>();
    existing.forEach((a) => map.set(a.id, a));
    attendances.forEach((a) => map.set(a.id, a));

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      dailyAttendances: Array.from(map.values()),
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Presensi Batch Disimpan', `Berhasil menyinkronkan ${attendances.length} lembar presensi ke cloud.`, 'success');
    await syncStateToServer(newState);
    return true;
  };

  const clearAllDailyAttendances = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      dailyAttendances: [],
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Presensi Dikosongkan',
      'Seluruh data presensi siswa telah berhasil direset menjadi 0. Siap dihubungkan dengan Master Data.',
      'info'
    );
    await syncStateToServer(newState);
    return true;
  };

  const saveGradeRecapSheet = async (
    sheet: import('../types').SubjectGradeRecapSheet,
    silent?: boolean
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !sheet || !sheet.id) return false;

    const existingSheets = cur.gradeRecapSheets ? [...cur.gradeRecapSheets] : [];
    const idx = existingSheets.findIndex((s) => s.id === sheet.id);
    const updatedSheet = {
      ...sheet,
      updatedAt: new Date().toISOString(),
      lastAutosavedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      existingSheets[idx] = updatedSheet;
    } else {
      existingSheets.push(updatedSheet);
    }

    const newState: AppState = {
      ...cur,
      gradeRecapSheets: existingSheets,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    if (!silent) {
      showToast('Rekap Nilai Disimpan', `Data rekap nilai ${sheet.mataPelajaran} kelas ${sheet.kelas} berhasil disimpan.`, 'success');
    }
    await syncStateToServer(newState);
    return true;
  };

  const lockGradeRecapSheetFinal = async (sheetId: string, note?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !sheetId) return false;

    const existingSheets = cur.gradeRecapSheets ? [...cur.gradeRecapSheets] : [];
    const idx = existingSheets.findIndex((s) => s.id === sheetId);
    if (idx === -1) {
      showToast('Lembar Tidak Ditemukan', 'Gagal mengunci: Lembar nilai belum disimpan ke sistem.', 'error');
      return false;
    }

    const currentSheet = existingSheets[idx];
    const updatedSheet: import('../types').SubjectGradeRecapSheet = {
      ...currentSheet,
      isFinalLocked: true,
      statusLock: 'FINAL',
      finalizedAt: new Date().toISOString(),
      finalizedBy: currentUser?.nama || 'Guru Pengampu',
      finalizedByRole: currentUser?.role || 'guru',
      finalizedNote: note || 'Nilai resmi telah diverifikasi lengkap dan dikunci secara permanen.',
      updatedAt: new Date().toISOString(),
    };

    existingSheets[idx] = updatedSheet;

    const newState: AppState = {
      ...cur,
      gradeRecapSheets: existingSheets,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Nilai Dikunci Permanen',
      `Seluruh nilai ${currentSheet.mataPelajaran} kelas ${currentSheet.kelas} resmi dikunci permanen (FINAL) dan tidak dapat dirubah kembali.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const unlockGradeRecapSheetAdmin = async (sheetId: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !sheetId) return false;

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'operator';
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Administrator yang memiliki wewenang membuka kunci lembar nilai permanen.', 'error');
      return false;
    }

    const existingSheets = cur.gradeRecapSheets ? [...cur.gradeRecapSheets] : [];
    const idx = existingSheets.findIndex((s) => s.id === sheetId);
    if (idx === -1) return false;

    const currentSheet = existingSheets[idx];
    const updatedSheet: import('../types').SubjectGradeRecapSheet = {
      ...currentSheet,
      isFinalLocked: false,
      statusLock: 'DRAFT',
      finalizedNote: `Kunci dibuka oleh Admin (${currentUser?.nama}) pada ${new Date().toLocaleString('id-ID')}`,
      updatedAt: new Date().toISOString(),
    };

    existingSheets[idx] = updatedSheet;

    const newState: AppState = {
      ...cur,
      gradeRecapSheets: existingSheets,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Kunci Dibuka (Admin Override)', `Lembar nilai ${currentSheet.mataPelajaran} ${currentSheet.kelas} kini berstatus DRAFT dan dapat diedit kembali.`, 'info');
    await syncStateToServer(newState);
    return true;
  };

  const saveHistoricalLegerRecord = async (
    record: import('../types').HistoricalLegerImportRecord
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur || !record) return false;

    const existing = cur.historicalLegers ? [...cur.historicalLegers] : [];
    const idx = existing.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      existing[idx] = record;
    } else {
      existing.unshift(record);
    }

    const newState: AppState = {
      ...cur,
      historicalLegers: existing,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast(
      'Leger Historis Disimpan',
      `Berhasil menyimpan leger riwayat ${record.kelasAsal} (${record.tahunAjaranAsal}) dengan ${record.totalMatchedStudents} siswa terhubung.`,
      'success'
    );
    await syncStateToServer(newState);
    return true;
  };

  const deleteHistoricalLegerRecord = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existing = (cur.historicalLegers || []).filter((r) => r.id !== id);
    const newState: AppState = {
      ...cur,
      historicalLegers: existing,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Leger Historis Dihapus', 'Data riwayat leger nilai telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  const deleteGradeRecapSheet = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const existingSheets = (cur.gradeRecapSheets || []).filter((s) => s.id !== id);
    const newState: AppState = {
      ...cur,
      gradeRecapSheets: existingSheets,
      version: (cur.version || 1) + 1,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });

    showToast('Rekap Nilai Dihapus', 'Lembar rekapitulasi nilai telah dihapus.', 'info');
    await syncStateToServer(newState);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        state: state as AppState,
        currentUser,
        setCurrentUser,
        currentView,
        setCurrentView,
        selectedAssessmentId,
        setSelectedAssessmentId,
        loading,
        isSyncing,
        isOnline,
        lastSyncTime,
        cloudSyncStatus: isSyncing ? 'syncing' : (isOnline ? 'synced' : 'offline'),
        forceCloudSync: async () => {
          try {
            setIsSyncing(true);
            await refreshState(false);
            showToast(
              'Sinkronisasi Cloud Berhasil',
              'Seluruh data sistem dan pekerjaan terakhir telah disinkronkan secara real-time dari cloud server ke perangkat ini.',
              'success'
            );
          } catch (e) {
            showToast('Gagal Sinkronisasi', 'Tidak dapat memperbarui dari server cloud saat ini.', 'error');
          } finally {
            setIsSyncing(false);
          }
        },
        toasts,
        showToast,
        removeToast,
        refreshState,
        updateSchoolInfo,
        saveTeacher,
        saveTeachersBatch,
        deleteTeacher,
        deleteTeachersBatch,
        saveAssessment,
        saveAssessmentsBatch,
        deleteAssessment,
        deleteAssessmentsBatch,
        deleteSubmission,
        saveStudent,
        saveStudentsBatch,
        deleteStudent,
        deleteStudentsBatch,
        saveClass,
        deleteClass,
        saveSubject,
        saveSubjectsBatch,
        replaceSubjectsAll,
        importSubjectsComplete,
        deleteSubject,
        deleteSubjectsBatch,
        saveFeedback,
        updateFeedbackStatus,
        deleteFeedback,
        clearAllFeedbacks,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        toggleFeedbackBestTestimonial,
        saveBeritaAcara,
        deleteBeritaAcara,
        deleteBeritaAcaraBatch,
        verifyBeritaAcaraKepsek,
        saveSupervisiCatatan,
        deleteSupervisiCatatan,
        saveCalendarEvent,
        deleteCalendarEvent,
        toggleCalendarEventComplete,
        saveCalendarEventsBatch,
        saveAnnouncement,
        deleteAnnouncement,
        toggleAnnouncementPin,
        toggleAnnouncementActive,
        saveAIStudioPrompt,
        deleteAIStudioPrompt,
        resetAIStudioPromptsToDefault,
        resetAllData,
        resetCorrectionData,
        cleanSystemGarbage,
        toggleTeacherOnlineStatus,
        setTeachersStatusBatch,
        exportBackupJSON,
        importBackupJSON,
        createManualArchive,
        deleteArchive,
        saveBKProfile,
        deleteBKProfile,
        saveBKEmotionLog,
        deleteBKEmotionLog,
        saveBKReferral,
        deleteBKReferral,
        saveBKCounselingLog,
        deleteBKCounselingLog,
        saveBKHabitLog,
        deleteBKHabitLog,
        resetAllBKData,
        updateExamTokenConfig,
        updateGradeExamToken,
        generateAllGradeTokens,
        generateStudentExamCredentials,
        resetSingleStudentExamCredential,
        lockStudentExamCredentials,
        unlockStudentExamCredentials,
        updateSingleStudentCredential,
        saveExamSchedule,
        deleteExamSchedule,
        saveTeacherExamAssignment,
        deleteTeacherExamAssignment,
        updateStudentExamSessionStatus,
        resetStudentLoginSession,
        setActiveExamSession,
        toggleDisabledExamType,
        toggleAllExamsDisabled,
        updateExamManagementState,
        saveLitNumRecordsBatch,
        deleteLitNumRecord,
        saveRaporPendidikanDoc,
        deleteRaporPendidikanDoc,
        saveLitNumScheduleConfig,
        saveDailyAttendance,
        deleteDailyAttendance,
        saveDailyAttendanceBatch,
        clearAllDailyAttendances,
        saveGradeRecapSheet,
        deleteGradeRecapSheet,
        lockGradeRecapSheetFinal,
        unlockGradeRecapSheetAdmin,
        saveHistoricalLegerRecord,
        deleteHistoricalLegerRecord,
        selectedModule,
        setSelectedModule,
        activeExamTab,
        setActiveExamTab,
        activeLitNumTab,
        setActiveLitNumTab,
        activeSupervisiTab,
        setActiveSupervisiTab,
        handleSaveDraftReview,
        handleFinalizeExamScores,
        networkProfile,
        setNetworkPreference,
        simulateTeacherSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
