import React, { useState, useEffect } from 'react';
import { networkOptimizer, NetworkStatus } from '../utils/networkOptimizer';
import {
  Wifi,
  WifiOff,
  Zap,
  Gauge,
  RefreshCw,
  Sparkles,
  Signal,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NetworkStatusBar: React.FC = () => {
  const [status, setStatus] = useState<NetworkStatus>(networkOptimizer.getStatus());
  const [isOpen, setIsOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    const unsub = networkOptimizer.subscribe((s) => {
      setStatus(s);
    });
    return unsub;
  }, []);

  const handlePing = async () => {
    setIsPinging(true);
    await networkOptimizer.measureLatency();
    setIsPinging(false);
  };

  const getQualityColor = () => {
    if (!status.isOnline) return 'text-rose-500 bg-rose-50 border-rose-200';
    if (status.quality === 'excellent') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status.quality === 'good') return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    if (status.quality === 'fair') return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-rose-700 bg-rose-50 border-rose-300';
  };

  const getQualityLabel = () => {
    if (!status.isOnline) return 'Offline';
    if (status.quality === 'excellent') return 'Sinyal Kuat';
    if (status.quality === 'good') return 'Sinyal Stabil';
    if (status.quality === 'fair') return 'Sinyal Cukup';
    return 'Sinyal Lemah';
  };

  return (
    <div className="relative">
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:shadow-xs ${getQualityColor()}`}
        title="Klik untuk Pengaturan Jaringan & Mode Hemat Kuota"
      >
        {status.isOnline ? (
          <Signal className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
        )}
        <span className="hidden sm:inline">{getQualityLabel()}</span>
        {status.isOnline && status.latencyMs > 0 && (
          <span className="text-[10px] opacity-75 font-mono">
            {status.latencyMs}ms
          </span>
        )}
        {status.isLiteMode && (
          <span className="w-2 h-2 rounded-full bg-amber-500" title="Mode Hemat Kuota Aktif" />
        )}
      </button>

      {/* Dropdown Modal / Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 text-xs space-y-3.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-indigo-600" />
                  <span className="font-extrabold text-slate-900">
                    Status Jaringan & Kuota
                  </span>
                </div>
                <button
                  onClick={handlePing}
                  disabled={isPinging}
                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  title="Uji Ulang Kecepatan / Ping"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status Details */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status Koneksi:</span>
                  <span className={`font-bold ${status.isOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {status.isOnline ? 'Terhubung (Online)' : 'Terputus (Offline)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Latensi / Ping Server:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {status.latencyMs > 0 ? `${status.latencyMs} ms` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tipe Jaringan Provider:</span>
                  <span className="font-bold uppercase text-slate-800">
                    {status.effectiveType}
                  </span>
                </div>
              </div>

              {/* Mode Hemat Kuota & Jaringan Rendah Toggle */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Mode Hemat Kuota & Sinyal Rendah</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={status.isLiteMode}
                    onChange={() => networkOptimizer.toggleLiteMode()}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Mengompresi data, menonaktifkan animasi berat, dan mempercepat loading di area minim sinyal/kuota terbatas.
                </p>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                Sistem secara otomatis menyesuaikan cache lokal untuk kelancaran guru di sekolah maupun di rumah.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
