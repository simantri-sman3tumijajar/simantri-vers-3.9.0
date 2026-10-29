import React, { useState, useEffect } from 'react';
import { Laptop, Download, X, ShieldCheck, CheckCircle2, Sparkles, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const ChromePCAutoInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isChrome, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isSuccessToast, setIsSuccessToast] = useState<boolean>(false);

  useEffect(() => {
    // If app is already running standalone or installed, don't show prompt
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    // Check last dismissal time from localStorage for periodic prompt (e.g., prompt every 2 days if dismissed)
    const lastDismissed = localStorage.getItem('smantri_pwa_prompt_dismissed');
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    if (lastDismissed && now - parseInt(lastDismissed, 10) < twoDaysMs) {
      setIsVisible(false);
      return;
    }

    // Automatically trigger prompt after 2.5 seconds on Google Chrome or PC/Desktop
    const timer = setTimeout(() => {
      // Detect if desktop/laptop PC
      const isDesktop = !/iphone|ipad|ipod|android/i.test(navigator.userAgent);
      if (isChrome || isDesktop || isInstallable) {
        setIsVisible(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isChrome]);

  const [showManualGuide, setShowManualGuide] = useState<boolean>(false);

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setIsSuccessToast(true);
        setIsVisible(false);
        setTimeout(() => setIsSuccessToast(false), 5000);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowManualGuide(false);
    localStorage.setItem('smantri_pwa_prompt_dismissed', Date.now().toString());
  };

  if (isSuccessToast) {
    return (
      <div className="fixed bottom-6 right-6 z-[99] p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-bounce max-w-sm">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        <div>
          <h5 className="text-xs font-black text-white">SiMantri Berhasil Terpasang di PC!</h5>
          <p className="text-[11px] text-emerald-300">Aplikasi kini dapat dibuka langsung dari Desktop PC Anda.</p>
        </div>
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90] w-full max-w-sm px-4 sm:px-0 animate-slide-up">
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 text-slate-100 shadow-2xl shadow-indigo-950/50 relative overflow-hidden">
        {/* Accent Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        {/* Top Header & Dismiss Button */}
        <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-tight">Install SiMantri di PC</span>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chrome
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Deteksi Otomatis Perangkat PC</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Tutup & Ingatkan Nanti"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description or Step-by-Step Guide */}
        {showManualGuide ? (
          <div className="mb-4 relative z-10 bg-slate-800/80 rounded-2xl p-3 border border-indigo-400/30 text-xs text-slate-200 space-y-2">
            <p className="font-bold text-indigo-300">Langkah Install SiMantri di Komputer (Chrome/Edge):</p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
              <li>Klik ikon <strong>Install (Download)</strong> di bilah alamat browser kanan atas.</li>
              <li>Atau klik menu titik tiga (<strong>⋮</strong>) &gt; <em>Simpan dan bagikan</em> &gt; <strong>Install SiMantri</strong>.</li>
              <li>Aplikasi SiMantri akan langsung terpasang di Desktop PC Anda.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowManualGuide(false)}
              className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600/50 hover:bg-indigo-600 text-white font-bold text-[11px] transition-colors"
            >
              Kembali
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed mb-4 relative z-10">
            Gunakan SiMantri sebagai aplikasi desktop komputer tanpa perlu membuka tab browser. Lebih cepat, ringan, dan stabil.
          </p>
        )}

        {/* Action Buttons */}
        {!showManualGuide && (
          <div className="flex items-center gap-2 relative z-10">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isInstallable ? 'Install Sekarang' : 'Petunjuk Install PC'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Nanti
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
