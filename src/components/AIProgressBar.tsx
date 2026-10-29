import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';

export interface ProgressStep {
  title: string;
  description: string;
}

interface AIProgressBarProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  steps?: ProgressStep[];
  activeStepIndex?: number;
  progressPercent: number; // 0 to 100
  estimatedSeconds?: number;
}

export const AIProgressBar: React.FC<AIProgressBarProps> = ({
  isOpen,
  title,
  subtitle,
  progressPercent,
  estimatedSeconds = 5,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsed((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPercent = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const remainingEstimate = Math.max(1, Math.round(estimatedSeconds - elapsed));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-md w-full p-6 text-white relative overflow-hidden my-auto flex flex-col"
      >
        {/* Glow ambient background circles */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Header: Icon, Judul, Sub-judul, and Timer Badge */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base text-white tracking-tight truncate">
                {title || 'Mengekstrak Soal & Rubrik Asesmen'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {subtitle || 'Gemini AI Vision sedang memproses dokumen & butir soal...'}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-xs font-mono font-bold text-indigo-300 shrink-0">
            {elapsed}s
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative z-10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Memproses Berkas ({currentPercent}%)</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
              Estimasi ~{remainingEstimate}s
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full p-0.5 border border-slate-700/80 overflow-hidden relative">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-md shadow-cyan-500/30"
              initial={{ width: '5%' }}
              animate={{ width: `${Math.max(5, currentPercent)}%` }}
              transition={{ ease: 'easeOut', duration: 0.25 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

