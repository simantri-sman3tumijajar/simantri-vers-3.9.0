import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherFeedback } from '../types';
import {
  MessageSquarePlus,
  X,
  Star,
  Send,
  Lightbulb,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  User,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, saveFeedback, showToast } = useApp();

  const [category, setCategory] = useState<TeacherFeedback['kategori']>('Saran Pengembangan');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Form Belum Lengkap', 'Mohon isi judul dan pesan masukan Anda.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackPayload: TeacherFeedback = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        teacherId: currentUser.id,
        teacherName: currentUser.nama,
        teacherNip: currentUser.nip || '-',
        mataPelajaran: currentUser.mataPelajaran || [],
        judul: title.trim(),
        kategori: category,
        pesan: message.trim(),
        rating,
        status: 'Baru',
        createdAt: new Date().toISOString(),
        userRole: currentUser.role,
        isBestTestimonial: false,
      };

      await saveFeedback(feedbackPayload);
      setTitle('');
      setMessage('');
      setRating(5);
      onClose();
    } catch (err) {
      console.error('[FeedbackModal] Error:', err);
      showToast('Gagal Mengirim', 'Terjadi kesalahan saat menyimpan masukan. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Kirim Aspirasi &amp; Masukan SiMantri
              </h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                Saran, laporan kendala, atau testimoni langsung ke Administrator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Info Pengirim Otomatis */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.nama.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 truncate">{currentUser.nama}</p>
                <p className="text-[11px] text-slate-500 capitalize">
                  Peran: {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'operator' ? 'Operator' : 'Guru / GTK'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Otentikasi Riil</span>
            </span>
          </div>

          {/* Pemilihan Kategori */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-2">
              Kategori Masukan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('Saran Pengembangan')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  category === 'Saran Pengembangan'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Saran</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  Usulan fitur atau peningkatan alur kerja
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('Kritik / Laporan Kendala')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  category === 'Kritik / Laporan Kendala'
                    ? 'border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Kritik &amp; Kendala</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  Laporan eror, bug, atau kendala teknis
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('Testimoni Penggunaan')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  category === 'Testimoni Penggunaan'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Testimoni</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  Pengalaman positif &amp; apresiasi sistem
                </span>
              </button>
            </div>
          </div>

          {/* Rating Bintang */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              Tingkat Kepuasan &amp; Penilaian (Rating 1–5 Bintang)
            </label>
            <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                    title={`${star} Bintang`}
                  >
                    <Star
                      className={`w-7 h-7 transition-all ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 scale-110'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-xs font-extrabold text-slate-700">
                {rating === 5
                  ? 'Sangat Memuaskan ⭐⭐⭐⭐⭐'
                  : rating === 4
                  ? 'Memuaskan ⭐⭐⭐⭐'
                  : rating === 3
                  ? 'Cukup Baik ⭐⭐⭐'
                  : rating === 2
                  ? 'Perlu Perbaikan ⭐⭐'
                  : 'Sangat Perlu Evaluasi ⭐'}
              </span>
            </div>
          </div>

          {/* Judul Masukan */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">
              Judul Pokok Masukan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Usulan Filter Kelas pada Koreksi LJK"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
            />
          </div>

          {/* Pesan Masukan */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">
              Uraian Pesan / Deskripsi Masukan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan saran, kritik konstruktif, atau ulasan testimoni Anda secara detail..."
              required
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium resize-none leading-relaxed"
            />
          </div>

          {/* Footer Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirimkan...' : 'Kirim Masukan Sekarang'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
