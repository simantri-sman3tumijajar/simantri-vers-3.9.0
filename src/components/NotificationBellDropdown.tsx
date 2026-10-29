import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useWebNotification } from '../hooks/useWebNotification';
import { AppNotification, NotificationCategory } from '../types';
import {
  Bell,
  CheckCheck,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquarePlus,
  ExternalLink,
  ChevronRight,
  Filter,
  Volume2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getRelativeTimeIndonesian(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 0) return 'Baru saja';
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return 'Baru saja';
  }
}

export const NotificationBellDropdown: React.FC = () => {
  const {
    state,
    currentUser,
    setCurrentView,
    setSelectedModule,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useApp();

  const { permission, requestPermission } = useWebNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Strict Role Gating: Bell is exclusively for Guru/GTK, Operator, and Admin
  if (!currentUser || currentUser.role === ('siswa' as any)) {
    return null;
  }

  const allNotifications = state?.notifications || [];

  // Filter notifications relevant to current user
  const userNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      if (n.recipientId === currentUser.id) return true;
      if (currentUser.role === 'admin' && (n.recipientId === 'ROLE_ADMIN' || n.recipientRole === 'admin')) return true;
      if (currentUser.role === 'operator' && (n.recipientId === 'ROLE_OPERATOR' || n.recipientRole === 'operator')) return true;
      if (
        (currentUser.role === 'guru' || currentUser.isGuruMapel) &&
        (n.recipientId === 'ALL_TEACHERS' || n.recipientRole === 'guru')
      ) {
        return true;
      }
      return false;
    });
  }, [allNotifications, currentUser]);

  const sortedNotifications = useMemo(() => {
    return [...userNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [userNotifications]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.read).length;
  }, [userNotifications]);

  const displayedNotifications = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return sortedNotifications.filter((n) => !n.read);
    }
    return sortedNotifications;
  }, [sortedNotifications, activeFilter]);

  const handleItemClick = (notif: AppNotification) => {
    // 1. Mark as read
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    // 2. Direct Action Routing
    if (notif.targetModule) {
      setSelectedModule(notif.targetModule as any);
    }
    if (notif.targetView) {
      setCurrentView(notif.targetView);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    if (currentUser) {
      markAllNotificationsAsRead(currentUser.id, currentUser.role);
    }
  };

  const getCategoryMeta = (cat: NotificationCategory, title: string) => {
    switch (cat) {
      case 'penugasan_baru':
        return {
          label: 'Tugas Soal Baru',
          icon: BookOpen,
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          iconBg: 'bg-indigo-100 text-indigo-600',
        };
      case 'validasi_revisi':
        if (title.toLowerCase().includes('revisi')) {
          return {
            label: 'Catatan Revisi',
            icon: AlertTriangle,
            badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
            iconBg: 'bg-amber-100 text-amber-600',
          };
        }
        return {
          label: 'Soal Disetujui',
          icon: CheckCircle2,
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-100 text-emerald-600',
        };
      case 'pengingat_tenggat':
        return {
          label: 'Deadline H-1',
          icon: Clock,
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          iconBg: 'bg-rose-100 text-rose-600',
        };
      case 'pengumuman_kedinasan':
        return {
          label: 'Pengumuman GTK',
          icon: Sparkles,
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-100 text-purple-600',
        };
      case 'tugas_selesai':
        return {
          label: 'Tugas Diserahkan',
          icon: CheckCircle2,
          badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
          iconBg: 'bg-teal-100 text-teal-700',
        };
      case 'feedback_baru':
        return {
          label: 'Masukan / Feedback',
          icon: MessageSquarePlus,
          badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          iconBg: 'bg-cyan-100 text-cyan-700',
        };
      default:
        return {
          label: 'Info Sistem',
          icon: Bell,
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          iconBg: 'bg-slate-100 text-slate-600',
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tombol Lonceng dengan Badge Merah & Animasi Pulse Halus */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Pemberitahuan & Notifikasi"
        title={unreadCount > 0 ? `${unreadCount} notifikasi baru belum dibaca` : 'Notifikasi SiMantri'}
        className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
        }`}
      >
        <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />

        {/* Badge Angka Berwarna Merah & Animasi Pulse Halus */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center h-4.5 min-w-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full shadow-xs border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel Real-Time */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header Dropdown */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                      Notifikasi &amp; Tugas
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua telah dibaca'}
                    </p>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 transition-colors cursor-pointer"
                    title="Tandai semua notifikasi telah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tandai Semua Dibaca</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs (Semua vs Belum Dibaca) */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Semua ({userNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('UNREAD')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'UNREAD'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Belum Dibaca ({unreadCount})
                </button>
              </div>

              {/* Banner Izin Notifikasi Browser jika status masih default */}
              {permission === 'default' && (
                <div className="mt-3 p-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-900 truncate">
                      Aktifkan notifikasi browser di HP/Laptop
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestPermission()}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[10.5px] shrink-0 cursor-pointer transition-colors shadow-2xs"
                  >
                    Izinkan
                  </button>
                </div>
              )}
            </div>

            {/* List Notifikasi */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <CheckCheck className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Tidak ada notifikasi</p>
                  <p className="text-[11px] text-slate-400 max-w-[220px]">
                    {activeFilter === 'UNREAD'
                      ? 'Semua notifikasi penting telah Anda baca.'
                      : 'Notifikasi penugasan dan status soal akan muncul di sini.'}
                  </p>
                </div>
              ) : (
                displayedNotifications.map((notif) => {
                  const meta = getCategoryMeta(notif.category, notif.title);
                  const IconComp = meta.icon;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3.5 sm:p-4 hover:bg-indigo-50/40 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                        !notif.read ? 'bg-indigo-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Indikator Titik Biru Belum Dibaca */}
                      {!notif.read && (
                        <span
                          className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600"
                          title="Belum dibaca"
                        />
                      )}

                      {/* Icon Kategori */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}
                      >
                        <IconComp className="w-4.5 h-4.5" />
                      </div>

                      {/* Konten Notifikasi */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-extrabold border ${meta.badgeColor}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {getRelativeTimeIndonesian(notif.createdAt)}
                          </span>
                        </div>

                        <h4
                          className={`text-xs leading-snug line-clamp-1 ${
                            !notif.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>

                        {/* Action Link Footer */}
                        {notif.targetView && (
                          <div className="pt-0.5 flex items-center gap-1 text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700">
                            <span>Buka Halaman Terkait</span>
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        )}
                      </div>

                      {/* Tombol Hapus Satuan (Discreet) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                        title="Hapus pemberitahuan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Dropdown */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[10.5px] text-slate-400 font-medium">
                Sistem Notifikasi Resmi SMANTRI &bull; Selektif &amp; Anti-Spam
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
