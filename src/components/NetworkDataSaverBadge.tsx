import React, { useState, useEffect } from 'react';
import { Wifi, Gauge, ShieldAlert, Sparkles, Check, ChevronDown, Radio, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getNetworkSpeedStatus, 
  setDataSaverPreference, 
  subscribeNetworkStatus, 
  NetworkSpeedStatus, 
  DataSaverMode 
} from '../utils/networkOptimizer';

export const NetworkDataSaverBadge: React.FC = () => {
  const [status, setStatus] = useState<NetworkSpeedStatus>(getNetworkSpeedStatus());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeNetworkStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectMode = (mode: DataSaverMode) => {
    setDataSaverPreference(mode);
    setIsOpen(false);
  };

  const getModeBadgeColor = () => {
    if (status.activeMode === 'ULTRA_SAVER') return 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';
    if (status.activeMode === 'BALANCED_SAVER') return 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700';
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer hover:shadow-xs ${getModeBadgeColor()}`}
        title="Pengaturan Kecepatan Internet & Mode Hemat Kuota"
      >
        <Wifi className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        <span className="font-mono">{status.speedLabel}</span>
        <span className="hidden sm:inline border-l border-current/30 pl-1.5 text-[10px] font-semibold">
          {status.activeMode === 'ULTRA_SAVER' && 'Hemat Kuota (Hotspot)'}
          {status.activeMode === 'BALANCED_SAVER' && 'Adaptif (600k-1.2MB)'}
          {status.activeMode === 'HIGH_SPEED' && 'Kecepatan Tinggi'}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-70 ml-0.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 text-slate-800"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Jaringan & Hemat Kuota Data</h4>
                    <p className="text-[10px] text-slate-500">Estimasi Kecepatan: <strong className="text-slate-800">{status.speedLabel}</strong></p>
                  </div>
                </div>
              </div>

              {/* Status info box */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1 mb-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tipe Koneksi:</span>
                  <span className="font-bold text-slate-800 uppercase">{status.effectiveType || '4G/Wifi'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Saran Resolusi Foto:</span>
                  <span className="font-bold text-indigo-600">{status.suggestedDimension}px (Kualitas {Math.round(status.suggestedQuality * 100)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Batas Ukuran Upload:</span>
                  <span className="font-bold text-emerald-600">~{Math.round(status.maxUploadSizeBytes / 1024)} KB / foto</span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Pilih Mode Transfer Data:</p>

                <button
                  type="button"
                  onClick={() => handleSelectMode('auto')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    status.userPreference === 'auto'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="leading-tight">Otomatis (Adaptif Network)</p>
                      <p className="text-[9px] text-slate-500 font-normal">Menyesuaikan kondisi internet HP/Hotspot secara dinamis.</p>
                    </div>
                  </div>
                  {status.userPreference === 'auto' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('high_saver')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    status.userPreference === 'high_saver'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <p className="leading-tight">Hemat Kuota Maksimal (600 kb/s)</p>
                      <p className="text-[9px] text-slate-500 font-normal">Kompresi ekstra hemat untuk HP Hotspot & sinyal minim.</p>
                    </div>
                  </div>
                  {status.userPreference === 'high_saver' && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('balanced')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    status.userPreference === 'balanced'
                      ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <div>
                      <p className="leading-tight">Seimbang Hotspot (1.2 MB/s)</p>
                      <p className="text-[9px] text-slate-500 font-normal">Ideal untuk 600 kb/s s.d. 1.2 MB/s tanpa leg.</p>
                    </div>
                  </div>
                  {status.userPreference === 'balanced' && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('full_speed')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    status.userPreference === 'full_speed'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="leading-tight">Kualitas Tinggi / Full Speed</p>
                      <p className="text-[9px] text-slate-500 font-normal">Resolusi foto maksimal untuk koneksi Wi-Fi / 5G cepat.</p>
                    </div>
                  </div>
                  {status.userPreference === 'full_speed' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
