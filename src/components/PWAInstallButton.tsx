import React, { useState } from 'react';
import { Download, Laptop, Smartphone, CheckCircle2, X, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, isChrome, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isSuccessToast, setIsSuccessToast] = useState<boolean>(false);

  // Auto suppress button if application is already installed or running standalone
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Terpasang di Komputer</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setIsSuccessToast(true);
        setTimeout(() => setIsSuccessToast(false), 4000);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Banner Variant - Displayed prominently on Portal Selection View */}
      {variant === 'banner' ? (
        <div className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-lg border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-300 shadow-xs">
              <Laptop className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Install SiMantri di Komputer/PC (Google Chrome)
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Resmi PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Jadikan SiMantri aplikasi PC bawaan tanpa perlu buka browser. Akses lebih cepat, ringan, dan stabil.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-extrabold text-xs shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isInstallable ? 'Install Aplikasi Sekarang' : 'Petunjuk Install Chrome PC'}</span>
            </button>
          </div>
        </div>
      ) : variant === 'full' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${className}`}
        >
          <Laptop className="w-4 h-4 text-indigo-200" />
          <span>Install Aplikasi PC</span>
        </button>
      ) : (
        /* Compact Header Button Variant */
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white shadow-xs border border-indigo-400/30 active:scale-95 ${className}`}
          title="Install SiMantri sebagai aplikasi desktop PC di Google Chrome"
        >
          <Download className="w-3.5 h-3.5 text-indigo-100" />
          <span className="hidden sm:inline">Install Aplikasi PC</span>
        </button>
      )}

      {/* Success Toast */}
      {isSuccessToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-emerald-900 text-white shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h5 className="text-xs font-black">Aplikasi SiMantri Berhasil Terpasang!</h5>
            <p className="text-[11px] text-emerald-200">Aplikasi kini tersedia di Menu Start & Desktop PC Anda.</p>
          </div>
        </div>
      )}

      {/* Chrome PC & Mobile Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shrink-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Install SiMantri di Komputer / PC</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Panduan Deteksi Otomatis Google Chrome</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-300 overflow-y-auto flex-1">
              {/* Step 1: Chrome Desktop */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-sky-300 font-black">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span>Untuk Komputer / PC (Google Chrome &amp; Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300 font-medium">
                  <li>Lihat pada <strong>Bilah Alamat (Address Bar)</strong> Google Chrome di bagian atas kanan.</li>
                  <li>
                    Klik ikon <strong>Install / Tambahkan SiMantri</strong> (<Download className="w-3.5 h-3.5 inline text-sky-400" />) atau klik menu titik tiga (⋮) &gt; <strong>Simpan dan bagikan</strong> &gt; <strong>Install SiMantri</strong>.
                  </li>
                  <li>Konfirmasi <strong>Install</strong>. Aplikasi akan muncul langsung di Desktop &amp; Taskbar PC Anda.</li>
                </ol>
              </div>

              {/* Step 2: iOS / Mobile */}
              {isIOS && (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-black">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>Untuk iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300 font-medium">
                    <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.</li>
                    <li>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                  </ol>
                </div>
              )}

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>SiMantri menggunakan teknologi Progressive Web App (PWA) resmi tanpa perlu install file .exe tambahan.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
