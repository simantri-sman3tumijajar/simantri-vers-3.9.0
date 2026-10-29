import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Loader2,
  Camera,
  Check,
  AlertCircle,
  RefreshCw,
  Unlink,
  WifiOff,
  ShieldCheck,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Apple,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { webrtcSession, WebRtcStatus } from '../utils/webrtcManager';
import { getNetworkSpeedStatus } from '../utils/networkOptimizer';
import { optimizeDocumentForAI } from '../utils/imageCompressor';

interface CrossDeviceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageReceived: (base64Image: string) => void;
  onImagesReceived?: (base64Images: string[]) => void;
  title?: string;
  subtitle?: string;
}

export const isMobileOrTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Mobile/i.test(ua);
  const isTouchAndSmall = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 1024;
  return isMobileUA || isTouchAndSmall;
};

export const CrossDeviceUploadModal: React.FC<CrossDeviceUploadModalProps> = ({
  isOpen,
  onClose,
  onImageReceived,
  onImagesReceived,
  title = 'Hubungkan Kamera HP (iPhone, Android & Tablet)',
  subtitle = 'Khusus perangkat HP iPhone / iOS, Android & Tablet (Semua Tipe & Merk) - Laptop untuk pantau progress',
}) => {
  const [status, setStatus] = useState<WebRtcStatus>(webrtcSession.getStatus());
  const [peerId, setPeerId] = useState<string>(webrtcSession.getPeerId());
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(webrtcSession.getQrCodeUrl());
  const [errorMsg, setErrorMsg] = useState<string>(webrtcSession.getErrorMessage());
  const [receivedImages, setReceivedImages] = useState<string[]>(webrtcSession.getReceivedImages());
  const [disconnectToast, setDisconnectToast] = useState<string | null>(null);
  const [isUploadingDirect, setIsUploadingDirect] = useState<boolean>(false);
  const [directFeedback, setDirectFeedback] = useState<string | null>(null);

  const disconnectTimerRef = useRef<any>(null);
  const isMobileDevice = isMobileOrTabletDevice();
  const networkStatus = getNetworkSpeedStatus();

  useEffect(() => {
    // Subscribe to persistent WebRTC singleton events
    const unsubscribe = webrtcSession.subscribe({
      onStatusChange: (newStatus, msg) => {
        setStatus(newStatus);
        setPeerId(webrtcSession.getPeerId());
        setQrCodeUrl(webrtcSession.getQrCodeUrl());
        if (msg) setErrorMsg(msg);
        else setErrorMsg('');
      },
      onImageReceived: (img) => {
        setReceivedImages((prev) => [...prev, img]);
        onImageReceived(img);
      },
      onImagesReceived: (imgs) => {
        setReceivedImages((prev) => [...prev, ...imgs]);
        if (onImagesReceived) {
          onImagesReceived(imgs);
        } else {
          imgs.forEach((img) => onImageReceived(img));
        }
      },
      onMobileDisconnect: (reason) => {
        setDisconnectToast(reason || 'Koneksi ke HP telah diputuskan secara real-time.');
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          setDisconnectToast(null);
        }, 4000);
      },
    });

    // If modal is opened and session is idle or uninitialized (and on laptop), start WebRTC
    if (isOpen && !isMobileDevice) {
      if (webrtcSession.getStatus() === 'idle' || !webrtcSession.getPeerId()) {
        webrtcSession.initSession();
      } else {
        setStatus(webrtcSession.getStatus());
        setPeerId(webrtcSession.getPeerId());
        setQrCodeUrl(webrtcSession.getQrCodeUrl());
        setReceivedImages(webrtcSession.getReceivedImages());
      }
    }

    return () => {
      unsubscribe();
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
    };
  }, [isOpen, onImageReceived, onImagesReceived, isMobileDevice]);

  const handleDisconnectHp = () => {
    webrtcSession.disconnectMobile();
  };

  const handleRefreshSession = () => {
    webrtcSession.initSession(true);
  };

  const handleDirectMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDirect(true);
    setDirectFeedback(null);

    try {
      const fileList = Array.from(files);
      const compressedList: string[] = [];

      for (const file of fileList) {
        const compressed = await optimizeDocumentForAI(file);
        if (compressed) {
          compressedList.push(compressed);
        }
      }

      if (compressedList.length > 0) {
        setReceivedImages((prev) => [...prev, ...compressedList]);
        if (onImagesReceived) {
          onImagesReceived(compressedList);
        } else {
          compressedList.forEach((img) => onImageReceived(img));
        }
        setDirectFeedback(`Berhasil mengunggah ${compressedList.length} foto lembar jawaban langsung dari HP/Tablet!`);
      } else {
        setDirectFeedback('Gagal memproses berkas foto.');
      }
    } catch (err: any) {
      setDirectFeedback('Kesalahan saat memproses foto dari HP.');
    } finally {
      setIsUploadingDirect(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl lg:max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto cursor-default"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 p-3.5 sm:p-4 text-white flex items-center justify-between gap-3 min-w-0 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 shrink-0">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm leading-tight break-words">
                {isMobileDevice ? 'Kamera & Unggah Lembar Jawaban (HP / Tablet)' : title}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-normal break-words">
                {isMobileDevice
                  ? 'Potret kamera HP / pilih foto dari galeri HP secara instan'
                  : subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disconnect Toast Alert - Briefly shown once and auto-dismisses without looping */}
        <AnimatePresence>
          {disconnectToast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex items-center justify-between gap-2 text-rose-700 text-xs font-semibold shrink-0"
            >
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{disconnectToast}</span>
              </div>
              <button
                onClick={() => setDisconnectToast(null)}
                className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-start space-y-4 overscroll-contain">
          {/* SPECIAL MOBILE HP & TABLET VIEW: QR CODE IS HIDDEN completely as per requirement 3 */}
          {isMobileDevice ? (
            <div className="w-full bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-xl text-center">
              <div className="p-3 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-2xl inline-block mb-1">
                <Camera className="w-8 h-8 text-indigo-300 animate-pulse mx-auto" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                Ambil Foto / Unggah Lembar Jawaban Langsung dari HP/Tablet
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Anda sedang membuka aplikasi dari HP Android/Tablet. Tidak perlu memindai QR Code, Anda dapat langsung mengambil foto dari kamera HP atau memilih file lembar jawaban dari galeri.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95">
                  {isUploadingDirect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Memproses Foto HP...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera HP & Potret</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleDirectMobileUpload}
                    className="hidden"
                    disabled={isUploadingDirect}
                  />
                </label>

                <label className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-extrabold text-xs border border-indigo-500/30 rounded-2xl shadow-md cursor-pointer transition-all active:scale-95">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Pilih Foto dari Galeri HP</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleDirectMobileUpload}
                    className="hidden"
                    disabled={isUploadingDirect}
                  />
                </label>
              </div>

              {directFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border mt-2 ${
                    directFeedback.includes('Berhasil')
                      ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                  }`}
                >
                  {directFeedback}
                </div>
              )}
            </div>
          ) : (
            /* LAPTOP / PC VIEW: Shows QR code for mobile scanning, BUT gallery QR button is removed as per requirement 2 */
            <div className="w-full flex flex-col md:flex-row items-start gap-4 sm:gap-6 justify-center">
              {/* Left Column: QR Code Display */}
              <div className="flex flex-col items-center justify-center space-y-3 shrink-0 mx-auto md:mx-0">
                {status === 'initializing' && (
                  <div className="w-52 h-52 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <span className="text-[10px] font-bold text-slate-500">Mempersiapkan WebRTC...</span>
                  </div>
                )}

                {status === 'error' && (
                  <div className="w-52 h-52 flex flex-col items-center justify-center border border-rose-200 rounded-3xl bg-rose-50 text-rose-600 p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-[10px] font-bold">Koneksi Gagal</span>
                    <p className="text-[9px] text-rose-500/90 mt-1">{errorMsg}</p>
                    <button
                      onClick={handleRefreshSession}
                      className="mt-3 px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Coba Lagi
                    </button>
                  </div>
                )}

                {(status === 'listening' || status === 'connected' || status === 'idle' || status === 'disconnected') && qrCodeUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative group p-3 bg-indigo-50 border border-indigo-100 rounded-3xl">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-48 h-48 rounded-2xl shadow-sm object-contain"
                      />
                      <span
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 text-white font-extrabold text-[9px] rounded-full shadow-xs uppercase tracking-wider ${
                          status === 'connected' ? 'bg-emerald-600' : 'bg-indigo-600'
                        }`}
                      >
                        {status === 'connected' ? 'HP TERHUBUNG' : 'SCAN DARI HP / iPHONE'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                    ID Room: <span className="font-bold text-indigo-600">{peerId || 'Memuat...'}</span>
                  </span>
                  <button
                    onClick={handleRefreshSession}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Ganti ID Room / Buat QR Baru"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Status & Tutorial for Laptop */}
              <div className="flex-1 space-y-3 w-full">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {status === 'initializing' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 break-words">Menghubungkan ke WebRTC Cloud...</span>
                        </>
                      )}
                      {(status === 'listening' || status === 'idle' || status === 'disconnected') && (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                          <span className="text-xs font-extrabold text-amber-700 break-words">Menunggu HP Terhubung...</span>
                        </>
                      )}
                      {status === 'connected' && (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                          <span className="text-xs font-extrabold text-emerald-700 break-words">HP Terhubung & Siap Mengirim!</span>
                        </>
                      )}
                    </div>

                    {status === 'connected' && (
                      <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-[9px] font-bold self-start sm:self-auto shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed break-words">
                    {status === 'connected'
                      ? 'Koneksi Peer-to-Peer aktif. Pemotretan dan pengiriman dari HP akan langsung masuk ke laptop ini secara otomatis.'
                      : 'Pindai QR Code di sebelah kiri dengan kamera HP iPhone (iOS) maupun Android / Tablet.'}
                  </p>
                </div>

                {/* Hotspot & Kuota Banner */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-indigo-950">
                    <p className="font-bold">Koneksi Tetap Aktif di Latar Belakang ({networkStatus.speedLabel})</p>
                    <p className="text-indigo-800/80 mt-0.5 leading-relaxed">
                      Menutup modal ini <b>TIDAK</b> memutuskan koneksi HP. Teroptimasi otomatis tanpa boros kuota.
                    </p>
                  </div>
                </div>

                {/* Tutorial Singkat Scan QR Code HP */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 rounded-2xl border border-amber-200/90 space-y-2 text-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Panduan Scan QR Code (iPhone & Android):</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                    <div className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-amber-100">
                      <span className="w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center font-black shrink-0 text-[8px] mt-0.5">1</span>
                      <div>
                        <strong className="text-amber-950 font-bold block flex items-center gap-1">
                          <span>Buka Kamera HP</span>
                          <Apple className="w-3 h-3 text-slate-700 inline" />
                        </strong>
                        <span className="text-slate-600">iPhone: Kamera Bawaan. Android: Google Lens / Kamera.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-amber-100">
                      <span className="w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center font-black shrink-0 text-[8px] mt-0.5">2</span>
                      <div>
                        <strong className="text-amber-950 font-bold block">Arahkan HP ke QR Code</strong>
                        <span className="text-slate-600">Arahkan lensa ke gambar QR Code di layar laptop.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-amber-100">
                      <span className="w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center font-black shrink-0 text-[8px] mt-0.5">3</span>
                      <div>
                        <strong className="text-amber-950 font-bold block">Klik Link Terdeteksi</strong>
                        <span className="text-slate-600">Ketuk banner / link pop-up di layar HP untuk membuka.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-amber-100">
                      <span className="w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center font-black shrink-0 text-[8px] mt-0.5">4</span>
                      <div>
                        <strong className="text-amber-950 font-bold block">Potret Lembar Jawaban</strong>
                        <span className="text-slate-600">Foto dikirim real-time ke laptop ini.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Received Photos Preview List */}
          {receivedImages.length > 0 && (
            <div className="w-full pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Foto Berhasil Diterima / Diunggah ({receivedImages.length}):</span>
                </h4>
                <button
                  onClick={() => {
                    setReceivedImages([]);
                    webrtcSession.clearHistory();
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Bersihkan Daftar
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {receivedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden border border-slate-300 shrink-0 w-16 h-16 bg-slate-100 shadow-2xs"
                  >
                    <img src={img} alt={`Img ${idx}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[8px] font-black text-white text-center py-0.5">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 shrink-0">
          <div>
            {!isMobileDevice && (
              <button
                type="button"
                onClick={handleDisconnectHp}
                disabled={status !== 'connected'}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Kirim sinyal putus koneksi ke perangkat HP Android/Tablet"
              >
                <Unlink className="w-3.5 h-3.5 text-rose-600" />
                <span>Putuskan Koneksi ke HP</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-colors inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Tutup</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
