import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider, useApp } from './context/AppContext';
import { AutosaveProvider } from './context/AutosaveContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { LoginAdminView } from './components/LoginAdminView';
import { LoginGtkView } from './components/LoginGtkView';
import { ProctorMonitorDashboard } from './components/ProctorMonitorDashboard';
import { DashboardOverview } from './components/DashboardOverview';
import { MassGradingView } from './components/MassGradingView';
import { AssessmentBankView } from './components/AssessmentBankView';
import { ItemAnalysisView } from './components/ItemAnalysisView';
import { RaportSTSView } from './components/RaportSTSView';
import { StudentGradesRosterView } from './components/StudentGradesRosterView';
import { RekapNilaiLegerModule } from './components/RekapNilaiLegerModule';
import { RekapNilaiDashboardView } from './components/RekapNilaiDashboardView';
import { MasterStudentsView } from './components/MasterStudentsView';
import { MasterTeachersView } from './components/MasterTeachersView';
import { MasterClassSubjectView } from './components/MasterClassSubjectView';
import { TeacherFeedbackView } from './components/TeacherFeedbackView';
import { AdminFeedbackManagementView } from './components/AdminFeedbackManagementView';
import { AdminAnnouncementManagementView } from './components/AdminAnnouncementManagementView';
import { AdminDeveloperHub } from './components/AdminDeveloperHub';
import { BeritaAcaraView } from './components/BeritaAcaraView';
import { ArchivesView } from './components/ArchivesView';
import { AcademicCalendarView } from './components/AcademicCalendarView';
import { KepalaSekolahSupervisionView } from './components/KepalaSekolahSupervisionView';
import { PortalSelectionView } from './components/PortalSelectionView';
import { RoleGatewayView } from './components/RoleGatewayView';
import { StudentPortalView } from './components/StudentPortalView';
import { BimbinganKonselingView } from './components/BimbinganKonselingView';
import { LitNumManagementView } from './components/LitNumManagementView';
import { ExamManagementView } from './components/ExamManagementView';
import { ExamManagementDashboardView } from './components/ExamManagementDashboardView';
import { ExamTokenView } from './components/ExamTokenView';
import { ExamCredentialsView } from './components/ExamCredentialsView';
import { ExamCardsView } from './components/ExamCardsView';
import { ExamSchedulesView } from './components/ExamSchedulesView';
import { ExamAssignmentsView } from './components/ExamAssignmentsView';
import { ExamAttendanceView } from './components/ExamAttendanceView';
import { ExamSecurityManager } from './components/ExamSecurityManager';
import { ExamMultiClassRoomsView } from './components/ExamMultiClassRoomsView';
import { ExamProctorScheduleView } from './components/ExamProctorScheduleView';
import { MobileProctorMonitorView } from './components/MobileProctorMonitorView';
import { TugasHarianView } from './components/TugasHarianView';
import { StudentAttendanceView } from './components/StudentAttendanceView';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { DeepLearningGuideModal } from './components/DeepLearningGuideModal';
import { TemplateGuideModal } from './components/TemplateGuideModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { ChangeModuleConfirmModal } from './components/ChangeModuleConfirmModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { ToastContainer } from './components/Toast';
import { DigitalVerificationModal } from './components/DigitalVerificationModal';
import { parseVerificationDataFromUrl, VerificationData } from './utils/authenticProofHelper';
import { StandaloneSupervisorPortal } from './components/StandaloneSupervisorPortal';
import { canUserAccessSupervisorPortal, isUserAdminOrOperator, isUserProctor } from './types';
import { FooterDisclaimer } from './components/FooterDisclaimer';
import { MobileUploadView } from './components/MobileUploadView';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { GlobalLoadingIndicator } from './components/GlobalLoadingIndicator';
import { ChromePCAutoInstallPrompt } from './components/ChromePCAutoInstallPrompt';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import {
  Loader2,
  PanelLeftOpen,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import { getPathnameFromView, getPathnameFromModule, PATH_TO_VIEW_MAP, isPortalPath, resolveRouteFromUrl } from './utils/urlRouter';
import { safeGetItem, safeRemoveItem } from './utils/safeStorage';
import { scrollToTop, useAutoScrollToTop } from './utils/scrollHelper';

const MainAppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, currentUser, setCurrentUser, currentView, setCurrentView, loading, showToast, selectedModule, setSelectedModule, clearAllFeedbacks } = useApp();

  // Periodic & automatic smooth scroll-to-top whenever routes, modules, or views change across the system
  useAutoScrollToTop([location.pathname, currentView, selectedModule], { smooth: true });

  // =========================================================================
  // ACCESS GUARD: PROTEKSI AKSES FITUR PENGAWAS UJIAN (CBT UMUM)
  // Otomatis menutup sesi pengawas bagi Guru/GTK dan mengembalikan ke Dashboard Reguler
  // jika Mode Ujian Umum dinonaktifkan atau izin pengawas guru dicabut oleh Admin/Operator
  // =========================================================================
  useEffect(() => {
    if (!currentUser) return;
    const isSpecialUser = isUserAdminOrOperator(currentUser) || isUserProctor(currentUser);

    if (isSpecialUser) return; // Administrator, Operator, & Proktor senantiasa memiliki kendali penuh

    const proctorViews = ['exam-proctor-mobile', 'proctor-monitor', 'exam-proctor-monitor', 'standalone-supervisor'];
    const isProctorViewActive = proctorViews.includes(currentView);
    const isProctorRouteActive =
      location.pathname.startsWith('/manajemen-ujian/proctor') ||
      location.pathname.startsWith('/manajemen-ujian/monitor-mobile') ||
      location.pathname === '/pengawas-cbt' ||
      location.pathname === '/proctor' ||
      location.pathname === '/portal-pengawas' ||
      location.pathname === '/pengawas';

    if (isProctorViewActive || isProctorRouteActive || selectedModule === 'pengawas') {
      const liveTeacher = state?.teachers?.find((t) => t.id === currentUser.id) || currentUser;
      const canAccess = canUserAccessSupervisorPortal(liveTeacher, state?.schoolInfo);

      if (!canAccess) {
        setSelectedModule('portal');
        setCurrentView('dashboard');
        navigate('/portal', { replace: true });
        showToast(
          'Akses Pengawas Terkunci',
          'Izin akses Pengawas Ujian CBT saat ini ditutup atau belum diaktifkan oleh Admin, Operator, atau Proktor.',
          'warning'
        );
      }
    }
  }, [
    state?.schoolInfo?.globalProctorMode,
    state?.schoolInfo?.cbtSupervisorConfig,
    state?.teachers,
    currentUser,
    currentView,
    selectedModule,
    location.pathname,
    navigate,
    setCurrentView,
    setSelectedModule,
    showToast,
  ]);


  const searchParams = new URLSearchParams(window.location.search);
  const isMobileUpload = searchParams.get('mode') === 'mobile-upload';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    return localStorage.getItem('smantri_sidebar_hidden') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeepLearningOpen, setIsDeepLearningOpen] = useState(false);
  const [isTemplateGuideOpen, setIsTemplateGuideOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isChangeModuleModalOpen, setIsChangeModuleModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [digitalVerificationData, setDigitalVerificationData] = useState<VerificationData | null>(() => {
    return parseVerificationDataFromUrl();
  });

  const toggleSidebarHidden = () => {
    setSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem('smantri_sidebar_hidden', String(next));
      return next;
    });
  };

  // Restore user session if available in state for this specific tab
  useEffect(() => {
    if (state && !currentUser) {
      const savedUserId = sessionStorage.getItem('smantri_user_id') || localStorage.getItem('smantri_user_id');
      if (savedUserId) {
        const found = state.teachers.find((t) => t.id === savedUserId);
        if (found) {
          setCurrentUser(found);
        }
      }
    }
  }, [state, currentUser, setCurrentUser]);

  // Real-time localStorage event listener to detect storage changes from other browser tabs
  // Synchronizes user status (login/logout/switch user) and active module across tabs without page refresh
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 1. Synchronize user authentication status across browser tabs
      if (e.key === 'smantri_user_id' || e.key === 'smantri_user_profile') {
        const storedUserId = localStorage.getItem('smantri_user_id');
        if (storedUserId) {
          // If another tab logged in or switched to a different user
          if (!currentUser || currentUser.id !== storedUserId) {
            let userToSet: any = null;
            const profileStr = localStorage.getItem('smantri_user_profile');
            if (profileStr) {
              try {
                userToSet = JSON.parse(profileStr);
              } catch (err) {}
            }
            if (!userToSet && state?.teachers) {
              userToSet = state.teachers.find((t) => t.id === storedUserId) || null;
            }
            if (userToSet) {
              sessionStorage.setItem('smantri_user_id', userToSet.id);
              sessionStorage.setItem('smantri_user_profile', JSON.stringify(userToSet));
              setCurrentUser(userToSet);
            }
          }
        } else {
          // If another tab logged out (smantri_user_id was removed from localStorage)
          if (currentUser) {
            sessionStorage.removeItem('smantri_user_id');
            sessionStorage.removeItem('smantri_user_profile');
            setCurrentUser(null);
            setSelectedModule('portal');
            const curPath = window.location.pathname.replace(/\/$/, '') || '/';
            if (curPath !== '/welcome' && curPath !== '/login') {
              navigate('/welcome', { replace: true });
            }
          }
        }
      }

      // 2. Synchronize active module across browser tabs in real-time
      if (e.key === 'smantri_selected_module') {
        const newModule = e.newValue || localStorage.getItem('smantri_selected_module');
        if (newModule && newModule !== selectedModule) {
          setSelectedModule(newModule as any);
        }
      }

      // 3. Synchronize active view across browser tabs in real-time
      if (e.key === 'smantri_last_view') {
        const newView = e.newValue || localStorage.getItem('smantri_last_view');
        if (newView && newView !== currentView) {
          setCurrentView(newView);
        }
      }

      // 4. Synchronize sidebar hidden state across tabs
      if (e.key === 'smantri_sidebar_hidden') {
        const isHidden = (e.newValue ?? localStorage.getItem('smantri_sidebar_hidden')) === 'true';
        setSidebarHidden(isHidden);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser, state?.teachers, setCurrentUser, selectedModule, setSelectedModule, currentView, setCurrentView]);

  // Refs to track navigation sources and prevent circular reverse-sync / view revert glitch
  const isNavigatingFromStateRef = React.useRef(false);
  const lastTargetUrlRef = React.useRef<string>('');
  const lastProcessedUrlRef = React.useRef<string>('');

  const getCanonicalUrl = (module: string, view: string): string => {
    if (module === 'portal') return '/portal';
    if (module === 'supervisi' || view.startsWith('supervisi-')) return getPathnameFromModule('supervisi', view);
    if (module === 'tugas') return '/tugas-harian';
    if (module === 'manajemen-data') return getPathnameFromModule('manajemen-data', view);
    if (module === 'bk-hebat') return getPathnameFromModule('bk-hebat', view);
    if (module === 'manajemen-ujian') return getPathnameFromModule('manajemen-ujian', view);
    if (module === 'litnum') return '/manajemen-literasi-numerasi';
    if (module === 'kesiswaan') {
      return view === 'kesiswaan-input' ? '/kesiswaan/input' : view === 'kesiswaan-rekap' ? '/kesiswaan/rekap' : view === 'kesiswaan-rawan' ? '/kesiswaan/rawan' : '/kesiswaan';
    }
    if (module === 'rekap-nilai') return getPathnameFromModule('rekap-nilai', view);
    if (module === 'sumatif') return getPathnameFromView(view);
    return getPathnameFromView(view);
  };

  // Synchronize active module and view based on URL pathname (Deep Linking & History)
  useEffect(() => {
    if (isMobileUpload) return;
    const curPath = location.pathname.replace(/\/$/, '') || '/';

    // If this URL change is the result of our internal state navigation, skip reverse-sync
    if (isNavigatingFromStateRef.current && curPath === lastTargetUrlRef.current) {
      isNavigatingFromStateRef.current = false;
      lastProcessedUrlRef.current = curPath;
      return;
    }
    isNavigatingFromStateRef.current = false;

    if (curPath === lastProcessedUrlRef.current) {
      return;
    }
    lastProcessedUrlRef.current = curPath;

    const routeInfo = resolveRouteFromUrl(curPath);

    if (routeInfo.isPortalRoute) {
      if (selectedModule !== 'portal') {
        setSelectedModule('portal');
      }
      return;
    }

    if (selectedModule !== routeInfo.module) {
      setSelectedModule(routeInfo.module);
    }
    if (currentView !== routeInfo.view) {
      setCurrentView(routeInfo.view);
    }
  }, [location.pathname, isMobileUpload, selectedModule, setSelectedModule, currentView, setCurrentView]);

  // Keep browser URL address bar in sync with current active module and view
  useEffect(() => {
    if (isMobileUpload) return;

    if (currentUser) {
      const targetPath = getCanonicalUrl(selectedModule, currentView);

      if (targetPath && location.pathname !== targetPath && !isPortalPath(location.pathname)) {
        lastTargetUrlRef.current = targetPath;
        isNavigatingFromStateRef.current = true;
        navigate(targetPath, { replace: true });
      }
    }
  }, [currentUser, selectedModule, currentView, isMobileUpload, location.pathname, navigate]);

  // Protect Role-Restricted Views & Auto Direct
  useEffect(() => {
    if (!currentUser) return;

    if (selectedModule === 'portal') {
      return;
    }

    if (currentUser.role === 'kepala_sekolah' || currentUser.isKepalaSekolah) {
      if (selectedModule !== 'supervisi' && selectedModule !== 'rekap-nilai' && selectedModule !== 'sumatif' && selectedModule !== 'manajemen-data' && selectedModule !== 'bk-hebat' && selectedModule !== 'manajemen-ujian' && selectedModule !== 'litnum' && selectedModule !== 'kesiswaan') {
        setSelectedModule('supervisi');
      }
      const allowedForKepsek = [
        'supervisi-dashboard',
        'supervisi-presensi',
        'supervisi-berita-acara',
        'supervisi-guru',
        'supervisi-asesmen',
        'supervisi-nilai',
        'supervisi-bukti',
        'supervisi-rapor',
        'supervisi-bk',
        'supervisi-catatan',
        'supervisi-kepsek',
        'dashboard',
        'teachers',
        'feedback-center',
        'archives',
        'academic-calendar',
        'bimbingan-konseling',
        'assessments',
        'student-grades',
        'item-analysis',
        'berita-acara',
        'raport-sts',
        'announcements',
        'students',
        'exam-management',
        'exam-rooms',
        'exam-proctor-schedules',
        'exam-proctor-mobile',
        'exam-token',
        'exam-credentials',
        'exam-cards',
        'exam-schedules',
        'exam-assignments',
        'exam-attendance',
        'litnum-management',
        'kesiswaan',
        'kesiswaan-ringkasan',
        'kesiswaan-input',
        'kesiswaan-rekap',
      ];
      if (!allowedForKepsek.includes(currentView)) {
        setCurrentView('supervisi-dashboard');
      }
    } else if (currentUser.role === 'admin' || currentUser.role === 'operator') {
      const manageViews = [
        'students',
        'teachers',
        'classes-subjects',
        'academic-calendar',
        'archives',
        'feedback-center',
        'ai-studio-hub',
        'announcements',
      ];
      const examViews = [
        'exam-token',
        'exam-credentials',
        'exam-cards',
        'exam-schedules',
        'exam-assignments',
        'exam-attendance',
        'exam-management',
        'exam-rooms',
        'exam-proctor-schedules',
        'exam-proctor-mobile',
        'exam-security',
        'proctor-monitor',
      ];
      // Automatically sync module to 'manajemen-data' or 'manajemen-ujian' when visiting specific views
      if (manageViews.includes(currentView) && selectedModule !== 'manajemen-data' && selectedModule !== 'kesiswaan' && selectedModule !== 'bk-hebat' && selectedModule !== 'litnum') {
        setSelectedModule('manajemen-data');
      } else if (examViews.includes(currentView) && selectedModule !== 'manajemen-ujian') {
        setSelectedModule('manajemen-ujian');
      } else if ((currentView === 'bimbingan-konseling' || currentView.startsWith('bk-')) && selectedModule !== 'bk-hebat') {
        setSelectedModule('bk-hebat');
      } else if (currentView === 'litnum-management' && selectedModule !== 'litnum') {
        setSelectedModule('litnum');
      } else if (currentView === 'tugas' && selectedModule !== 'tugas') {
        setSelectedModule('tugas');
      } else if ((currentView === 'kesiswaan' || currentView.startsWith('kesiswaan-')) && selectedModule !== 'kesiswaan') {
        setSelectedModule('kesiswaan');
      }
    } else if (currentUser.role === 'guru' || (currentUser.role as string) === 'kesiswaan') {
      const isGuruBK = Boolean(
        currentUser.isGuruBK ||
        currentUser.mataPelajaran?.some(
          (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
        )
      );
      const isGuruMapel = Boolean(
        currentUser.isGuruMapel ??
        (!isGuruBK || (currentUser.mataPelajaran && currentUser.mataPelajaran.filter((m) => !m.toLowerCase().includes('bimbingan')).length > 0))
      );

      const examViews = [
        'exam-token',
        'exam-credentials',
        'exam-cards',
        'exam-schedules',
        'exam-assignments',
        'exam-attendance',
        'exam-security',
        'exam-management',
        'exam-rooms',
        'exam-proctor-schedules',
        'exam-proctor-mobile',
        'proctor-monitor',
        'exam-proctor-monitor',
      ];

      if (examViews.includes(currentView) && selectedModule !== 'manajemen-ujian') {
        setSelectedModule('manajemen-ujian');
      } else if (currentView === 'litnum-management' && selectedModule !== 'litnum') {
        setSelectedModule('litnum');
      } else if ((currentView === 'bimbingan-konseling' || currentView.startsWith('bk-')) && selectedModule !== 'bk-hebat') {
        setSelectedModule('bk-hebat');
      } else if ((currentView === 'kesiswaan' || currentView.startsWith('kesiswaan-')) && selectedModule !== 'kesiswaan') {
        setSelectedModule('kesiswaan');
      } else if (isGuruBK && !isGuruMapel) {
        // Guru BK murni: hilangkan akses ke menu ujian mapel tetapi tetap dapat mengakses Dashboard
        const restrictedForGuruBK = [
          'assessments',
          'mass-grading',
          'item-analysis',
          'berita-acara',
          'raport-sts',
          'student-grades',
          'classes-subjects',
          'teachers',
          'feedback-center',
          'supervisi-kepsek',
        ];
        if (restrictedForGuruBK.includes(currentView)) {
          setCurrentView('dashboard');
        }
      } else {
        const restrictedForGuru = ['classes-subjects', 'teachers', 'feedback-center', 'supervisi-kepsek'];
        if (restrictedForGuru.includes(currentView)) {
          setCurrentView('dashboard');
        }
      }
    }
  }, [currentUser, currentView, setCurrentView, selectedModule, setSelectedModule]);

  const handleLogoutConfirm = () => {
    setCurrentUser(null);
    safeRemoveItem('smantri_user_id');
    safeRemoveItem('smantri_user_profile');
    safeRemoveItem('smantri_session_expires');
    safeRemoveItem('smantri_selected_module');
    sessionStorage.removeItem('smantri_user_id');
    sessionStorage.removeItem('smantri_user_profile');
    setSelectedModule('portal');
    setIsLogoutModalOpen(false);
    navigate('/welcome', { replace: true });
    scrollToTop({ smooth: true });
    showToast('Sampai Jumpa!', 'Anda telah keluar dari akun asesmen.', 'info');
  };

  const handleChangeModuleConfirm = () => {
    setSelectedModule('portal');
    setIsChangeModuleModalOpen(false);
    navigate('/portal', { replace: true });
    scrollToTop({ smooth: true });
    showToast('Portal Modul', 'Anda telah kembali ke Portal Pilihan Modul.', 'info');
  };

  if (isMobileUpload) {
    return <MobileUploadView />;
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/70 flex flex-col items-center justify-center text-slate-800 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold tracking-wide text-slate-700">Memuat Sistem SiMantri (Sistem Informasi Akademik SMAN 3 Tumijajar)...</p>
      </div>
    );
  }

  // Session loader if awaiting user restore in protected layout
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/70 flex flex-col items-center justify-center text-slate-800 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold tracking-wide text-slate-700">Memuat Sesi Pengguna...</p>
      </div>
    );
  }

  // If System Maintenance Mode is active and user is NOT Admin, redirect to Maintenance Screen
  if (state?.schoolInfo?.maintenanceMode && currentUser.role !== 'admin') {
    return (
      <>
        <MaintenanceScreen onLogout={handleLogoutConfirm} />
        <ToastContainer />
      </>
    );
  }

  // If user is on portal selection screen, render PortalSelectionView
  if (selectedModule === 'portal') {
    return (
      <>
        <PortalSelectionView
          selectedModule={selectedModule}
          onSelectModule={(mod) => {
            scrollToTop({ smooth: true });
            setSelectedModule(mod);
            let nextView = 'dashboard';
            if (mod === 'pengawas') {
              nextView = 'standalone-supervisor';
            } else if (mod === 'sumatif') {
              nextView = currentView !== 'rekap-nilai-leger' ? 'assessments' : currentView;
            } else if (mod === 'rekap-nilai') {
              nextView = 'rekap-nilai-dashboard';
            } else if (mod === 'manajemen-data') {
              nextView = 'students';
            } else if (mod === 'bk-hebat') {
              nextView = 'bimbingan-konseling';
            } else if (mod === 'manajemen-ujian') {
              nextView = 'exam-management';
            } else if (mod === 'litnum') {
              nextView = 'litnum-management';
            } else if (mod === 'tugas') {
              nextView = 'tugas';
            } else if (mod === 'kesiswaan') {
              nextView = 'kesiswaan';
            } else if (mod === 'supervisi') {
              nextView = 'supervisi-dashboard';
            }
            setCurrentView(nextView);
            const target = getPathnameFromModule(mod, nextView);
            navigate(target, { replace: true });
          }}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogoutConfirm}
        />
        <ToastContainer />
      </>
    );
  }

  // Standalone View untuk Portal Pengawas Ujian CBT (Terisolasi Penuh Tanpa Sidebar / Menu Manajemen Ujian)
  if (selectedModule === 'pengawas' || currentView === 'standalone-supervisor') {
    return (
      <>
        <StandaloneSupervisorPortal
          onBackToPortal={() => {
            setSelectedModule('portal');
            setCurrentView('dashboard');
            navigate('/portal', { replace: true });
          }}
        />
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogoutConfirm}
        />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      <div className="flex flex-1">
        {/* Responsive Animated Sidebar */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          sidebarHidden={sidebarHidden}
          onToggleSidebar={toggleSidebarHidden}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDeepLearningGuide={() => setIsDeepLearningOpen(true)}
          onOpenTemplateGuide={() => setIsTemplateGuideOpen(true)}
          onOpenResetConfirm={() => setIsResetModalOpen(true)}
          onInitiateChangeModule={() => setIsChangeModuleModalOpen(true)}
          onInitiateLogout={() => setIsLogoutModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarHidden ? '' : 'lg:ml-72'}`}>
          {/* Header */}
          <Header
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
            sidebarHidden={sidebarHidden}
            onToggleSidebar={toggleSidebarHidden}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenDeepLearningGuide={() => setIsDeepLearningOpen(true)}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onInitiateLogout={() => setIsLogoutModalOpen(true)}
            onInitiateChangeModule={() => setIsChangeModuleModalOpen(true)}
          />

          {/* View Container with Smooth Professional Transition */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <ViewErrorBoundary
                  key={currentView}
                  viewName={currentView}
                  onResetViewData={currentView === 'feedback-center' ? clearAllFeedbacks : undefined}
                  onGoHome={() => setCurrentView(currentUser.role === 'kepala_sekolah' ? 'supervisi-dashboard' : 'dashboard')}
                >
                  {(currentView.startsWith('supervisi-') || (selectedModule === 'supervisi' && currentView === 'dashboard')) && (currentUser.role === 'kepala_sekolah' || currentUser.isKepalaSekolah || currentUser.role === 'admin') && <KepalaSekolahSupervisionView />}
                  {currentView === 'dashboard' && selectedModule !== 'supervisi' && (
                    selectedModule === 'rekap-nilai' ? (
                      <RekapNilaiDashboardView />
                    ) : selectedModule === 'manajemen-ujian' ? (
                      <ExamManagementDashboardView />
                    ) : selectedModule === 'litnum' ? (
                      <LitNumManagementView />
                    ) : selectedModule === 'bk-hebat' ? (
                      <BimbinganKonselingView />
                    ) : selectedModule === 'kesiswaan' ? (
                      <StudentAttendanceView />
                    ) : selectedModule === 'tugas' ? (
                      <TugasHarianView />
                    ) : (
                      <DashboardOverview />
                    )
                  )}
                  {currentView === 'rekap-nilai-dashboard' && <RekapNilaiDashboardView />}
                  {currentView === 'rekap-nilai-leger' && <RekapNilaiLegerModule initialTab="tab1" />}
                  {currentView === 'rekap-nilai-cp' && <RekapNilaiLegerModule initialTab="tab2" />}
                  {currentView === 'rekap-nilai-erapor' && <RekapNilaiLegerModule initialTab="tab_erapor" />}
                  {currentView === 'rekap-nilai-olahranking' && <RekapNilaiLegerModule initialTab="tab3" />}
                  {currentView === 'rekap-nilai-cetak' && <RekapNilaiLegerModule initialTab="tab4" />}
                  {currentView === 'exam-token' && <ExamTokenView />}
                  {currentView === 'exam-credentials' && <ExamCredentialsView />}
                  {currentView === 'exam-cards' && <ExamCardsView />}
                  {currentView === 'exam-schedules' && <ExamSchedulesView />}
                  {currentView === 'exam-assignments' && <ExamAssignmentsView />}
                  {currentView === 'exam-attendance' && <ExamAttendanceView />}
                  {currentView === 'exam-security' && <ExamSecurityManager />}
                  {currentView === 'exam-rooms' && <ExamMultiClassRoomsView />}
                  {currentView === 'exam-proctor-schedules' && <ExamProctorScheduleView />}
                  {currentView === 'exam-proctor-mobile' && <MobileProctorMonitorView />}
                  {(currentView === 'proctor-monitor' || currentView === 'exam-proctor-monitor') && <ProctorMonitorDashboard />}
                  {currentView === 'mass-grading' && <MassGradingView />}
                  {currentView === 'assessments' && <AssessmentBankView />}
                  {currentView === 'item-analysis' && <ItemAnalysisView />}
                  {currentView === 'berita-acara' && <BeritaAcaraView />}
                  {currentView === 'raport-sts' && <RaportSTSView />}
                  {currentView === 'student-grades' && <StudentGradesRosterView />}
                  {currentView === 'students' && <MasterStudentsView />}
                  {currentView === 'teachers' && (currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'kepala_sekolah') && <MasterTeachersView />}
                  {currentView === 'classes-subjects' && (currentUser.role === 'admin' || currentUser.role === 'operator') && <MasterClassSubjectView />}
                  {currentView === 'feedback' && <TeacherFeedbackView />}
                  {currentView === 'feedback-center' && (currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah') && <AdminFeedbackManagementView />}
                  {currentView === 'announcements' && (currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'kepala_sekolah') && <AdminAnnouncementManagementView />}
                  {currentView === 'ai-studio-hub' && (currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'kepala_sekolah') && <AdminDeveloperHub />}
                  {currentView === 'academic-calendar' && <AcademicCalendarView />}
                  {currentView === 'archives' && (currentUser.role === 'admin' || currentUser.role === 'operator' || currentUser.role === 'kepala_sekolah') && <ArchivesView />}
                  {(currentView === 'bimbingan-konseling' || currentView.startsWith('bk-')) && <BimbinganKonselingView activeTabFromParent={currentView} />}
                  {currentView === 'litnum-management' && <LitNumManagementView />}
                  {currentView === 'exam-management' && <ExamManagementDashboardView />}
                  {(currentView === 'tugas' || (selectedModule === 'tugas' && currentView !== 'dashboard')) && <TugasHarianView />}
                  {(currentView === 'kesiswaan' || currentView.startsWith('kesiswaan-') || (selectedModule === 'kesiswaan' && currentView !== 'dashboard')) && (
                    <StudentAttendanceView
                      initialTab={
                        currentView === 'kesiswaan-input'
                          ? 'input'
                          : currentView === 'kesiswaan-rekap'
                          ? 'rekap'
                          : currentView === 'kesiswaan-rawan'
                          ? 'rawan'
                          : 'ringkasan'
                      }
                    />
                  )}
                </ViewErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Bottom Disclaimer & Privacy/Help Links */}
          <FooterDisclaimer />
        </div>
      </div>

      {/* Floating Unhide Sidebar Button when sidebar is hidden on Desktop */}
      <AnimatePresence>
        {sidebarHidden && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15 }}
            onClick={toggleSidebarHidden}
            className="fixed bottom-6 left-6 z-40 hidden lg:flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-indigo-600 text-white shadow-2xl border border-slate-700/80 hover:border-indigo-500 font-bold text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 group backdrop-blur-md"
            title="Tampilkan Menu Sidebar (Show Sidebar)"
          >
            <PanelLeftOpen className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
            <span>Tampilkan Menu</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SchoolSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
        {isDeepLearningOpen && (
          <DeepLearningGuideModal
            isOpen={isDeepLearningOpen}
            onClose={() => setIsDeepLearningOpen(false)}
          />
        )}
        {isTemplateGuideOpen && (
          <TemplateGuideModal
            isOpen={isTemplateGuideOpen}
            onClose={() => setIsTemplateGuideOpen(false)}
          />
        )}
        {isProfileModalOpen && (
          <ProfileEditModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
        {isLogoutModalOpen && (
          <LogoutConfirmModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleLogoutConfirm}
          />
        )}
        {isChangeModuleModalOpen && (
          <ChangeModuleConfirmModal
            isOpen={isChangeModuleModalOpen}
            onClose={() => setIsChangeModuleModalOpen(false)}
            onConfirm={handleChangeModuleConfirm}
          />
        )}
        {isResetModalOpen && (
          <ResetConfirmModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
          />
        )}
        {digitalVerificationData && (
          <DigitalVerificationModal
            data={digitalVerificationData}
            onClose={() => setDigitalVerificationData(null)}
          />
        )}
      </AnimatePresence>

      {/* Global Loading & Network Status Indicator */}
      <GlobalLoadingIndicator />

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Automatic Chrome/PC PWA Install Prompt */}
      <ChromePCAutoInstallPrompt />
    </div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { state, loading } = useApp();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileUpload = searchParams.get('mode') === 'mobile-upload';

  // Automatically scroll smoothly to top on public route transitions
  useAutoScrollToTop([location.pathname], { smooth: true });

  if (isMobileUpload) {
    return <MobileUploadView />;
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/70 flex flex-col items-center justify-center text-slate-800 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold tracking-wide text-slate-700">Memuat Sistem SiMantri (Sistem Informasi &amp; Manajemen Akademik SMAN 3 Tumijajar)...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. Public Landing & General Staff Logins */}
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route
        path="/welcome"
        element={
          <>
            <RoleGatewayView />
            <ToastContainer />
          </>
        }
      />
      {/* Unified Staff Login (/login, /login-gtk, /login-admin) */}
      <Route
        path="/login"
        element={
          (() => {
            const params = new URLSearchParams(window.location.search);
            const role = params.get('role');
            if (role === 'admin') {
              return (
                <>
                  <LoginAdminView />
                  <ToastContainer />
                </>
              );
            }
            return (
              <>
                <LoginGtkView />
                <ToastContainer />
              </>
            );
          })()
        }
      />
      <Route
        path="/login-admin"
        element={
          <>
            <LoginAdminView />
            <ToastContainer />
          </>
        }
      />
      <Route
        path="/login-gtk"
        element={
          <>
            <LoginGtkView />
            <ToastContainer />
          </>
        }
      />
      <Route path="/login-guru" element={<Navigate to="/login-gtk" replace />} />
      <Route path="/portal-login" element={<Navigate to="/login" replace />} />

      {/* 2. Dedicated Public Login Page Khusus Peserta Didik (/siswa/login) */}
      <Route
        path="/siswa/login"
        element={
          <ProtectedRoute authType="siswa">
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route path="/portal-siswa/login" element={<Navigate to="/siswa/login" replace />} />

      {/* 3. Protected Student Routes (/siswa, /siswa/*, /cbt-online, /portal-siswa, /ujian-litnum) */}
      <Route
        path="/siswa"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/dashboard"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/cbt-umum"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/litnum"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="litnum" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/profil"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/:subPath/*"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cbt-online"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal-siswa"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="default" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ujian-litnum"
        element={
          <ProtectedRoute authType="siswa" allowedRoles={['siswa', 'admin', 'operator', 'guru', 'kepala_sekolah']}>
            <StudentPortalView initialMode="litnum" />
            <ToastContainer />
          </ProtectedRoute>
        }
      />

      {/* 4. Protected Admin Routes (/admin/*) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute authType="staff" allowedRoles={['admin', 'operator']}>
            <MainAppLayout />
          </ProtectedRoute>
        }
      />

      {/* 5. Protected Operator Routes (/operator/*) */}
      <Route
        path="/operator/*"
        element={
          <ProtectedRoute authType="staff" allowedRoles={['admin', 'operator']}>
            <MainAppLayout />
          </ProtectedRoute>
        }
      />

      {/* 6. Protected GTK / Guru Routes (/gtk/* & /guru/*) */}
      <Route
        path="/gtk/*"
        element={
          <ProtectedRoute authType="staff" allowedRoles={['guru', 'gtk', 'admin', 'operator', 'kepala_sekolah', 'kesiswaan']}>
            <MainAppLayout />
          </ProtectedRoute>
        }
      />
      <Route path="/guru/*" element={<Navigate to="/gtk/dashboard" replace />} />

      {/* 7. Proctor Monitor Routes (/pengawas, /pengawas/*, /pengawas-cbt) */}
      <Route
        path="/pengawas-cbt"
        element={
          <ProtectedRoute authType="staff">
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-2 sm:p-4 lg:p-6">
              <div className="w-full max-w-7xl">
                <MobileProctorMonitorView />
              </div>
              <ToastContainer />
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="/monitor-pengawas" element={<Navigate to="/pengawas/monitoring-ujian" replace />} />
      <Route path="/pengawas" element={<Navigate to="/pengawas/monitoring-ujian" replace />} />
      <Route path="/pengawas/dashboard" element={<Navigate to="/pengawas/monitoring-ujian" replace />} />
      <Route
        path="/pengawas/monitoring-ujian"
        element={
          <ProtectedRoute authType="staff">
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-2 sm:p-4 lg:p-6">
              <div className="w-full max-w-7xl">
                <MobileProctorMonitorView />
              </div>
              <ToastContainer />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pengawas/:subPath"
        element={
          <ProtectedRoute authType="staff">
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-2 sm:p-4 lg:p-6">
              <div className="w-full max-w-7xl">
                <MobileProctorMonitorView />
              </div>
              <ToastContainer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 8. All Other Protected Internal Staff Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute authType="staff">
            <MainAppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <AutosaveProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AutosaveProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
