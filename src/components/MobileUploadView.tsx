import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Camera, Check, AlertCircle, Loader2, Send, Smartphone, Trash2, Plus, Upload, Image as ImageIcon, WifiOff, RefreshCw, CheckCircle2, Apple, Wifi, Unlink, AlertTriangle } from 'lucide-react';
import { compressImageBase64 } from '../utils/imageCompressor';
import { getNetworkSpeedStatus } from '../utils/networkOptimizer';

export const MobileUploadView: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [status, setStatus] = useState<'initializing' | 'connecting' | 'connected' | 'disconnected-by-laptop' | 'disconnected' | 'invalid' | 'error'>('initializing');
  const [disconnectMessage, setDisconnectMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const isDisconnectedByLaptopRef = useRef<boolean>(false);
  const heartbeatTimerRef = useRef<any>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const targetId = searchParams.get('target') || '';

  useEffect(() => {
    if (!targetId) {
      setStatus('error');
      setErrorMsg('Target ID tidak ditemukan di tautan URL. Silakan scan ulang QR Code dari layar Laptop/PC.');
      return;
    }

    isDisconnectedByLaptopRef.current = false;
    setStatus('connecting');

    // 1. Instant Server Relay Join (< 200ms connection time, bypasses mobile 4G CGNAT)
    const joinServerRelay = async () => {
      try {
        const res = await fetch('/api/mobile-sync/session/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: targetId,
            deviceInfo: `${navigator.userAgent} (${window.screen.width}x${window.screen.height})`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            setStatus('connected');
            setErrorMsg('');
            setDisconnectMessage('');
          } else if (data && data.status === 'invalid') {
            setStatus('invalid');
            setDisconnectMessage(data.message || 'Sesi Koreksi Massal pada laptop telah di-reload atau ditutup. QR Code lama sudah tidak berlaku.');
          }
        }
      } catch (e) {
        console.warn('Relay join warning:', e);
      }
    };

    joinServerRelay();

    // 2. Start fast heartbeat polling (1.5s interval) to instantly detect laptop page reload or disconnect signals
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mobile-sync/session/${encodeURIComponent(targetId)}/status?client=mobile&_t=${Date.now()}`);
        if (res.ok) {
          const sJson = await res.json();
          if (sJson && sJson.success) {
            if (sJson.status === 'invalid' || sJson.status === 'closed' || !sJson.exists) {
              isDisconnectedByLaptopRef.current = true;
              setStatus('invalid');
              setDisconnectMessage(
                sJson.disconnectMessage || 'Halaman Koreksi Massal pada browser laptop telah di-reload atau ditutup. QR Code lama sudah tidak valid.'
              );
            } else if (sJson.status === 'disconnected-by-laptop') {
              isDisconnectedByLaptopRef.current = true;
              setStatus('disconnected-by-laptop');
              setDisconnectMessage(
                sJson.disconnectMessage || 'Koneksi ke perangkat HP Android / Tablet telah diputuskan oleh Guru dari Laptop/PC.'
              );
            } else if (sJson.status === 'connected' && !isDisconnectedByLaptopRef.current) {
              setStatus('connected');
            }
          }
        }
      } catch (e) {}
    }, 1500);

    // 3. Initialize PeerJS client with Google cloud STUN servers as secondary direct data channel
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      connectToTarget(id);
    });

    peer.on('error', (err) => {
      console.warn('[PeerJS Mobile Warning]:', err);
      // If server relay is already connected, do not break mobile view
      if (!isDisconnectedByLaptopRef.current && status !== 'connected') {
        // Will rely on server relay
      }
    });

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      peer.destroy();
    };
  }, [targetId]);

  const connectToTarget = (myId: string) => {
    if (!peerRef.current || !targetId) return;

    const conn = peerRef.current.connect(targetId, {
      serialization: 'json',
    });

    connRef.current = conn;

    conn.on('open', () => {
      setStatus('connected');
      setErrorMsg('');
      setDisconnectMessage('');
    });

    conn.on('data', (data: any) => {
      if (data) {
        if (data.type === 'CONNECTION_CONFIRMED') {
          setStatus('connected');
          setErrorMsg('');
          setDisconnectMessage('');
        } else if (data.type === 'DISCONNECT_FROM_LAPTOP') {
          isDisconnectedByLaptopRef.current = true;
          setStatus('disconnected-by-laptop');
          setDisconnectMessage(
            data.message || 'Koneksi ke perangkat HP Android / Tablet telah diputuskan oleh Guru dari Laptop/PC.'
          );
        }
      }
    });

    conn.on('close', () => {
      if (isDisconnectedByLaptopRef.current) {
        setStatus('disconnected-by-laptop');
      }
    });

    conn.on('error', (err) => {
      console.warn('[WebRTC DataConnection Warning]:', err);
    });
  };

  const handleCaptureMultiple = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCompressing(true);
    setSendSuccess(false);

    try {
      const newImages: string[] = [];
      for (const file of files) {
        const compressed = await compressImageBase64(file);
        if (compressed) {
          newImages.push(compressed);
        }
      }

      if (newImages.length > 0) {
        setCapturedImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memproses berkas foto.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSendAll = async () => {
    if (capturedImages.length === 0 || status !== 'connected') {
      setErrorMsg('Koneksi belum aktif atau belum ada foto yang dipilih untuk dikirim.');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      // 1. Upload via High-Speed Server Relay (100% reliable across cellular & wifi networks)
      const uploadRes = await fetch(`/api/mobile-sync/session/${encodeURIComponent(targetId)}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: capturedImages,
        }),
      });

      let uploadSuccess = false;
      if (uploadRes.ok) {
        const upJson = await uploadRes.json();
        if (upJson && upJson.success) {
          uploadSuccess = true;
        }
      } else {
        const errJson = await uploadRes.json().catch(() => ({}));
        if (errJson && errJson.status === 'invalid') {
          setStatus('invalid');
          setDisconnectMessage(errJson.message || 'Halaman Koreksi Massal pada laptop telah di-reload atau ditutup.');
          throw new Error('Sesi laptop telah di-reload/ditutup. QR Code lama tidak valid lagi.');
        }
      }

      // 2. Also send via WebRTC DataConnection in parallel if channel is open
      if (connRef.current && connRef.current.open) {
        try {
          connRef.current.send({
            type: 'BATCH_PHOTO_UPLOAD',
            payload: capturedImages,
          });
          uploadSuccess = true;
        } catch (e) {
          console.warn('[WebRTC Data Send Warning]:', e);
        }
      }

      if (uploadSuccess) {
        const totalSent = capturedImages.length;
        setSentCount((prev) => prev + totalSent);
        setSendSuccess(true);
        setCapturedImages([]);

        setTimeout(() => {
          setSendSuccess(false);
        }, 5000);
      } else {
        throw new Error('Gagal mengirim ke server relay.');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal mengirim data foto: ${err.message || 'Kesalahan jaringan'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDisconnectFromHp = async () => {
    setIsSending(true);
    try {
      await fetch(`/api/mobile-sync/session/${encodeURIComponent(targetId)}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          by: 'mobile',
          message: 'Koneksi ke Laptop telah diputuskan langsung oleh pengguna HP.',
        }),
      });
    } catch (e) {}

    if (connRef.current) {
      try {
        connRef.current.close();
      } catch (e) {}
    }

    isDisconnectedByLaptopRef.current = true;
    setStatus('disconnected');
    setDisconnectMessage('Koneksi telah diputuskan langsung dari perangkat HP.');
    setIsSending(false);
  };

  const handleRetryConnect = () => {
    if (peerId) {
      connectToTarget(peerId);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-6 px-4 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-sky-600/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center relative z-10 max-w-md mx-auto w-full">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-2">
          <Smartphone className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Apple className="w-3 h-3 text-white shrink-0" />
            <span>iPhone (iOS) & Android</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Wifi className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>{getNetworkSpeedStatus().speedLabel} (Hotspot Safe)</span>
          </div>
        </div>
        <h1 className="text-lg font-black bg-gradient-to-r from-indigo-300 via-white to-sky-300 bg-clip-text text-transparent">
          Kamera HP & Tablet Lembar Jawaban
        </h1>
        <p className="text-[11px] text-slate-400 mt-1">
          Kompatibel dengan semua iPhone (iPhone 6 s.d. 16 Pro Max), Android & Tablet (semua provider & spesifikasi jaringan hotspot).
        </p>
      </div>

      {/* Main Card */}
      <div className="flex-1 flex flex-col justify-center items-center my-4 relative z-10 max-w-md mx-auto w-full">
        {/* Status Badges */}
        <div className="mb-4">
          {status === 'initializing' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              Inisialisasi Sesi Kamera...
            </span>
          )}
          {status === 'connecting' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Menghubungkan ke Laptop/PC...
            </span>
          )}
          {status === 'connected' && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Terhubung ke Laptop (Siap Memotret)
              </span>
              <button
                onClick={handleDisconnectFromHp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                title="Putuskan koneksi dari HP ke laptop"
              >
                <Unlink className="w-3.5 h-3.5 text-rose-400" />
                <span>Putuskan Koneksi dari HP ke Laptop</span>
              </button>
            </div>
          )}
          {status === 'invalid' && (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600/30 border border-amber-500 text-amber-300 text-xs font-black rounded-full shadow-sm animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Sesi Laptop Di-reload / Tidak Valid
            </span>
          )}
          {status === 'disconnected-by-laptop' && (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600/30 border border-rose-500 text-rose-300 text-xs font-black rounded-full shadow-sm">
              <WifiOff className="w-4 h-4 text-rose-400" />
              Koneksi Diputuskan oleh Laptop
            </span>
          )}
          {status === 'disconnected' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              Koneksi Terputus
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/30 border border-rose-600/50 text-rose-400 text-xs font-bold rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              Koneksi Gagal
            </span>
          )}
        </div>

        {/* Laptop Reloaded / Invalid Session Warning Banner */}
        {status === 'invalid' && (
          <div className="p-5 bg-amber-950/90 border-2 border-amber-600/70 rounded-3xl text-left text-xs text-amber-200 mb-4 w-full shadow-2xl space-y-3 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 text-amber-300 font-extrabold text-sm">
              <div className="p-2 bg-amber-600/30 rounded-2xl border border-amber-500/40 text-amber-400">
                <RefreshCw className="w-6 h-6 animate-spin-slow text-amber-300" />
              </div>
              <div>
                <h3 className="font-black text-amber-200 text-base">Sesi Tidak Valid / Laptop Di-reload</h3>
                <p className="text-[10px] text-amber-400/90 font-medium">Koneksi QR Code Lama Telah Berakhir</p>
              </div>
            </div>
            <p className="text-[11px] text-amber-100/90 leading-relaxed bg-amber-900/40 p-3 rounded-2xl border border-amber-800/40">
              {disconnectMessage || 'Halaman Koreksi Massal pada browser laptop telah di-reload, di-refresh, atau ditutup oleh Guru.'}
            </p>
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-[11px] space-y-2 text-slate-300">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>Petunjuk Menghubungkan Kembali:</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                <span>Buka kembali menu <b>Koreksi Massal</b> di Laptop/PC Guru.</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                <span>Klik <b>"Ambil Foto via HP"</b> untuk memunculkan <b>QR Code Baru</b>.</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">3</span>
                <span>Pindai (scan) QR Code baru tersebut dengan kamera HP Android/iOS ini.</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman HP</span>
            </button>
          </div>
        )}

        {/* Real-Time Disconnect by Laptop Warning Banner */}
        {status === 'disconnected-by-laptop' && (
          <div className="p-4 bg-rose-950/90 border-2 border-rose-600/70 rounded-3xl text-left text-xs text-rose-200 mb-4 w-full shadow-xl space-y-2 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2.5 text-rose-300 font-extrabold text-sm">
              <div className="p-1.5 bg-rose-600/30 rounded-xl border border-rose-500/30 text-rose-400">
                <WifiOff className="w-5 h-5" />
              </div>
              <span>Koneksi Diputuskan dari Laptop</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              {disconnectMessage || 'Guru di perangkat Laptop/PC telah menekan tombol "Putuskan Koneksi ke HP".'}
            </p>
            <div className="pt-2 border-t border-rose-800/60 text-[10px] text-rose-300">
              <b>Petunjuk:</b> Jika Anda ingin memotret atau mengirimkan lembar jawaban siswa kembali, silakan buka QR Code baru di Laptop dan scan ulang dengan kamera HP ini.
            </div>
          </div>
        )}

        {/* Display Generic Error Message */}
        {errorMsg && status !== 'disconnected-by-laptop' && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800/50 rounded-2xl text-center text-xs text-rose-300 mb-4 w-full flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-left flex-1">
              <h4 className="font-bold">Informasi Koneksi</h4>
              <p className="mt-0.5 text-rose-400/90 text-[11px]">{errorMsg}</p>
            </div>
            <button
              onClick={handleRetryConnect}
              className="p-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-lg text-[10px] shrink-0 font-bold"
              title="Coba Hubungkan Ulang"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Success Feedback Alert */}
        {sendSuccess && (
          <div className="p-3.5 bg-emerald-950/90 border border-emerald-800/60 rounded-2xl text-center text-xs text-emerald-300 mb-4 w-full animate-in fade-in">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="p-1 rounded-full bg-emerald-600 text-white">
                <Check className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-extrabold text-sm">Foto Berhasil Terkirim ke Laptop!</h4>
            </div>
            <p className="text-emerald-400/90 text-[11px]">
              Total {sentCount} foto telah tersinkronisasi ke lembar kerja guru.
            </p>
          </div>
        )}

        {/* Multi-Photo Workspace (When images are captured) */}
        {status === 'connected' && capturedImages.length > 0 ? (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>{capturedImages.length} Lembar Siap Dikirim</span>
              </span>
              <button
                onClick={() => setCapturedImages([])}
                className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-800/50 cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-3/4 rounded-xl overflow-hidden border border-slate-700 bg-black">
                  <img src={img} alt={`Lembar ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 rounded text-[9px] font-black">
                    #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions: Add More & Send All */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <label className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors text-center">
                <Camera className="w-4 h-4 text-indigo-400" />
                + Foto Lagi
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleCaptureMultiple}
                  className="hidden"
                  disabled={isSending}
                />
              </label>

              <button
                onClick={handleSendAll}
                disabled={isSending || status !== 'connected'}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/30 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer text-center"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Semua ({capturedImages.length})
                  </>
                )}
              </button>
            </div>
          </div>
        ) : status === 'connected' ? (
          /* Empty Capture Placeholder Trigger */
          <div className="w-full space-y-3">
            <label
              className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-500/40 rounded-3xl bg-indigo-950/20 text-center hover:bg-indigo-950/40 transition-colors cursor-pointer aspect-4/3"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-3 animate-pulse">
                {isCompressing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
              </div>
              <h3 className="font-black text-sm text-white">
                {isCompressing ? 'Memproses Berkas Foto...' : 'Buka Kamera HP'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                {isCompressing
                  ? 'Sedang melakukan rotasi & optimasi visual otomatis'
                  : 'Ambil foto lembar jawaban siswa (bisa 1, 2, 3 atau banyak lembar sekaligus)'}
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCaptureMultiple}
                className="hidden"
                disabled={status !== 'connected' || isCompressing}
              />
            </label>

            <label className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Atau Pilih Banyak Foto dari Galeri HP</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleCaptureMultiple}
                className="hidden"
                disabled={status !== 'connected' || isCompressing}
              />
            </label>
          </div>
        ) : status === 'invalid' ? null : (
          /* Fallback when not connected or disconnected by laptop */
          <div className="w-full p-8 border border-slate-800 rounded-3xl bg-slate-900/60 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {status === 'disconnected-by-laptop'
                ? 'Sesi telah diputuskan dari Laptop. Silakan scan ulang QR Code di layar Laptop untuk memulai sesi baru.'
                : 'Menghubungkan ke sesi Laptop/PC...'}
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center relative z-10 max-w-md mx-auto w-full text-[10px] text-slate-500">
        <p className="font-semibold text-slate-400">SMANTRI SMART ACADEMIC WebRTC Ultra-Vision</p>
        <p className="mt-0.5">
          {sentCount > 0 ? `${sentCount} lembar telah berhasil terkirim pada sesi ini.` : 'Tersambung langsung ke laptop guru secara real-time.'}
        </p>
      </div>
    </div>
  );
};
