import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  authType?: 'staff' | 'siswa' | 'any';
}

/**
 * Role-Based Access Control (RBAC) & Protected Route Guard for SiMantri.
 * 
 * Intercepts direct links (copy-paste URLs) and validates active session before rendering internal views.
 * 
 * Skenario 1: Akses Langsung ke /path atau /sub-path Staff (/admin/*, /operator/*, /gtk/*, /dashboard, etc)
 *  - Unauthenticated -> Tahan render & redirect to /login with state={{ from: location }} & sessionStorage.smantri_intended_path
 *  - After login, automatically returns to original requested path.
 * 
 * Skenario 2: Navigasi & Akses Langsung ke /path atau /sub-path Siswa (/siswa/*, /siswa/login, /siswa/dashboard, /cbt-online)
 *  - /siswa/login is public for student login.
 *  - Unauthenticated direct link to /siswa/* -> Redirects directly to /siswa/login with state={{ from: location }}
 *  - Never redirects students to landing page or teacher login.
 * 
 * Skenario 3: Cross-Role Isolation
 *  - Student user attempting staff path (/admin/*, /gtk/*, /operator/*) -> Redirected back to /siswa/dashboard
 *  - Non-admin staff attempting /admin/* -> Redirected back to /gtk/dashboard
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  authType = 'staff',
}) => {
  const { currentUser, loading } = useApp();
  const location = useLocation();

  // Check stored credentials in sessionStorage & localStorage
  const storedUserId =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('smantri_user_id') || localStorage.getItem('smantri_user_id')
      : null;

  const storedUserProfile =
    typeof window !== 'undefined'
      ? (() => {
          const raw = sessionStorage.getItem('smantri_user_profile') || localStorage.getItem('smantri_user_profile');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : null;

  const storedStudent =
    typeof window !== 'undefined'
      ? (() => {
          const raw = sessionStorage.getItem('smantri_active_student') || localStorage.getItem('smantri_active_student');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : null;

  const isStaffAuthenticated = Boolean(currentUser || storedUserId || storedUserProfile);
  const isStudentAuthenticated = Boolean(storedStudent || (currentUser as any)?.role === 'siswa');

  // Active role determination
  const activeRole: string | null = (currentUser?.role as string) || (storedUserProfile?.role as string) || (storedStudent ? 'siswa' : null);

  const pathname = location.pathname.toLowerCase();
  const isSiswaPath =
    pathname.startsWith('/siswa') ||
    pathname.startsWith('/portal-siswa') ||
    pathname.startsWith('/cbt-online') ||
    pathname.startsWith('/ujian-litnum');
  const isAdminPath = pathname.startsWith('/admin');
  const isOperatorPath = pathname.startsWith('/operator');

  // 1. Loading & Session Hydration Check (Prevents Screen Flicker during reload)
  if (loading && !currentUser && (storedUserId || storedStudent)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-300">Memvalidasi Sesi Hak Akses SiMantri...</p>
        </div>
      </div>
    );
  }

  // 2. Student Route Interception (/siswa/*)
  if (authType === 'siswa' || isSiswaPath) {
    // Exception: /siswa/login or /portal-siswa/login is public for student login
    if (pathname === '/siswa/login' || pathname === '/portal-siswa/login') {
      if (isStudentAuthenticated) {
        return <Navigate to="/siswa/dashboard" replace />;
      }
      return <>{children}</>;
    }

    // Direct link copy-paste to protected student sub-path (/siswa/dashboard, /siswa/cbt, /siswa/ujian, /siswa/litnum)
    if (!isStudentAuthenticated && !isStaffAuthenticated) {
      // Preserve intended path for post-login redirect
      try {
        const fullPath = location.pathname + location.search + location.hash;
        sessionStorage.setItem('smantri_intended_path', fullPath);
      } catch (e) {}

      return <Navigate to="/siswa/login" state={{ from: location }} replace />;
    }

    // Cross-role check: If student authenticated, render student content
    return <>{children}</>;
  }

  // 3. Staff Route Interception (/admin/*, /operator/*, /gtk/*, /dashboard, etc)
  if (!isStaffAuthenticated) {
    // Unauthenticated user attempting to access staff protected route -> Redirect to /login
    try {
      const fullPath = location.pathname + location.search + location.hash;
      sessionStorage.setItem('smantri_intended_path', fullPath);
    } catch (e) {}

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Cross-Role Isolation Rules
  // A. Active student session trying to access staff path (/admin/*, /gtk/*, /operator/*) -> Redirect back to /siswa/dashboard
  if (activeRole === 'siswa' && !isSiswaPath) {
    return <Navigate to="/siswa/dashboard" replace />;
  }

  // B. Staff without Admin/Operator privileges trying to access /admin/* or /operator/* -> Redirect back to /gtk/dashboard
  if (isAdminPath || isOperatorPath) {
    const isAdminUser =
      currentUser?.role === 'admin' ||
      currentUser?.isAdmin ||
      storedUserProfile?.role === 'admin' ||
      storedUserProfile?.isAdmin ||
      currentUser?.id === 'tch-admin' ||
      storedUserId === 'tch-admin';

    const isOperatorUser =
      currentUser?.role === 'operator' ||
      currentUser?.isOperator ||
      storedUserProfile?.role === 'operator' ||
      storedUserProfile?.isOperator ||
      currentUser?.id === 'tch-operator' ||
      storedUserId === 'tch-operator';

    if (!isAdminUser && !isOperatorUser) {
      return <Navigate to="/gtk/dashboard" replace />;
    }
  }

  // C. Specific Role Enforcement (when allowedRoles prop is explicitly passed)
  if (allowedRoles && allowedRoles.length > 0 && activeRole) {
    const isAllowed = allowedRoles.some((role) => {
      if (role === 'admin') return activeRole === 'admin' || currentUser?.isAdmin || storedUserProfile?.isAdmin;
      if (role === 'operator') return activeRole === 'operator' || currentUser?.isOperator || storedUserProfile?.isOperator;
      if (role === 'guru' || role === 'gtk') return activeRole === 'guru' || activeRole === 'gtk' || currentUser?.isGuruMapel || currentUser?.isGuruBK;
      if (role === 'kepala_sekolah') return activeRole === 'kepala_sekolah' || currentUser?.isKepalaSekolah;
      if (role === 'siswa') return activeRole === 'siswa';
      return activeRole === role;
    });

    if (!isAllowed) {
      if (activeRole === 'siswa') return <Navigate to="/siswa/dashboard" replace />;
      if (activeRole === 'admin' || activeRole === 'operator') return <Navigate to="/admin/dashboard" replace />;
      return <Navigate to="/gtk/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
