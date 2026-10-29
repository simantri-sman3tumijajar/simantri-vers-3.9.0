import React, { useState, useMemo, useCallback, memo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Users,
  GraduationCap,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  ScanEye,
  CheckCircle2,
  TrendingUp,
  Award,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Trophy,
  Medal,
  Crown,
  Star,
  Flame,
  CloudUpload,
  FolderCheck,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Clock,
  Camera,
  Activity,
  Bot,
  Megaphone,
  UploadCloud,
  Zap,
  LogOut,
  RefreshCw,
  SlidersHorizontal,
  Radio,
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportRaportToExcel } from '../utils/excelExport';
import { calculateDimensionProgress } from '../utils/dimensionMapper';
import { formatAcademicTitles, getKKTPKategori } from '../utils/kktpHelper';
import { resolveTeacherRealtimeActivity } from '../utils/teacherActivityHelper';
import { AuthenticProofModal } from './AuthenticProofModal';
import { AnnouncementsBanner } from './AnnouncementsBanner';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// 1. Memoized KPI Card Subcomponent
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
  highlightClass?: string;
}

const KPICard = memo<KPICardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColorClass,
  iconBgClass,
  highlightClass,
}) => (
  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500">{title}</span>
      <div className={`p-2 rounded-xl ${iconBgClass} ${iconColorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="mt-3">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className={`text-[11px] mt-0.5 ${highlightClass || 'text-slate-500'}`}>
        {subtitle}
      </div>
    </div>
  </div>
));
KPICard.displayName = 'KPICard';

// 2. Memoized Dimension Item Subcomponent
interface DimensionItemProps {
  label: string;
  progress: number;
  color: string;
}

const DimensionItem = memo<DimensionItemProps>(({ label, progress, color }) => (
  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
      <span className="truncate pr-1">{label}</span>
      <span className="text-indigo-600 shrink-0">{progress}%</span>
    </div>
    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${progress}%` }} />
    </div>
  </div>
));
DimensionItem.displayName = 'DimensionItem';

// 3. Memoized Assessment Table Row Subcomponent
interface AssessmentTableRowProps {
  id: string;
  jenis: 'ASAJ' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI';
  mataPelajaran: string;
  kelas: string;
  fase: string;
  guruPengampu: string;
  subCount: number;
  essayCount?: number;
  mcqCount?: number;
  onOpenGrading: (id: string) => void;
  onOpenRaport: (id: string) => void;
}

const AssessmentTableRow = memo<AssessmentTableRowProps>(({
  id,
  jenis,
  mataPelajaran,
  kelas,
  fase,
  guruPengampu,
  subCount,
  essayCount,
  mcqCount,
  onOpenGrading,
  onOpenRaport,
}) => (
  <tr className="hover:bg-slate-50/80 transition-colors">
    <td className="py-3 px-4">
      <span
        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
          jenis === 'ASAJ'
            ? 'bg-rose-100 text-rose-800'
            : jenis === 'DSMART'
            ? 'bg-emerald-100 text-emerald-800'
            : jenis === 'ASTS'
            ? 'bg-indigo-100 text-indigo-800'
            : 'bg-sky-100 text-sky-800'
        }`}
      >
        {jenis === 'ASAJ' ? 'ASAJ (Kelas XII)' : jenis === 'DSMART' ? "D'SMART (50 PG HOTS)" : jenis === 'ASTS' ? `${essayCount || 10} Essay` : `${mcqCount || 50} PG`}
      </span>
    </td>
    <td className="py-3 px-4 font-bold text-slate-900">{mataPelajaran}</td>
    <td className="py-3 px-4">
      <span className="font-semibold">{kelas}</span> • <span className="text-slate-500">{fase}</span>
    </td>
    <td className="py-3 px-4 text-slate-600">{formatAcademicTitles(guruPengampu)}</td>
    <td className="py-3 px-4 text-center">
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          subCount > 0
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${subCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {subCount} Siswa Terkoreksi
      </span>
    </td>
    <td className="py-3 px-4 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onOpenGrading(id)}
          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-all duration-200"
        >
          <ScanEye className="w-3.5 h-3.5" />
          <span>Pindai AI</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenRaport(id)}
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all duration-200"
          title="Lihat Format Raport STS"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Raport</span>
        </button>
      </div>
    </td>
  </tr>
));
AssessmentTableRow.displayName = 'AssessmentTableRow';

// Main DashboardOverview Component
export const DashboardOverview: React.FC = () => {
  const { state, currentUser, currentView, selectedModule, setCurrentView, setSelectedAssessmentId, setSelectedModule, simulateTeacherSession } = useApp();
  const { t } = useLanguage();

  const [showSimulatorPanel, setShowSimulatorPanel] = useState(false);
  const [selectedSimTeacherId, setSelectedSimTeacherId] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin';

  const isGuruBK = Boolean(
    currentUser?.isGuruBK ||
    currentUser?.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
    )
  );
  const isGuruMapel = Boolean(
    currentUser?.isGuruMapel ??
    (!isGuruBK || (currentUser?.mataPelajaran && currentUser?.mataPelajaran.filter((m) => !m.toLowerCase().includes('bimbingan')).length > 0))
  );

  React.useEffect(() => {
    if (isGuruBK && !isGuruMapel && !isAdmin && currentUser?.role !== 'kepala_sekolah') {
      setSelectedModule('bk-hebat');
      setCurrentView('bimbingan-konseling');
    }
  }, [isGuruBK, isGuruMapel, isAdmin, currentUser, setSelectedModule, setCurrentView]);

  // 1. Memoized relevant assessments based on role & assigned subjects
  const relevantAssessments = useMemo(() => {
    if (!state || !currentUser) return [];
    if (isAdmin) return state.assessments || [];
    return (state.assessments || []).filter(
      (a) =>
        Array.isArray(currentUser.mataPelajaran) &&
        (currentUser.mataPelajaran.includes(a.mataPelajaran) ||
          currentUser.mataPelajaran.includes('Semua Mata Pelajaran'))
    );
  }, [state?.assessments, currentUser, isAdmin]);

  // 2. Memoized analytics calculations
  const stats = useMemo(() => {
    if (!state) {
      return {
        totalStudents: 0,
        totalClasses: 0,
        totalAssessments: 0,
        totalSubmissions: 0,
        avgScore: 0,
        tuntasPercentage: 0,
      };
    }

    const totalStudents = state.students.length;
    const totalClasses = state.classes.length;
    const totalAssessments = state.assessments.length;

    let totalScoreSum = 0;
    let totalSubCount = 0;
    let tuntasCount = 0;

    relevantAssessments.forEach((asm) => {
      asm.submissions?.forEach((sub) => {
        totalScoreSum += sub.nilaiAkhir;
        totalSubCount += 1;
        if (sub.tuntas) tuntasCount += 1;
      });
    });

    const avgScore = totalSubCount > 0 ? Math.round(totalScoreSum / totalSubCount) : 0;
    const tuntasPercentage = totalSubCount > 0 ? Math.round((tuntasCount / totalSubCount) * 100) : 0;

    return {
      totalStudents,
      totalClasses,
      totalAssessments,
      totalSubmissions: totalSubCount,
      avgScore,
      tuntasPercentage,
    };
  }, [state, relevantAssessments]);

  // 3. Pre-calculated table items with student count map to avoid O(N*M) lookups in render
  const assessmentTableData = useMemo(() => {
    if (!state) return [];
    
    // Map of class name to student count for O(1) lookup
    const classCountMap: Record<string, number> = {};
    state.students.forEach((s) => {
      classCountMap[s.kelas] = (classCountMap[s.kelas] || 0) + 1;
    });

    return relevantAssessments.map((asm) => {
      const subCount = asm.submissions?.length || 0;
      const classStudentCount = asm.studentIds && asm.studentIds.length > 0
        ? asm.studentIds.length
        : (classCountMap[asm.kelas] || 0);
      const isComplete = classStudentCount > 0 && subCount >= classStudentCount;

      return {
        ...asm,
        subCount,
        classStudentCount,
        isComplete,
      };
    });
  }, [state?.students, relevantAssessments]);

  // 3b. Memoized data for Subject Distribution Chart (Reset to 0 until submissions are real-time graded)
  const subjectChartData = useMemo(() => {
    // 1. Gather all target subjects relevant to this user/role
    let targetSubjects: string[] = [];
    if (isAdmin) {
      if (state?.subjects && state.subjects.length > 0) {
        targetSubjects = state.subjects.map((s) => s.nama);
      } else if (relevantAssessments.length > 0) {
        targetSubjects = Array.from(new Set(relevantAssessments.map((a) => a.mataPelajaran)));
      } else {
        targetSubjects = ['Pendidikan Antikorupsi', 'Matematika', 'Bahasa Indonesia', 'Informatika'];
      }
    } else {
      // Guru Mapel: use their assigned subjects
      const userSubs = (currentUser?.mataPelajaran || []).filter((s) => s !== 'Semua Mata Pelajaran');
      if (userSubs.length > 0) {
        targetSubjects = userSubs;
      } else if (relevantAssessments.length > 0) {
        targetSubjects = Array.from(new Set(relevantAssessments.map((a) => a.mataPelajaran)));
      } else if (state?.subjects && state.subjects.length > 0) {
        targetSubjects = state.subjects.slice(0, 4).map((s) => s.nama);
      } else {
        targetSubjects = ['Mata Pelajaran Diampu'];
      }
    }

    // 2. Aggregate actual submission stats
    const subjectStats: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    
    // Initialize all target subjects with 0
    targetSubjects.forEach((mapel) => {
      subjectStats[mapel] = { sum: 0, count: 0, min: 0, max: 0 };
    });

    relevantAssessments.forEach((asm) => {
      const mapel = asm.mataPelajaran;
      if (!subjectStats[mapel]) {
        subjectStats[mapel] = { sum: 0, count: 0, min: 0, max: 0 };
      }
      asm.submissions?.forEach((sub) => {
        if (typeof sub.nilaiAkhir === 'number') {
          if (subjectStats[mapel].count === 0) {
            subjectStats[mapel].min = sub.nilaiAkhir;
            subjectStats[mapel].max = sub.nilaiAkhir;
          } else {
            if (sub.nilaiAkhir < subjectStats[mapel].min) subjectStats[mapel].min = sub.nilaiAkhir;
            if (sub.nilaiAkhir > subjectStats[mapel].max) subjectStats[mapel].max = sub.nilaiAkhir;
          }
          subjectStats[mapel].sum += sub.nilaiAkhir;
          subjectStats[mapel].count += 1;
        }
      });
    });

    // 3. Format into chart series with 0 as baseline if no submissions yet
    return Object.entries(subjectStats).map(([name, stat]) => ({
      name: name.length > 15 ? `${name.substring(0, 15)}...` : name,
      "Rata-Rata": stat.count > 0 ? Math.round(stat.sum / stat.count) : 0,
      "Tertinggi": stat.count > 0 ? stat.max : 0,
      "Terendah": stat.count > 0 ? stat.min : 0,
    }));
  }, [relevantAssessments, state?.subjects, isAdmin, currentUser]);

  // 3c. Memoized data for Competency Mastery Trend (Reset to 0 until submissions are real-time graded)
  const masteryTrendData = useMemo(() => {
    // If we have assessments created:
    if (relevantAssessments.length > 0) {
      const sorted = [...relevantAssessments]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(-6); // Last 6 assessments for progression

      return sorted.map((asm) => {
        const total = asm.submissions?.length || 0;
        const tuntas = asm.submissions?.filter((sub) => sub.tuntas).length || 0;
        const tuntasPercent = total > 0 ? Math.round((tuntas / total) * 100) : 0;
        const avgScore = total > 0 ? Math.round(asm.submissions.reduce((sum, sub) => sum + sub.nilaiAkhir, 0) / total) : 0;

        return {
          name: `${asm.jenis} ${asm.mataPelajaran.length > 10 ? asm.mataPelajaran.substring(0, 10) + '..' : asm.mataPelajaran} (${asm.kelas})`,
          "Ketuntasan (%)": tuntasPercent,
          "Rata-Rata": avgScore,
        };
      });
    }

    // Default baseline items with 0 for clean start
    if (isAdmin) {
      const defaultMapels = (state?.subjects && state.subjects.length > 0)
        ? state.subjects.slice(0, 4).map((s) => s.nama)
        : ['Pendidikan Antikorupsi', 'Matematika', 'Bahasa Indonesia', 'Informatika'];

      return defaultMapels.map((name) => ({
        name: name.length > 12 ? `${name.substring(0, 12)}...` : name,
        "Ketuntasan (%)": 0,
        "Rata-Rata": 0,
      }));
    } else {
      const userSubs = (currentUser?.mataPelajaran || []).filter((s) => s !== 'Semua Mata Pelajaran');
      const list = userSubs.length > 0 ? userSubs : ['Mata Pelajaran Diampu'];
      return list.map((name) => ({
        name: name.length > 12 ? `${name.substring(0, 12)}...` : name,
        "Ketuntasan (%)": 0,
        "Rata-Rata": 0,
      }));
    }
  }, [relevantAssessments, state?.subjects, isAdmin, currentUser]);

  const [selectedLeaderboardClass, setSelectedLeaderboardClass] = React.useState<string>('ALL');

  // Teacher subjects list
  const teacherSubjects = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return (state?.subjects || []).map((s) => s.nama);
    return (currentUser.mataPelajaran || []).filter((m) => m !== 'Semua Mata Pelajaran');
  }, [currentUser, isAdmin, state?.subjects]);

  const [selectedLeaderboardSubject, setSelectedLeaderboardSubject] = React.useState<string>('ALL');

  // 4b. Memoized Automatic Leaderboard: Top 3 Students with Highest Average Score per Class (Filtered by Teacher Subjects)
  const classLeaderboard = useMemo(() => {
    if (!state || !state.students || !state.classes) return [];

    // Filter assessments relevant to user & selected subject filter
    const leaderboardAssessments = (state.assessments || []).filter((asm) => {
      if (!isAdmin) {
        const isAssigned = (currentUser?.mataPelajaran || []).some(
          (m) => m.toLowerCase() === asm.mataPelajaran.toLowerCase() || m === 'Semua Mata Pelajaran'
        );
        if (!isAssigned) return false;
      }
      if (selectedLeaderboardSubject !== 'ALL') {
        return asm.mataPelajaran.toLowerCase() === selectedLeaderboardSubject.toLowerCase();
      }
      return true;
    });

    // Map student ID and student Name to their aggregated assessment records
    const studentScoresMap: Record<
      string,
      { total: number; count: number; max: number; bestSubj: string; tuntasCount: number }
    > = {};

    leaderboardAssessments.forEach((asm) => {
      asm.submissions?.forEach((sub) => {
        const key = sub.studentId || sub.studentName;
        if (!studentScoresMap[key]) {
          studentScoresMap[key] = {
            total: 0,
            count: 0,
            max: 0,
            bestSubj: asm.mataPelajaran,
            tuntasCount: 0,
          };
        }
        const record = studentScoresMap[key];
        record.total += sub.nilaiAkhir;
        record.count += 1;
        if (sub.nilaiAkhir >= record.max) {
          record.max = sub.nilaiAkhir;
          record.bestSubj = asm.mataPelajaran;
        }
        if (sub.tuntas) record.tuntasCount += 1;
      });
    });

    // Group students by class and calculate their average score
    const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return state.classes.map((cls) => {
      const classStudents = state.students.filter((s) => cleanCanonical(s.kelas) === cleanCanonical(cls.nama));

      const scoredStudents = classStudents.map((s) => {
        const stats = studentScoresMap[s.id] || studentScoresMap[s.nama] || {
          total: 0,
          count: 0,
          max: 0,
          bestSubj: '-',
          tuntasCount: 0,
        };

        const avg = stats.count > 0 ? Number((stats.total / stats.count).toFixed(1)) : 0;

        return {
          id: s.id,
          nama: s.nama,
          nisn: s.nisn,
          noUrut: s.noUrut,
          kelas: s.kelas,
          avgScore: avg,
          totalAssessments: stats.count,
          highestScore: stats.max,
          bestSubject: stats.bestSubj,
          tuntasCount: stats.tuntasCount,
        };
      });

      // Sort descending by average score, then total assessments, then highest score
      scoredStudents.sort((a, b) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        if (b.totalAssessments !== a.totalAssessments) return b.totalAssessments - a.totalAssessments;
        if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
        return a.nama.localeCompare(b.nama);
      });

      // Top 3 students
      const topStudents = scoredStudents.slice(0, 3);

      return {
        kelas: cls.nama,
        fase: cls.fase,
        waliKelas: cls.waliKelas,
        totalStudents: classStudents.length,
        topStudents,
      };
    });
  }, [state, isAdmin, currentUser, selectedLeaderboardSubject]);

  // Filtered classes for the leaderboard view
  const displayLeaderboard = useMemo(() => {
    if (selectedLeaderboardClass === 'ALL') return classLeaderboard;
    return classLeaderboard.filter((c) => c.kelas === selectedLeaderboardClass);
  }, [classLeaderboard, selectedLeaderboardClass]);

  // 5. Dynamic Deep Learning Dimensions progress calculation (starts at 0% and increases as student answer sheets are scanned and graded)
  const dimensiList = useMemo(() => {
    if (!state) return [];
    return calculateDimensionProgress(relevantAssessments, state.students);
  }, [state, relevantAssessments]);

  // 5. Callback handlers for responsive actions
  const [selectedProofData, setSelectedProofData] = useState<{
    submission: any;
    assessment: any;
    student?: any;
  } | null>(null);
  const [proofFilter, setProofFilter] = useState<'ALL' | 'DRAFT' | 'GRADED'>('ALL');
  const [maxProofCards, setMaxProofCards] = useState<number>(18);
  const [isUploadSTSModalOpen, setIsUploadSTSModalOpen] = useState(false);

  // Real-time teacher work and draft activity monitor (Strict real-time filtering)
  const activeTeachersWorking = useMemo(() => {
    if (!state?.teachers || !state?.assessments) return [];

    return state.teachers
      .map((t) => {
        const teacherAsms = (state.assessments || []).filter(
          (a) =>
            a.guruId === t.id ||
            a.guruPengampu === t.nama ||
            (Array.isArray(t.mataPelajaran) &&
              t.mataPelajaran.some(
                (m) =>
                  m &&
                  m !== 'Semua Mata Pelajaran' &&
                  m.toLowerCase().trim() === a.mataPelajaran.toLowerCase().trim()
              ))
        );

        let totalGraded = 0;
        let totalDrafts = 0;
        let totalPhotos = 0;
        let latestTime = t.lastActive || t.lastLogin || '';

        teacherAsms.forEach((a) => {
          (a.submissions || []).forEach((s) => {
            const isDraft =
              (s.statusKoreksi || '').toLowerCase().includes('draf') ||
              (s.statusKoreksi || '').toLowerCase().includes('draft') ||
              (s.statusKoreksi || '').toLowerCase().includes('citra terunggah');
            if (isDraft) {
              totalDrafts++;
            } else if (s.nilaiAkhir > 0 || s.statusKoreksi) {
              totalGraded++;
            }

            const pCount =
              Array.isArray(s.scannedImages) && s.scannedImages.length > 0
                ? s.scannedImages.length
                : s.scannedImage
                ? 1
                : 0;
            totalPhotos += pCount;

            if (s.waktuKoreksi && s.waktuKoreksi > latestTime) {
              latestTime = s.waktuKoreksi;
            }
          });
        });

        // =========================================================================
        // STRICT DETERMINISTIC REAL-TIME VERIFICATION:
        // 1. Akun MUST be currently online (t.status === 'online').
        // 2. Akun MUST have an active valid session (is local currentUser OR recent heartbeat < 2.5 mins).
        // 3. Akun MUST be currently active in the 'sumatif' module (Asesmen & Draf).
        //    If the teacher logs out, or switches to another module ('portal', 'cbt', 'bk', etc.),
        //    they are immediately and automatically removed from this monitor ("hilang dengan sendirinya").
        // =========================================================================
        const isCurrentLocalUser = t.id === currentUser?.id;
        const effectiveModule = isCurrentLocalUser ? selectedModule : (t.activeModule || 'sumatif');
        const isOnline = t.status === 'online';

        // Check if active in assessment/sumatif module
        const isInSumatifModule = effectiveModule === 'sumatif';

        // Check if recent session exists
        const isRecent = isCurrentLocalUser || (
          t.lastActive && (Date.now() - new Date(t.lastActive).getTime() < 150000)
        );

        const isTrulyActiveInAssessmentModule = Boolean(isOnline && isInSumatifModule && isRecent);

        // Determine authentic real-time activity without generic placeholders
        const liveInfo = resolveTeacherRealtimeActivity(
          t,
          state,
          currentUser,
          selectedModule,
          currentView
        );

        // Target primary assessment for direct navigation
        const activeAsm = (t.activeAssessmentId && state.assessments.find((a) => a.id === t.activeAssessmentId)) || teacherAsms[0] || null;

        return {
          teacher: t,
          assessments: teacherAsms,
          activeAsm,
          totalGraded,
          totalDrafts,
          totalPhotos,
          latestTime,
          recentWork: t.recentWork,
          currentActivity: liveInfo.activity,
          moduleName: liveInfo.moduleName,
          timeAgoText: liveInfo.timeAgoText,
          detailBadge: liveInfo.detailBadge,
          isOnline: isTrulyActiveInAssessmentModule,
          isTrulyActiveInAssessmentModule,
        };
      })
      .filter((item) => item.isTrulyActiveInAssessmentModule)
      .sort((a, b) => b.totalGraded + b.totalDrafts - (a.totalGraded + a.totalDrafts));
  }, [state?.teachers, state?.assessments, currentUser?.id, selectedModule, currentView]);

  const incomingFeedbacks = useMemo(() => {
    return state?.feedbacks || [];
  }, [state?.feedbacks]);

  const recentSavedItems = useMemo(() => {
    if (!state) return [];
    const items: Array<{
      submission: any;
      assessment: any;
      student?: any;
      isDraft: boolean;
    }> = [];

    (relevantAssessments || []).forEach((asm) => {
      (asm.submissions || []).forEach((sub) => {
        const isDraft =
          (sub.statusKoreksi || '').toLowerCase().includes('draf') ||
          (sub.statusKoreksi || '').toLowerCase().includes('draft') ||
          (sub.statusKoreksi || '').toLowerCase().includes('citra terunggah');

        const std = state.students.find(
          (s) => s.id === sub.studentId || s.nama.toLowerCase() === sub.studentName?.toLowerCase()
        );

        items.push({
          submission: sub,
          assessment: asm,
          student: std,
          isDraft,
        });
      });
    });

    items.sort((a, b) => {
      const timeA = a.submission.waktuKoreksi || '';
      const timeB = b.submission.waktuKoreksi || '';
      return timeB.localeCompare(timeA);
    });

    return items;
  }, [state, relevantAssessments]);

  const filteredRecentItems = useMemo(() => {
    if (proofFilter === 'DRAFT') return recentSavedItems.filter((it) => it.isDraft);
    if (proofFilter === 'GRADED') return recentSavedItems.filter((it) => !it.isDraft);
    return recentSavedItems;
  }, [recentSavedItems, proofFilter]);

  const handleOpenRaport = useCallback((assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setCurrentView('raport-sts');
  }, [setSelectedAssessmentId, setCurrentView]);

  const handleOpenGrading = useCallback((assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setCurrentView('mass-grading');
  }, [setSelectedAssessmentId, setCurrentView]);

  const handleNavigateToGrading = useCallback(() => {
    setCurrentView('mass-grading');
  }, [setCurrentView]);

  const handleNavigateToAssessments = useCallback(() => {
    setCurrentView('assessments');
  }, [setCurrentView]);

  if (!state || !currentUser) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tahun Ajaran {state.schoolInfo.tahunAjaranAktif} • Semester {state.schoolInfo.semesterAktif}</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {currentUser.nama}!
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Sistem Asesmen Sumatif Tengah Semester (ASTS) & Asesmen Sumatif Akhir Semester (ASAS) SMAN 3 Tumijajar terintegrasi AI Vision Ultra-Tinggi dan Kerangka Pembelajaran Mendalam.
          </p>
        </div>
      </div>

      {/* Announcements Banner */}
      <AnnouncementsBanner
        targetRole={currentUser.role === 'admin' ? 'admin' : currentUser.role === 'guru' ? 'guru' : 'siswa'}
      />

      {/* KPI Stats Grid with Memoized Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('dashboard.total_students', 'Total Siswa Terdata')}
          value={stats.totalStudents}
          subtitle={`di ${stats.totalClasses} Rombel Kelas`}
          icon={Users}
          iconColorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
        />

        <KPICard
          title={t('dashboard.total_assessments', 'Modul Asesmen Aktif')}
          value={relevantAssessments.length}
          subtitle="ASTS (Essay) & ASAS (PG)"
          icon={FileQuestion}
          iconColorClass="text-sky-600"
          iconBgClass="bg-sky-50"
        />

        <KPICard
          title={t('dashboard.completion_rate', 'Lembar Terkoreksi')}
          value={stats.totalSubmissions}
          subtitle={`${stats.tuntasPercentage}% ${t('grading.passed', 'Tuntas')}`}
          icon={CheckCircle2}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
          highlightClass="text-emerald-600 font-semibold"
        />

        <KPICard
          title={t('dashboard.avg_score', 'Rata-rata Nilai')}
          value={stats.avgScore > 0 ? stats.avgScore : '-'}
          subtitle={t('dashboard.subject_kktp', 'KKTP Sesuai Mata Pelajaran')}
          icon={Award}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50"
        />
      </div>


      {/* 1. MONITOR REAL-TIME AKTIVITAS GURU MAPEL & PROGRESS DRAF */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-sky-50/30 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Activity className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Monitor Real-Time Aktivitas Guru Mapel & Progress Draf Pengerjaan
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Terarsip
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bukti verifikasi bahwa beberapa akun guru mapel aktif mengerjakan penilaian, melampirkan foto scan kamera HP, dan menyimpan draf pengerjaan ke cloud.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimulatorPanel(!showSimulatorPanel)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showSimulatorPanel
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title="Buka panel simulasi untuk menguji deteksi login, ganti modul, dan logout akun secara instan"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Uji Sesi Real-Time</span>
            </button>
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeTeachersWorking.length} Akun Aktif</span>
            </span>
          </div>
        </div>

        {/* Interactive Session Simulator / Quick Tester Bar for Admin & Verification */}
          {showSimulatorPanel && (
            <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      Penguji Respon Real-Time Akun Guru
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live Auto-Detect
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Uji pembuktian: saat akun <strong>Login</strong> akan terdeteksi seketika; saat <strong>Ganti Modul</strong> atau <strong>Logout</strong>, akun otomatis hilang dari monitor.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedSimTeacherId}
                    onChange={(e) => setSelectedSimTeacherId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Pilih Guru Mapel ({state?.teachers?.length || 0}) --</option>
                    {(state?.teachers || []).map((tch) => {
                      const isCurrentlyActive = activeTeachersWorking.some((a) => a.teacher.id === tch.id);
                      return (
                        <option key={tch.id} value={tch.id}>
                          {isCurrentlyActive ? '🟢' : '⚪'} {tch.nama} ({tch.mataPelajaran?.[0] || 'Guru'})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedSimTeacherId}
                    onClick={() => {
                      if (!selectedSimTeacherId) return;
                      simulateTeacherSession?.(
                        selectedSimTeacherId,
                        'login',
                        'sumatif',
                        'Sedang Mengoreksi Draf Jawaban & Nilai Siswa'
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Simulasikan login akun ini ke Modul Asesmen"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Login ke Asesmen</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedSimTeacherId}
                    onClick={() => {
                      if (!selectedSimTeacherId) return;
                      simulateTeacherSession?.(selectedSimTeacherId, 'switch_module', 'portal');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Simulasikan guru berpindah modul ke Portal (harus otomatis hilang dari monitor)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti Modul (Hilang)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedSimTeacherId}
                    onClick={() => {
                      if (!selectedSimTeacherId) return;
                      simulateTeacherSession?.(selectedSimTeacherId, 'logout');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Simulasikan logout sesi akun ini (harus otomatis hilang dari monitor)"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout (Hilang)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTeachersWorking.length > 0 ? (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTeachersWorking.map((item) => {
                const t = item.teacher;
                const primaryAsm = item.activeAsm || item.assessments[0];
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Teacher Profile Header with live pulse */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-13 rounded-[50%] overflow-hidden border-2 border-indigo-300 bg-slate-100 shadow-2xs flex items-center justify-center">
                              {t.fotoUrl ? (
                                <img
                                  src={t.fotoUrl}
                                  alt={t.nama}
                                  className="w-full h-full object-cover object-top"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <GraduationCap className="w-5 h-5 text-indigo-500" />
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                              {t.nama}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              NIP: {t.nip || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            ONLINE
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">
                            {item.moduleName || 'Modul Asesmen'}
                          </span>
                        </div>
                      </div>

                      {/* Real-time Activity Banner */}
                      <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 text-[11px] font-bold flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                          </span>
                          <span className="truncate">{item.currentActivity}</span>
                        </div>
                        {item.timeAgoText && (
                          <span className="text-[9px] font-mono font-medium text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded shrink-0">
                            {item.timeAgoText}
                          </span>
                        )}
                      </div>

                      {/* Subject Badges */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {(t.mataPelajaran || []).slice(0, 2).map((m: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate max-w-[140px]"
                            title={m}
                          >
                            {m}
                          </span>
                        ))}
                        {(t.mataPelajaran || []).length > 2 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-slate-400 whitespace-nowrap">
                            +{(t.mataPelajaran || []).length - 2} mapel
                          </span>
                        )}
                      </div>

                      {/* Real assessment subject & class reference */}
                      {primaryAsm ? (
                        <div className="mt-2.5 p-2 rounded-xl bg-indigo-50/70 border border-indigo-150 text-indigo-950 text-[10.5px] font-semibold flex items-start gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {primaryAsm.mataPelajaran} • Kelas {primaryAsm.kelas} ({primaryAsm.jenis})
                          </span>
                        </div>
                      ) : t.activeAssessmentInfo ? (
                        <div className="mt-2.5 p-2 rounded-xl bg-indigo-50/70 border border-indigo-150 text-indigo-950 text-[10.5px] font-semibold flex items-start gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{t.activeAssessmentInfo}</span>
                        </div>
                      ) : null}

                      {/* Work Statistics & Draft Progress Pills */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.totalGraded} Lembar Dinilai</span>
                        </span>

                        {item.totalDrafts > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold whitespace-nowrap shadow-xs">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>{item.totalDrafts} Draf Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>0 Draf</span>
                          </span>
                        )}

                        {item.totalPhotos > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-extrabold whitespace-nowrap">
                            <Camera className="w-3 h-3 text-sky-600" />
                            <span>{item.totalPhotos} Foto Scan</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-extrabold whitespace-nowrap">
                          <FileQuestion className="w-3 h-3 text-indigo-600" />
                          <span>{item.assessments.length} Paket Asesmen</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions & Quick Testing */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {item.latestTime ? `Update: ${item.latestTime.substring(0, 16)}` : 'Sesi Aktif Real-Time'}
                        </span>

                        {primaryAsm ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssessmentId(primaryAsm.id);
                              setCurrentView('mass-grading');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] cursor-pointer shadow-xs transition-all"
                          >
                            <span>Lihat Lembar Nilai / Draf</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sesi Aktif</span>
                        )}
                      </div>

                      {/* Quick Module Switch / Logout Trigger for Testing */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => simulateTeacherSession?.(t.id, 'switch_module', 'portal')}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 border border-slate-200 transition-colors cursor-pointer font-semibold"
                          title="Uji: Pindah ke portal lain, akun akan langsung hilang dari monitor"
                        >
                          Ganti Modul
                        </button>
                        <button
                          type="button"
                          onClick={() => simulateTeacherSession?.(t.id, 'logout')}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-800 border border-slate-200 transition-colors cursor-pointer font-semibold"
                          title="Uji: Logout sesi, akun akan langsung hilang dari monitor"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 m-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Activity className="w-6 h-6 animate-pulse text-indigo-600" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Belum Ada Sesi Login Guru Mapel yang Terdeteksi Aktif
              </h4>
              <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
                Monitor ini secara akurat hanya menampilkan akun guru yang <strong className="text-slate-800">benar-benar sedang aktif masuk (login) ke Modul Asesmen</strong>. Ketika guru melakukan <em>Logout</em> atau <em>Ganti Modul</em>, akun tersebut secara otomatis hilang dari monitor ini.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstTch = state?.teachers?.[0];
                    if (firstTch) {
                      simulateTeacherSession?.(
                        firstTch.id,
                        'login',
                        'sumatif',
                        'Sedang Mengoreksi Draf Jawaban & Nilai Siswa'
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Uji Coba Deteksi 1 Akun Guru Aktif</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSimulatorPanel(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Buka Panel Pengujian Sesi</span>
                </button>
              </div>
            </div>
          )}
        </div>

      {/* 2. ASPIRASI & UMPAN BALIK GURU MAPEL */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-indigo-50/25 to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Aspirasi & Umpan Balik Guru Mapel
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                  {incomingFeedbacks.length} Pesan Masuk
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kanal resmi aspirasi dan masukan dari seluruh guru mapel yang terintegrasi secara real-time ke sistem admin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView(currentUser.role === 'guru' ? 'feedback' : 'feedback-center')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all self-start sm:self-auto"
          >
            <span>{currentUser.role === 'guru' ? 'Kirim Umpan Balik Guru' : 'Buka Pusat Umpan Balik'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {incomingFeedbacks.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Belum Ada Masukan Baru Yang Masuk</p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
              Setiap catatan, kendala, atau saran yang dikirimkan oleh guru mapel melalui menu Umpan Balik Guru akan langsung tercatat dan diarsipkan di sini secara real-time.
            </p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomingFeedbacks.slice(0, 6).map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {fb.kategori}
                    </span>

                    <span
                      className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md border ${
                        fb.status === 'Baru'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : fb.status === 'Ditinjau'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                      }`}
                    >
                      {fb.status}
                    </span>
                  </div>

                  <h4 className="mt-2.5 font-bold text-xs text-slate-900 line-clamp-1">
                    {fb.judul}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    "{fb.pesan}"
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold text-[10.5px] text-slate-900 truncate">
                      {fb.teacherName}
                    </p>
                    <p className="text-[9.5px] text-slate-400 font-mono">
                      {fb.createdAt ? fb.createdAt.substring(0, 10) : 'Terkini'}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < (fb.rating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ARSIP BUKTI OTENTIK & DRAF KOREKSI TERSIMPAN TERKINI */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Bukti Otentik & Draf Koreksi Tersimpan Terkini
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {recentSavedItems.length} Terdata
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Data pekerjaan koreksi guru tertanam di sistem dan dapat diverifikasi langsung dengan bukti otentiknya
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setProofFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                proofFilter === 'ALL'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({recentSavedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setProofFilter('DRAFT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                proofFilter === 'DRAFT'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draf Tersimpan ({recentSavedItems.filter((i) => i.isDraft).length})
            </button>
            <button
              type="button"
              onClick={() => setProofFilter('GRADED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                proofFilter === 'GRADED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Terverifikasi ({recentSavedItems.filter((i) => !i.isDraft).length})
            </button>
          </div>
        </div>

        {/* Content Cards */}
        {filteredRecentItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada data koreksi atau draf tersimpan yang cocok dengan filter aktif.
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRecentItems.slice(0, maxProofCards).map((item, idx) => {
              const sub = item.submission;
              const asm = item.assessment;
              const std = item.student;
              const kktpInfo = getKKTPKategori(sub.nilaiAkhir);
              const hasPhotos = !!(
                (Array.isArray(sub.scannedImages) && sub.scannedImages.length > 0) ||
                sub.scannedImage
              );
              const photoCount = Array.isArray(sub.scannedImages) && sub.scannedImages.length > 0
                ? sub.scannedImages.length
                : sub.scannedImage
                ? 1
                : 0;

              return (
                <div
                  key={`${asm.id}-${sub.id || idx}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    item.isDraft
                      ? 'bg-gradient-to-br from-amber-50/50 to-white border-amber-200/80 shadow-2xs'
                      : 'bg-gradient-to-br from-slate-50/60 to-white border-slate-200/90 shadow-2xs hover:border-indigo-300'
                  }`}
                >
                  <div>
                    {/* Header: Status & Type */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            asm.jenis === 'ASTS'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {asm.jenis}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
                            item.isDraft
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {item.isDraft ? 'DRAF SAH' : 'TERVERIFIKASI'}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {sub.waktuKoreksi || 'Tersimpan'}
                      </span>
                    </div>

                    {/* Student & Subject info */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-900 uppercase truncate">
                        {sub.studentName || std?.nama || 'Peserta Didik'}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">Kelas {sub.kelas || asm.kelas}</span>
                        <span>•</span>
                        <span className="truncate">{asm.mataPelajaran}</span>
                      </p>
                    </div>

                    {/* Artifact indicator pills */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[9.5px]">
                      {hasPhotos ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-extrabold">
                          <CloudUpload className="w-3 h-3 text-indigo-600" />
                          <span>{photoCount} Lembar Foto</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Transkripsi Butir</span>
                        </span>
                      )}

                      {sub.itemScores && sub.itemScores.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          <span>{sub.itemScores.length} Butir Dinilai</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score & Action Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        {item.isDraft ? 'Skor Draf' : 'Nilai Akhir'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-black text-slate-900">{sub.nilaiAkhir}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${kktpInfo.badgeClass}`}>
                          {kktpInfo.kategori}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedProofData({ submission: sub, assessment: asm, student: std })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold text-xs cursor-pointer transition-colors shadow-2xs"
                        title="Lihat Bukti Otentik Lembar Jawaban & Rincian Butir"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Bukti Otentik</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssessmentId(asm.id);
                          setCurrentView('mass-grading');
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                        title="Buka Modul Koreksi"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredRecentItems.length > maxProofCards && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setMaxProofCards((prev) => prev + 18)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-indigo-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              Tampilkan {Math.min(18, filteredRecentItems.length - maxProofCards)} Data Koreksi / Draf Berikutnya (Sisa {filteredRecentItems.length - maxProofCards})
            </button>
          </div>
        )}
      </div>

      {/* Recharts Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Distribusi Nilai Per Mata Pelajaran */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Distribusi Nilai Per Mata Pelajaran
            </h3>
            <p className="text-[11px] text-slate-500">
              Perbandingan Nilai Rata-Rata, Nilai Tertinggi, dan Terendah per-Mapel yang diampu
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }} 
                />
                <Legend iconSize={8} iconType="circle" />
                <Bar dataKey="Rata-Rata" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tertinggi" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Terendah" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Tren Capaian Kompetensi */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Tren Persentase Ketuntasan Siswa
            </h3>
            <p className="text-[11px] text-slate-500">
              Perkembangan keterserapan materi dan tingkat ketuntasan (%) dari waktu ke waktu
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={masteryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorKetuntasan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }} 
                />
                <Legend iconSize={8} iconType="circle" />
                <Area type="monotone" dataKey="Ketuntasan (%)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKetuntasan)" />
                <Area type="monotone" dataKey="Rata-Rata" stroke="#6366f1" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deep Learning 8 Dimensions Summary */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              8 Dimensi Profil Lulusan Pembelajaran Mendalam
            </h3>
            <p className="text-xs text-slate-500">
              Penguatan karakter dan penalaran kritis peserta didik SMAN 3 Tumijajar
            </p>
          </div>
          <button
            onClick={handleNavigateToAssessments}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Buat Soal Berdimensi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {dimensiList.map((dim, idx) => (
            <DimensionItem
              key={idx}
              label={dim.label}
              progress={dim.progress}
              color={dim.color}
            />
          ))}
        </div>
      </div>

      {/* Class Leaderboard: Top 3 Students with Highest Average Score per Class */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/20">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Leaderboard Prestasi Siswa</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Top 3 Rata-rata Tertinggi
                  </span>
                  {!isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Mata Pelajaran Guru: {selectedLeaderboardSubject === 'ALL' ? `${teacherSubjects.length} Mapel Diampu` : selectedLeaderboardSubject}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {!isAdmin
                    ? 'Peringkat dihitung khusus dari capaian nilai mata pelajaran yang Anda ampu'
                    : 'Peringkat otomatis berdasarkan akumulasi nilai seluruh asesmen ASTS & ASAS per rombongan belajar'}
                </p>
              </div>
            </div>

            {/* Subject Selector for Guru Mapel / Admin */}
            {teacherSubjects.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Mata Pelajaran:</span>
                <button
                  type="button"
                  onClick={() => setSelectedLeaderboardSubject('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    selectedLeaderboardSubject === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isAdmin ? 'Semua Mata Pelajaran' : `Semua Mapel Saya (${teacherSubjects.length})`}
                </button>
                {teacherSubjects.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedLeaderboardSubject(subj)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      selectedLeaderboardSubject === subj
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Class Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedLeaderboardClass('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLeaderboardClass === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Kelas ({classLeaderboard.length})
            </button>
            {classLeaderboard.map((cls) => (
              <button
                key={cls.kelas}
                onClick={() => setSelectedLeaderboardClass(cls.kelas)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedLeaderboardClass === cls.kelas
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kelas {cls.kelas}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Cards Grid */}
        {displayLeaderboard.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            Belum ada data rombongan belajar (kelas) yang terdaftar di sistem.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayLeaderboard.map((group) => {
              const hasScoredStudents = group.topStudents.some((s) => s.totalAssessments > 0);

              return (
                <div
                  key={group.kelas}
                  className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-indigo-200 transition-colors"
                >
                  <div>
                    {/* Class Header */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-base">
                            Kelas {group.kelas}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {group.fase}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Wali Kelas: <strong className="text-slate-700 font-semibold">{group.waliKelas || '-'}</strong>
                        </p>
                      </div>

                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                        {group.totalStudents} Siswa
                      </span>
                    </div>

                    {/* Top 3 Students List */}
                    {!hasScoredStudents ? (
                      <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 px-4">
                        <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">Belum Ada Nilai Terkoreksi</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Lakukan koreksi lembar jawaban ASTS/ASAS untuk menampilkan peringkat otomatis.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {group.topStudents.map((std, rankIdx) => {
                          const isGold = rankIdx === 0;
                          const isSilver = rankIdx === 1;
                          const isBronze = rankIdx === 2;

                          return (
                            <div
                              key={std.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isGold
                                  ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-white border-amber-300 shadow-xs'
                                  : isSilver
                                  ? 'bg-gradient-to-r from-slate-200/40 via-slate-50/80 to-white border-slate-300 shadow-2xs'
                                  : 'bg-gradient-to-r from-orange-500/10 via-orange-50/60 to-white border-orange-300/80 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                {/* Rank & Avatar */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                                      isGold
                                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                                        : isSilver
                                        ? 'bg-slate-300 text-slate-800 ring-2 ring-slate-200'
                                        : 'bg-amber-700 text-white ring-2 ring-amber-600/30'
                                    }`}
                                    title={`Juara ${rankIdx + 1}`}
                                  >
                                    {isGold ? (
                                      <Crown className="w-4 h-4 fill-slate-950" />
                                    ) : isSilver ? (
                                      <Medal className="w-4 h-4" />
                                    ) : (
                                      <Star className="w-4 h-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`font-black text-xs uppercase truncate ${
                                          isGold ? 'text-slate-900' : 'text-slate-800'
                                        }`}
                                      >
                                        {std.nama}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                      <span>Absen {std.noUrut || '-'}</span>
                                      <span>•</span>
                                      <span className="truncate">
                                        {std.totalAssessments} Asesmen Diikuti
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Score & Status Badge */}
                                <div className="text-right shrink-0">
                                  <div
                                    className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-xl font-black text-xs shadow-2xs ${
                                      isGold
                                        ? 'bg-amber-500 text-slate-950'
                                        : isSilver
                                        ? 'bg-slate-800 text-white'
                                        : 'bg-amber-800 text-white'
                                    }`}
                                  >
                                    <span className="text-sm font-black">{std.avgScore > 0 ? std.avgScore : '-'}</span>
                                    <span className="text-[9px] font-normal opacity-90">Rata²</span>
                                  </div>
                                  {std.bestSubject && std.bestSubject !== '-' && (
                                    <div className="text-[9px] text-slate-500 mt-1 font-semibold truncate max-w-[100px]">
                                      Max: {std.highestScore} ({std.bestSubject})
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Note */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-indigo-600">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>KKTP Sesuai Ketentuan Tiap Mapel</span>
                    </span>
                    <button
                      onClick={() => handleNavigateToGrading()}
                      className="font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Koreksi Siswa</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Assessments Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {t('dashboard.recent_assessments', 'Daftar Asesmen Aktif (ASTS & ASAS)')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('dashboard.subtitle', 'Monitoring pengoreksian dan rekapitulasi nilai raport')}
            </p>
          </div>
          <button
            onClick={handleNavigateToAssessments}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
          >
            + {t('action.create_new', 'Tambah Asesmen Baru')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{t('Jenis', 'Jenis')}</th>
                <th className="py-3 px-4">{t('assessment.subject', 'Mata Pelajaran')}</th>
                <th className="py-3 px-4">{t('assessment.class', 'Kelas & Fase')}</th>
                <th className="py-3 px-4">{t('assessment.teacher', 'Guru Pengampu')}</th>
                <th className="py-3 px-4 text-center">{t('Status Koreksi', 'Status Koreksi')}</th>
                <th className="py-3 px-4 text-right">{t('Aksi Cepat', 'Aksi Cepat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {assessmentTableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada modul asesmen aktif. Klik "+ Tambah Asesmen Baru" untuk membuat soal ASTS/ASAS.
                  </td>
                </tr>
              ) : (
                assessmentTableData.map((asm) => (
                  <AssessmentTableRow
                    key={asm.id}
                    id={asm.id}
                    jenis={asm.jenis}
                    mataPelajaran={asm.mataPelajaran}
                    kelas={asm.kelas}
                    fase={asm.fase}
                    guruPengampu={asm.guruPengampu}
                    subCount={asm.subCount}
                    essayCount={asm.essayRubrik?.length}
                    mcqCount={asm.mcqQuestions?.length}
                    onOpenGrading={handleOpenGrading}
                    onOpenRaport={handleOpenRaport}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authentic Proof Modal (Dokumen Bukti Otentik Penilaian Siswa) */}
      {selectedProofData && (
        <AuthenticProofModal
          submission={selectedProofData.submission}
          assessment={selectedProofData.assessment}
          student={selectedProofData.student}
          schoolInfo={state.schoolInfo}
          onClose={() => setSelectedProofData(null)}
          onOpenGrading={() => {
            setSelectedAssessmentId(selectedProofData.assessment.id);
            setCurrentView('mass-grading');
          }}
        />
      )}

      {/* Modal Upload & Impor Nilai Rapor STS */}
      {isUploadSTSModalOpen && (
        <UploadRaporSTSModal
          isOpen={isUploadSTSModalOpen}
          onClose={() => setIsUploadSTSModalOpen(false)}
          onSuccessSync={() => {
            setCurrentView('student-grades');
          }}
        />
      )}
    </div>
  );
};
