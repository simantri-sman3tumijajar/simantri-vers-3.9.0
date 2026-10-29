import React from 'react';
import {
  ListOrdered,
  CheckCircle2,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CbtQuestionNavigationPanelProps {
  questions: any[];
  currentQuestionIdx: number;
  onSelectQuestion: (idx: number) => void;
  studentAnswers: Record<number, string>;
  raguQuestions: Record<number, boolean>;
  onFinishExam: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  answeredCount: number;
  raguCount: number;
  totalQuestionsCount: number;
  className?: string;
}

export const CbtQuestionNavigationPanel: React.FC<CbtQuestionNavigationPanelProps> = ({
  questions,
  currentQuestionIdx,
  onSelectQuestion,
  studentAnswers,
  raguQuestions,
  onFinishExam,
  isOpen,
  onToggleOpen,
  answeredCount,
  raguCount,
  totalQuestionsCount,
  className = '',
}) => {
  const effectiveTotal = totalQuestionsCount > 0 ? totalQuestionsCount : questions.length;
  const unansweredCount = Math.max(0, effectiveTotal - answeredCount);
  const completionPercentage = effectiveTotal > 0 ? Math.round((answeredCount / effectiveTotal) * 100) : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 
        KRITERIA 1: Kontainer utama memiliki padding internal yang sangat lega (p-5 sm:p-6 lg:p-7)
        sehingga daftar nomor tidak mepet ke tepi kotak.
      */}
      <div className="bg-white/95 backdrop-blur-xl p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/90 shadow-xl space-y-5 transition-all">
        {/* Header Panel Navigasi dengan Tombol Toggle Show/Hide Interaktif */}
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 leading-tight flex items-center gap-1.5">
                <span>Daftar Nomor Soal</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {effectiveTotal} Soal
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {answeredCount} Terjawab ({completionPercentage}%) &bull; {unansweredCount} Belum
              </p>
            </div>
          </div>

          {/* 
            KRITERIA 3: Tombol Toggle Interaktif (Show/Hide) dengan transisi halus 
            untuk menyembunyikan dan menampilkan panel daftar nomor soal.
          */}
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label={isOpen ? 'Sembunyikan Panel Nomor Soal' : 'Tampilkan Panel Nomor Soal'}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 shadow-2xs border border-slate-200/60"
            title={isOpen ? 'Sembunyikan panel agar lembar soal lebih leluasa' : 'Buka panel daftar nomor soal'}
          >
            {isOpen ? (
              <>
                <PanelRightClose className="w-4 h-4 text-slate-600" />
                <span className="font-bold">Sembunyikan</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4 text-indigo-600" />
                <span className="font-black text-indigo-600">Buka Panel</span>
              </>
            )}
          </button>
        </div>

        {/* Transisi Halus Konten Panel Menggunakan AnimatePresence & Motion */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="panel-content-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5 overflow-hidden"
            >
              {/* Progress Bar Pengerjaan Ujian */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Progres Pengerjaan Soal</span>
                  </span>
                  <span className="text-indigo-600 font-mono font-black">{completionPercentage}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* 
                KRITERIA 1 & 2: 
                - Kontainer utama memiliki padding internal yang lega (p-4 sm:p-5 lg:p-6), tidak mepet ke tepi kotak.
                - Tombol nomor soal disusun menggunakan CSS Grid dengan ukuran kotak yang seragam (proporsional aspect-square)
                  dan jarak (gap) yang rapi antar nomor.
              */}
              <div className="p-4 sm:p-5 lg:p-6 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-inner">
                <div className="px-1 py-1">
                  <div className="grid grid-cols-5 gap-2.5 sm:gap-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {questions.map((_, idx) => {
                      const isAns = Boolean(studentAnswers[idx]);
                      const isRagu = Boolean(raguQuestions[idx]);
                      const isCurrent = idx === currentQuestionIdx;

                      // Ukuran seragam proporsional (aspect-square) dengan status warna terstandar CBT
                      let btnColorStyle =
                        'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300 shadow-2xs';
                      if (isRagu) {
                        btnColorStyle =
                          'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black border-amber-500 shadow-2xs';
                      } else if (isAns) {
                        btnColorStyle =
                          'bg-emerald-600 hover:bg-emerald-700 text-white font-black border-emerald-700 shadow-2xs';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectQuestion(idx)}
                          aria-label={`Pindah ke soal nomor ${idx + 1}`}
                          className={`aspect-square w-full min-h-[44px] max-h-[52px] sm:min-h-[48px] rounded-xl sm:rounded-2xl font-mono font-extrabold text-xs sm:text-sm transition-all duration-150 cursor-pointer border flex items-center justify-center relative touch-manipulation active:scale-95 ${btnColorStyle} ${
                            isCurrent
                              ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white font-black scale-105 z-10 shadow-md'
                              : ''
                          }`}
                        >
                          {/* Indikator Titik Aktif (Active Question Beacon) */}
                          {isCurrent && (
                            <span
                              aria-hidden="true"
                              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white shadow-xs"
                            />
                          )}
                          <span>{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Keterangan / Legend Kode Warna Status Soal */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] font-bold text-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-lg bg-emerald-600 border border-emerald-700 shrink-0" />
                    <span>Sudah Dijawab</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-black">
                    {answeredCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-lg bg-amber-400 border border-amber-500 shrink-0" />
                    <span>Ragu-Ragu</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-mono font-black">
                    {raguCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-lg bg-white border border-slate-300 shrink-0" />
                    <span>Belum Dijawab</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-mono font-black">
                    {unansweredCount}
                  </span>
                </div>
              </div>

              {/* Tombol Aksi Selesai & Kumpulkan Ujian */}
              <button
                type="button"
                onClick={onFinishExam}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai &amp; Kumpulkan Ujian</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kondisi saat panel sedang disembunyikan/collapsed: Tampilkan tombol expand cepat */}
        {!isOpen && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onToggleOpen}
              className="w-full py-2.5 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-200 active:scale-95 shadow-2xs"
            >
              <PanelRightOpen className="w-4 h-4 text-indigo-600" />
              <span>Buka Daftar Nomor Soal ({answeredCount}/{effectiveTotal})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
