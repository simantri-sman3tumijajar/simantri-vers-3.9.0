import React, { useState } from 'react';
import { Wifi, WifiOff, Zap, ShieldCheck, Activity, Info, X } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkBandwidthBadge: React.FC = () => {
  const telemetry = useNetworkStatus();
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetailModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer btn-spring ${
          !telemetry.isOnline
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            : telemetry.quality === 'poor'
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            : telemetry.quality === 'fair'
            ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        }`}
        title={`${telemetry.qualityLabel}. Latensi: ${telemetry.rttMs}ms. Bandwidth: ${telemetry.downlinkMbps} Mbps.`}
      >
        {!telemetry.isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
        ) : telemetry.quality === 'poor' ? (
          <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        )}

        <span className="hidden md:inline">
          {!telemetry.isOnline
            ? 'Tersinkronisasi Lokal (Offline)'
            : telemetry.quality === 'poor'
            ? 'Bitrate Hemat'
            : telemetry.quality === 'fair'
            ? 'Jaringan 3G'
            : 'Sinyal Stabil'}
        </span>
      </button>

      {/* Lightweight Network Telemetry Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-black text-white">Status Telemetri &amp; Adaptasi Sinyal</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Kualitas Sinyal:</span>
                <span className="font-extrabold text-sky-300">{telemetry.qualityLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-semibold">Kecepatan Data:</span>
                  <span className="text-sm font-black text-emerald-400">{telemetry.downlinkMbps || '< 1'} Mbps</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-semibold">Latensi Jaringan:</span>
                  <span className="text-sm font-black text-amber-400">{telemetry.rttMs} ms</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-[11px] leading-relaxed">
                <Info className="w-3.5 h-3.5 text-indigo-400 inline mr-1" />
                SiMantri secara otomatis mengompresi payload data dan memprioritaskan fungsi teks ketika sinyal lemah agar hemat kuota dan tidak membebani perangkat.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDetailModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
