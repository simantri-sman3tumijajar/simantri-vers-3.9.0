import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useAutosave } from '../context/AutosaveContext';
import { TeacherFeedback } from '../types';
import {
  MessageSquarePlus,
  Send,
  Sparkles,
  Star,
  CheckCircle2,
  Clock,
  MessageCircle,
  HelpCircle,
  HeartHandshake,
  Lightbulb,
  FileText,
  User,
  BookOpen,
  Check,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatMataPelajaran } from '../utils/subjectNormalization';

const CATEGORIES: TeacherFeedback['kategori'][] = [
  'Saran Fitur',
  'AI Vision & Koreksi',
  'Format Raport',
  'Bank Soal',
  'Kemudahan Penggunaan',
  'Apresiasi',
  'Lainnya',
];

export const TeacherFeedbackView: React.FC = () => {
  const { state, currentUser, saveFeedback, showToast } = useApp();
  const { t } = useLanguage();
  const { saveDraft, getDraft, removeDraft } = useAutosave();

  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<TeacherFeedback['kategori']>('Saran Fitur');
  const [pesan, setPesan] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft on mount if exists
  useEffect(() => {
    const draft = getDraft<{ judul: string; kategori: TeacherFeedback['kategori']; pesan: string; rating: number }>('feedback_draft');
    if (draft) {
      if (draft.judul) setJudul(draft.judul);
      if (draft.kategori) setKategori(draft.kategori);
      if (draft.pesan) setPesan(draft.pesan);
      if (draft.rating) setRating(draft.rating);
    }
  }, [getDraft]);

  // Autosave draft as teacher types
  useEffect(() => {
    if (judul.trim() || pesan.trim()) {
      saveDraft('feedback_draft', 'Draf Aspirasi Guru', {
        judul,
        kategori,
        pesan,
        rating,
      });
    }
  }, [judul, kategori, pesan, rating, saveDraft]);

  if (!currentUser) return null;

  // Filter feedbacks submitted by this teacher
  const myFeedbacks = (state.feedbacks || []).filter(
    (f) => f.teacherId === currentUser.id || f.teacherName === currentUser.nama
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !pesan.trim()) {
      showToast('Form Belum Lengkap', 'Silakan isi judul dan pesan masukan Anda.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const newFeedback: TeacherFeedback = {
        id: `fb-${Date.now()}`,
        teacherId: currentUser.id,
        teacherName: currentUser.nama,
        teacherNip: currentUser.nip,
        mataPelajaran: Array.isArray(currentUser.mataPelajaran)
          ? currentUser.mataPelajaran
          : typeof currentUser.mataPelajaran === 'string' && currentUser.mataPelajaran
          ? [currentUser.mataPelajaran]
          : [],
        judul: judul.trim(),
        kategori,
        pesan: pesan.trim(),
        rating,
        status: 'Baru',
        createdAt: new Date().toISOString(),
      };

      removeDraft('feedback_draft');
      setJudul('');
      setPesan('');
      setRating(5);
      setIsSubmitting(false);

      saveFeedback(newFeedback);
    } catch (err: any) {
      showToast('Gagal Mengirim', err.message || 'Terjadi kesalahan saat mengirim feedback.', 'error');
      setIsSubmitting(false);
    }
  };

  const paragraphCount = pesan.trim() ? pesan.split(/\n+/).filter(Boolean).length : 0;
  const wordCount = pesan.trim() ? pesan.trim().split(/\s+/).length : 0;
  const charCount = pesan.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-800/50">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 mb-3">
            <HeartHandshake className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t('Kanal Aspirasi Guru & Tenaga Pendidik SMAN 3 Tumijajar', 'Kanal Aspirasi Guru & Tenaga Pendidik SMAN 3 Tumijajar')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            {t('feedback.title', 'Umpan Balik & Saran Pengembangan Sistem')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t('feedback.subtitle', 'Suara dan pengalaman Anda saat menggunakan sistem ini sangat berharga. Anda dapat menuliskan saran, kebutuhan fitur baru, perbaikan koreksi AI Vision, format raport, hingga catatan tak terhingga yang langsung termonitor di dasbor Administrator.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Feedback Form (Left Column) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {t('Formulir Masukan & Saran Guru', 'Formulir Masukan & Saran Guru')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('Pesan akan langsung masuk ke Administrator secara real-time', 'Pesan akan langsung masuk ke Administrator secara real-time')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* User Details Preview */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{currentUser.nama}</div>
                  <div className="text-[11px] text-slate-500">
                    NIP: {currentUser.nip || '-'} • {t('assessment.teacher', 'Pengampu')}: {formatMataPelajaran(currentUser.mataPelajaran)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 self-start sm:self-auto">
                {t('Pengirim Terverifikasi', 'Pengirim Terverifikasi')}
              </span>
            </div>

            {/* Satisfaction Rating */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {t('Bagaimana Pengalaman Anda Menggunakan Sistem Ini?', 'Bagaimana Pengalaman Anda Menggunakan Sistem Ini?')}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverRating !== null ? star <= hoverRating : star <= rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">
                  {rating === 5 && t('Sangat Membantu & Puas', 'Sangat Membantu & Puas')}
                  {rating === 4 && t('Baik & Membantu', 'Baik & Membantu')}
                  {rating === 3 && t('Cukup Baik', 'Cukup Baik')}
                  {rating === 2 && t('Perlu Peningkatan', 'Perlu Peningkatan')}
                  {rating === 1 && t('Perlu Banyak Evaluasi', 'Perlu Banyak Evaluasi')}
                </span>
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {t('feedback.category', 'Kategori Masukan / Topik')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setKategori(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      kategori === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t(cat, cat)}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject/Title */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Judul / Inti Saran <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Usulan Penambahan Fitur Ekspor Raport Per Siswa / Evaluasi Koreksi Rumus Fisika"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Message with Unlimited Paragraphs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Uraian Lengkap Masukan & Saran (Paragraf Tak Terbatas) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <span>{paragraphCount} Paragraf</span>
                  <span>•</span>
                  <span>{wordCount} Kata</span>
                  <span>•</span>
                  <span>{charCount} Karakter</span>
                </div>
              </div>
              <textarea
                required
                rows={8}
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                placeholder="Tuliskan pengalaman, kendala teknis, ide pengembangan, atau saran sedetail mungkin. Anda bebas membuat banyak paragraf untuk menjelaskan secara lengkap..."
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                <em>Tip: Gunakan tombol Enter untuk membuat paragraf baru. Tidak ada batasan panjang teks.</em>
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Kirimkan Umpan Balik ke Administrator</span>
              </button>
            </div>
          </form>
        </div>

        {/* History of Sent Feedbacks (Right Column) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Riwayat Masukan Saya ({myFeedbacks.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status Respon</span>
            </div>

            {myFeedbacks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Lightbulb className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600 text-xs">Belum Ada Masukan Terkirim</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tuliskan saran atau kendala Anda di formulir sebelah kiri untuk membantu peningkatan aplikasi.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {myFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {fb.kategori}
                        </span>
                        <h4 className="font-bold text-slate-900 mt-1.5 text-xs">{fb.judul}</h4>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] shrink-0 ${
                          fb.status === 'Ditindaklanjuti'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : fb.status === 'Ditinjau'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {fb.status === 'Ditindaklanjuti' && 'Ditindaklanjuti'}
                        {fb.status === 'Ditinjau' && 'Ditinjau'}
                        {fb.status === 'Baru' && 'Terkirim'}
                      </span>
                    </div>

                    <p className="text-slate-700 whitespace-pre-line leading-relaxed text-[11px] bg-white p-2.5 rounded-xl border border-slate-100">
                      {fb.pesan}
                    </p>

                    {fb.adminNote && (
                      <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-200 text-[11px] text-indigo-950 space-y-0.5">
                        <div className="font-bold flex items-center gap-1 text-indigo-800 text-[10px] uppercase">
                          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                          <span>Tanggapan Administrator:</span>
                        </div>
                        <p>{fb.adminNote}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(fb.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {fb.rating && (
                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{fb.rating} / 5</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
