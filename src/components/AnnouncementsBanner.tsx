import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Announcement } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import {
  Megaphone,
  Pin,
  AlertTriangle,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Clock,
  UserCheck,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementsBannerProps {
  targetRole?: 'semua' | 'guru' | 'siswa' | 'admin';
  className?: string;
  maxDisplay?: number;
}

export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({
  targetRole = 'semua',
  className = '',
  maxDisplay = 5,
}) => {
  const { state } = useApp();
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);

  // Filter announcements for current context
  const activeAnnouncements = useMemo(() => {
    const list = state?.announcements || [];
    
    // Filter active items
    const activeOnly = list.filter((a) => a.isActive !== false);

    // Filter by role relevance
    const roleFiltered = activeOnly.filter((a) => {
      if (targetRole === 'admin') return true; // admin sees all
      if (a.targetRole === 'semua') return true;
      if (targetRole === 'guru' && a.targetRole === 'guru') return true;
      if (targetRole === 'siswa' && a.targetRole === 'siswa') return true;
      return false;
    });

    // Sort: pinned first, then newest
    return roleFiltered.sort((a, b) => {
      if (a.isPin && !b.isPin) return -1;
      if (!a.isPin && b.isPin) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }).slice(0, maxDisplay);
  }, [state?.announcements, targetRole, maxDisplay]);

  if (!activeAnnouncements || activeAnnouncements.length === 0) {
    return null;
  }

  const currentItem = activeAnnouncements[activeIdx] || activeAnnouncements[0];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? activeAnnouncements.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === activeAnnouncements.length - 1 ? 0 : prev + 1));
  };

  const getCategoryBadge = (kategori: Announcement['kategori']) => {
    switch (kategori) {
      case 'Mendesak':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          icon: AlertTriangle,
          dot: 'bg-rose-500 animate-pulse',
        };
      case 'Penting':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          icon: Bell,
          dot: 'bg-amber-400',
        };
      case 'Ujian & Asesmen':
        return {
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          icon: Calendar,
          dot: 'bg-indigo-400',
        };
      default:
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          icon: Info,
          dot: 'bg-emerald-400',
        };
    }
  };

  const badgeStyle = getCategoryBadge(currentItem.kategori);
  const CategoryIcon = badgeStyle.icon;

  const isFlash = Boolean(currentItem?.isFlashBroadcast);

  return (
    <div className={`relative ${className}`}>
      <div className={`overflow-hidden rounded-3xl text-white shadow-xl transition-all ${
        isFlash
          ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 border-2 border-rose-500 shadow-rose-900/30'
          : 'bg-slate-900 border border-slate-800'
      }`}>
        {/* Top Decorative Glow */}
        <div className={`absolute top-0 right-0 w-96 h-48 blur-2xl pointer-events-none ${
          isFlash
            ? 'bg-gradient-to-l from-rose-600/30 via-red-500/20 to-transparent animate-pulse'
            : 'bg-gradient-to-l from-indigo-600/20 via-sky-500/10 to-transparent'
        }`} />

        <div className="relative z-10 p-5 sm:p-6">
          {/* Header Bar */}
          <div className={`flex items-center justify-between gap-3 mb-3.5 pb-3 border-b ${
            isFlash ? 'border-rose-800/80' : 'border-slate-800/80'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border shadow-inner ${
                isFlash
                  ? 'bg-rose-600 text-white border-rose-400 animate-bounce'
                  : 'bg-indigo-600/30 border-indigo-500/40 text-indigo-400'
              }`}>
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-xs font-black tracking-wide uppercase flex items-center gap-1.5 ${
                  isFlash ? 'text-rose-300 animate-pulse' : 'text-slate-200'
                }`}>
                  {isFlash ? 'PENGUMUMAN MENDESAK (FLASH BROADCAST)' : 'Pengumuman Resmi Sekolah'}
                  <Sparkles className={`w-3 h-3 ${isFlash ? 'text-rose-400' : 'text-amber-400'}`} />
                </span>
                <p className="text-[11px] text-slate-400">Pemberitahuan &amp; Jadwal Utama SMAN 3 Tumijajar</p>
              </div>
            </div>

            {/* Pagination Controls */}
            {activeAnnouncements.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 font-mono">
                  {activeIdx + 1} / {activeAnnouncements.length}
                </span>
                <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Pengumuman Sebelumya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Pengumuman Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Announcement Item */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Category & Pin Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {currentItem.isPin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Pin className="w-3 h-3 text-amber-400 fill-amber-400/30" />
                    Disematkan
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyle.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                  <CategoryIcon className="w-3 h-3" />
                  {currentItem.kategori}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 ml-auto font-medium">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {formatIndonesianDate(currentItem.createdAt)}
                </span>
              </div>

              {/* Title & Body Content */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {currentItem.judul}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {currentItem.isi}
                </p>
              </div>

              {/* Footer Meta & Action */}
              <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentItem.penulis || 'Administrator SMAN 3 Tumijajar'}</span>
                  {currentItem.targetRole && currentItem.targetRole !== 'semua' && (
                    <span className="ml-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase text-[10px]">
                      Khusus {currentItem.targetRole}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setModalAnnouncement(currentItem)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer transition-all"
                >
                  <span>Baca Selengkapnya</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bullet Indicators for Multiple Items */}
          {activeAnnouncements.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {activeAnnouncements.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeIdx
                      ? 'w-6 bg-indigo-500'
                      : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Pengumuman ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Pengumuman */}
      <AnimatePresence>
        {modalAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {modalAnnouncement.kategori}
                    </span>
                    <h3 className="text-lg font-extrabold text-white leading-snug">
                      {modalAnnouncement.judul}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setModalAnnouncement(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta Info */}
              <div className="my-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Diterbitkan: {formatIndonesianDate(modalAnnouncement.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{modalAnnouncement.penulis || 'Administrator SMAN 3 Tumijajar'}</span>
                </div>
              </div>

              {/* Full Content */}
              <div className="max-h-72 overflow-y-auto pr-2 text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
                {modalAnnouncement.isi}
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setModalAnnouncement(null)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Tutup Pengumuman
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
