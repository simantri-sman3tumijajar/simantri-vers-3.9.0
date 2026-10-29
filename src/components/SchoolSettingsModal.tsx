import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolInfo } from '../types';
import { Calculator, Settings, X, Upload, Save, Building, UserCheck, Calendar, Sliders, Database, Download, UploadCloud, ShieldCheck, FolderOpen, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Trash2, Wifi, Zap, Wrench, ShieldAlert, Power, Lock, LockOpen, Users, Eye, EyeOff, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImageBase64 } from '../utils/imageCompressor';
import { processSignatureImage, DEFAULT_OFFICIAL_SIGNATURE_ASSET } from '../utils/signatureImageHelper';
import { verifyGoogleDriveLink, DriveLinkVerificationResult } from '../utils/driveVerifier';
import { webrtcSession } from '../utils/webrtcManager';
import { STUDENT_LOCK_PRESETS } from '../utils/studentPortalLockHelper';
import { Loader2 } from 'lucide-react';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    state,
    updateSchoolInfo,
    exportBackupJSON,
    importBackupJSON,
    cleanSystemGarbage,
    networkProfile,
    setNetworkPreference,
    showToast,
  } = useApp();

  const [formData, setFormData] = useState<SchoolInfo>({
    provinsiText: 'PEMERINTAH PROVINSI LAMPUNG',
    namaSekolah: 'SMA NEGERI 3 TUMIJAJAR',
    npsn: '69955116',
    nss: '30.1.1812.02.021',
    akreditasi: 'B',
    alamat: 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794',
    email: 'smantitumijajar@gmail.com',
    website: 'https://sman3tumijajar.sch.id',
    kepalaSekolah: 'Erlita Yuani Putri, M.Pd.',
    nipKepalaSekolah: '19850202 200804 2 003',
    tandaTanganKepsekUrl: DEFAULT_OFFICIAL_SIGNATURE_ASSET,
    tahunAjaranAktif: '2026/2027',
    semesterAktif: 'Ganjil',
    kktpDefault: 75,
    logoProvinsiUrl: 'https://iili.io/n1vlpFS.png',
    logoSekolahUrl: 'https://iili.io/n1vlf2t.png',
    logoSekolahScale: 100,
    judulKartuUjian: 'KARTU PESERTA CBT PENILAIAN AKHIR SEMESTER',
    qrCodeKartuUrl: '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png',
  });
  const [logoPreview, setLogoPreview] = useState<string>('https://iili.io/n1vlf2t.png');
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string>('/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png');
  const [saving, setSaving] = useState(false);

  // Independent verification states for each of the 4 Google Drive links
  const [verifSoalSTS, setVerifSoalSTS] = useState<DriveLinkVerificationResult | null>(null);
  const [verifSoalSAS, setVerifSoalSAS] = useState<DriveLinkVerificationResult | null>(null);
  const [verifRaporSTS, setVerifRaporSTS] = useState<DriveLinkVerificationResult | null>(null);
  const [verifRaporSAS, setVerifRaporSAS] = useState<DriveLinkVerificationResult | null>(null);

  const [loadingSoalSTS, setLoadingSoalSTS] = useState(false);
  const [loadingSoalSAS, setLoadingSoalSAS] = useState(false);
  const [loadingRaporSTS, setLoadingRaporSTS] = useState(false);
  const [loadingRaporSAS, setLoadingRaporSAS] = useState(false);

  useEffect(() => {
    if (isOpen && state?.schoolInfo) {
      setFormData({ 
        ...state.schoolInfo,
        judulKartuUjian: state.schoolInfo.judulKartuUjian || 'KARTU PESERTA CBT PENILAIAN AKHIR SEMESTER',
        qrCodeKartuUrl: state.schoolInfo.qrCodeKartuUrl || '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png',
      });
      setLogoPreview(state.schoolInfo.logoSekolahUrl || 'https://iili.io/n1vlf2t.png');
      setSignaturePreview(state.schoolInfo.tandaTanganKepsekUrl || null);
      setQrPreview(state.schoolInfo.qrCodeKartuUrl || '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png');

      // Auto-verify each independent link when modal opens
      if (state.schoolInfo.driveSoalUrlSTS) {
        verifyGoogleDriveLink(state.schoolInfo.driveSoalUrlSTS).then(setVerifSoalSTS);
      }
      if (state.schoolInfo.driveSoalUrlSAS) {
        verifyGoogleDriveLink(state.schoolInfo.driveSoalUrlSAS).then(setVerifSoalSAS);
      }
      if (state.schoolInfo.driveRaporUrlSTS) {
        verifyGoogleDriveLink(state.schoolInfo.driveRaporUrlSTS).then(setVerifRaporSTS);
      }
      if (state.schoolInfo.driveRaporUrlSAS) {
        verifyGoogleDriveLink(state.schoolInfo.driveRaporUrlSAS).then(setVerifRaporSAS);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImageBase64(file, 300, 0.85);
      if (base64) {
        setLogoPreview(base64);
        setFormData((prev) => ({ ...prev, logoSekolahUrl: base64 }));
      }
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImageBase64(file, 450, 0.9);
      if (base64) {
        // Run anti-black background processor to ensure clean alpha transparency
        const cleanPng = await processSignatureImage(base64);
        setSignaturePreview(cleanPng);
        setFormData((prev) => ({ ...prev, tandaTanganKepsekUrl: cleanPng }));
        showToast('Tanda Tangan & Stempel Terunggah', 'Gambar tanda tangan & stempel Kepala Sekolah diproses transparan dan siap digunakan pada cetak kartu.', 'success');
      }
    }
  };

  const handleRemoveSignature = () => {
    setSignaturePreview(null);
    setFormData((prev) => ({ ...prev, tandaTanganKepsekUrl: '' }));
    showToast('Tanda Tangan Dihapus', 'Tanda tangan digital Kepala Sekolah telah dikosongkan.', 'info');
  };

  const handleQRCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImageBase64(file, 400, 0.92);
      if (base64) {
        setQrPreview(base64);
        setFormData((prev) => ({ ...prev, qrCodeKartuUrl: base64 }));
        showToast('QR Code Terunggah', 'Gambar QR Code resmi kartu ujian berhasil diperbarui.', 'success');
      }
    }
  };

  const handleResetQRCode = () => {
    const defaultQR = '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png';
    setQrPreview(defaultQR);
    setFormData((prev) => ({ ...prev, qrCodeKartuUrl: defaultQR }));
    showToast('QR Code Direset', 'QR Code dikembalikan ke aset resmi sistem SiMantri.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchoolInfo(formData);
      onClose();
    } catch (err) {
      console.error('Failed to update school info:', err);
      showToast('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto cursor-default"
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Pengaturan Sekolah & Format Kop Surat</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-extrabold text-[10px]">
                  v.3.9.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Sesuaikan data identitas resmi SMAN 3 Tumijajar</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs overscroll-contain">
            {/* Section 0: Kontrol Akses Portal Peserta Didik (Siswa) */}
          <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 rounded-2xl border-2 border-amber-200/90 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Kontrol Akses Portal Peserta Didik (Siswa)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Atur status kunci/buka tombol portal siswa untuk pemeliharaan &amp; penataan menu
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle Button */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {formData.studentPortalLocked ? (
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>TERKUNCI BY ADMIN</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>TERBUKA (AKTIF)</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      studentPortalLocked: !prev.studentPortalLocked,
                    }))
                  }
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    formData.studentPortalLocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {formData.studentPortalLocked ? (
                    <>
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Buka Akses Siswa</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Akses Siswa</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preset Pilihan Alasan Kunci 1-Klik */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-800 text-[11px]">
                Pilih Preset Alasan Penguncian Ujian CBT (1-Klik):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STUDENT_LOCK_PRESETS.map((p) => {
                  const isSelected = (formData.studentPortalLockPreset || 'di_luar_jadwal') === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          studentPortalLockPreset: p.id,
                          studentPortalLockTitle: p.title,
                          studentPortalLockReason: p.description,
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all text-[11px] cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs font-bold'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-amber-300/80 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="truncate">{p.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </div>
                      <span className={`text-[9.5px] block truncate ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                        {p.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs for Title and Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                  Judul Status Penguncian (Tampil di Tombol &amp; Kartu Siswa):
                </label>
                <input
                  type="text"
                  value={formData.studentPortalLockTitle || 'Akses Ujian CBT Belum Dibuka (Di Luar Jadwal Sesi)'}
                  onChange={(e) => setFormData({ ...formData, studentPortalLockTitle: e.target.value })}
                  placeholder="Judul status penguncian..."
                  className="w-full p-2.5 bg-white border border-amber-300/80 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                  Jadwal / Waktu Pembukaan Sesi Berikutnya (Opsional):
                </label>
                <input
                  type="text"
                  value={formData.studentPortalNextSessionInfo || ''}
                  onChange={(e) => setFormData({ ...formData, studentPortalNextSessionInfo: e.target.value })}
                  placeholder="Contoh: Sesi 1 dimulai pukul 07:30 WIB"
                  className="w-full p-2.5 bg-white border border-amber-300/80 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                Rincian Deskripsi / Pesan Penjelasan untuk Siswa:
              </label>
              <textarea
                rows={2}
                value={formData.studentPortalLockReason || 'Ruang ujian hanya dibuka sesuai jadwal mata pelajaran dan sesi yang berlangsung.'}
                onChange={(e) => setFormData({ ...formData, studentPortalLockReason: e.target.value })}
                placeholder="Tuliskan pesan penjelasan untuk siswa..."
                className="w-full p-2.5 bg-white border border-amber-300/80 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
              />
            </div>

            {/* Visibilitas Sembunyikan / Tampilkan Tombol Peserta Didik */}
            <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Sembunyikan / Tampilkan Tombol Peserta Didik di Halaman Utama Welcome</span>
                </label>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                  {formData.studentPortalHidden
                    ? 'Status saat ini: DISEMBUNYIKAN dari halaman utama welcome.'
                    : 'Status saat ini: DITAMPILKAN di halaman utama welcome.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    studentPortalHidden: !prev.studentPortalHidden,
                  }))
                }
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  formData.studentPortalHidden
                    ? 'bg-purple-700 hover:bg-purple-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                {formData.studentPortalHidden ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tampilkan Tombol Siswa</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    <span>Sembunyikan Tombol Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 0b: Kunci & Kontrol Akses Modul Tugas Formatif (Tugas Harian) */}
          <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-slate-50 rounded-2xl border-2 border-amber-300 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${
                  formData.formatifLocked !== false
                    ? 'bg-amber-600 shadow-sm'
                    : 'bg-emerald-600 shadow-sm'
                }`}>
                  <BookOpen className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base flex flex-wrap items-center gap-2">
                    <span>Kunci Modul Tugas Formatif (Tugas Harian)</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                      formData.formatifLocked !== false
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {formData.formatifLocked !== false ? 'TERKUNCI (DALAM PENGEMBANGAN VIA PROMPT)' : 'TERBUKA (SISTEM SIAP DIGUNAKAN)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">
                    Kunci tombol akses modul Tugas Formatif selama sistem masih dalam pengembangan via prompt. Khusus Operator, Guru Mapel, dan Kepala Sekolah yang nampak hanya ikon gembok dan pemberitahuan terkunci. Administrator memiliki keleluasaan penuh untuk mengelola dan menguji sistem via prompt.
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle Button */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      formatifLocked: prev.formatifLocked === false ? true : false,
                      formatifLockReason: prev.formatifLockReason || 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.',
                    }))
                  }
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95 ${
                    formData.formatifLocked !== false
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {formData.formatifLocked !== false ? (
                    <>
                      <LockOpen className="w-4 h-4 stroke-[2.5]" />
                      <span>Buka Akses Formatif (Siap)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 stroke-[2.5]" />
                      <span>Kunci Modul Formatif (Dev)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lock Reason Notice Input */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                Pesan Pemberitahuan untuk Guru Mapel, Operator, &amp; Kepala Sekolah saat Modul Terkunci:
              </label>
              <input
                type="text"
                value={
                  formData.formatifLockReason ||
                  'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.'
                }
                onChange={(e) =>
                  setFormData({ ...formData, formatifLockReason: e.target.value })
                }
                placeholder="Tuliskan pesan pemberitahuan pengembangan untuk guru dan operator..."
                className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
              />
            </div>

            <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-200/90 text-[11px] text-amber-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Keleluasaan Administrator:</strong> Meskipun berstatus terkunci, akun Admin dapat bebas masuk, mengedit, membuat tugas, dan mengembangkan fitur via prompt tanpa batasan.
              </span>
            </div>
          </div>

          
            {/* Section 0c: Kunci & Kontrol Akses Modul Rekapitulasi Nilai & Leger Siswa */}
            <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-slate-50 rounded-2xl border-2 border-indigo-300 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-white ${formData.rekapNilaiLocked ? 'bg-amber-600 shadow-sm' : 'bg-indigo-600 shadow-sm'}`}>
                    <Calculator className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base flex flex-wrap items-center gap-2">
                      <span>Modul Rekapitulasi Nilai &amp; Leger Siswa (IKM)</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${formData.rekapNilaiLocked ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                        {formData.rekapNilaiLocked ? 'TERKUNCI BY ADMIN' : 'TERBUKA (AKTIF)'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">
                      Atur status kunci (lock) dan tampilkan/sembunyikan (hide) modul Rekapitulasi Nilai &amp; Leger Siswa untuk Guru, Operator &amp; Kepala Sekolah.
                    </p>
                  </div>
                </div>

                {/* Lock Toggle Button */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        rekapNilaiLocked: !prev.rekapNilaiLocked,
                        rekapNilaiLockReason: prev.rekapNilaiLockReason || 'Modul Rekapitulasi Nilai & Leger Siswa saat ini sedang dikunci oleh Administrator.',
                      }))
                    }
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95 ${formData.rekapNilaiLocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
                  >
                    {formData.rekapNilaiLocked ? (
                      <>
                        <LockOpen className="w-4 h-4 stroke-[2.5]" />
                        <span>Buka Akses Rekap &amp; Leger</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 stroke-[2.5]" />
                        <span>Kunci Modul Rekap &amp; Leger</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lock Reason Notice Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                  Pesan Pemberitahuan untuk Guru &amp; Operator saat Modul Terkunci:
                </label>
                <input
                  type="text"
                  value={
                    formData.rekapNilaiLockReason ||
                    'Modul Rekapitulasi Nilai & Leger Siswa saat ini sedang dikunci oleh Administrator.'
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, rekapNilaiLockReason: e.target.value })
                  }
                  placeholder="Tuliskan pesan pemberitahuan kuncian untuk guru dan operator..."
                  className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                />
              </div>

              {/* Hide/Show Toggle */}
              <div className="pt-3 border-t border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Sembunyikan / Tampilkan Modul dari Menu Portal &amp; Sidebar</span>
                  </label>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                    {formData.rekapNilaiHidden
                      ? 'Status saat ini: DISEMBUNYIKAN dari menu non-admin.'
                      : 'Status saat ini: DITAMPILKAN di menu portal & sidebar.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      rekapNilaiHidden: !prev.rekapNilaiHidden,
                    }))
                  }
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${formData.rekapNilaiHidden ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                >
                  {formData.rekapNilaiHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-300" />
                      <span>Tampilkan Modul</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      <span>Sembunyikan Modul</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section 0d: Kontrol & Visibilitas Modul Asesmen Literasi-Numerasi (LitNum) */}
            <div className="p-4 bg-gradient-to-r from-teal-50/90 via-emerald-50/60 to-slate-50 rounded-2xl border-2 border-teal-300 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-white ${formData.litnumModuleSettings?.isLocked ? 'bg-amber-600 shadow-sm' : 'bg-teal-600 shadow-sm'}`}>
                    <BookOpen className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base flex flex-wrap items-center gap-2">
                      <span>Modul Asesmen Literasi &amp; Numerasi (LitNum)</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${formData.litnumModuleSettings?.isLocked ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                        {formData.litnumModuleSettings?.isLocked ? 'TERKUNCI / PEMELIHARAAN' : 'AKTIF BERJALAN'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">
                      Pengaturan visibilitas menu di sidebar serta status akses pengerjaan LitNum bagi siswa dan guru.
                    </p>
                  </div>
                </div>

                {/* Lock/Active Toggle Button */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        litnumModuleSettings: {
                          ...(prev.litnumModuleSettings || {}),
                          isLocked: !prev.litnumModuleSettings?.isLocked,
                        },
                      }))
                    }
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95 ${formData.litnumModuleSettings?.isLocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
                  >
                    {formData.litnumModuleSettings?.isLocked ? (
                      <>
                        <LockOpen className="w-4 h-4 stroke-[2.5]" />
                        <span>Buka Akses LitNum (Aktif)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 stroke-[2.5]" />
                        <span>Kunci Pengerjaan LitNum</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Maintenance / Lock Reason Notice Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                  Pesan Pemberitahuan untuk Siswa saat Modul LitNum Terkunci:
                </label>
                <input
                  type="text"
                  value={
                    formData.litnumModuleSettings?.maintenanceNotice ||
                    'Modul Asesmen LitNum sedang dalam penyesuaian jadwal atau pemeliharaan berkala oleh Koordinator LitNum.'
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      litnumModuleSettings: {
                        ...(formData.litnumModuleSettings || {}),
                        maintenanceNotice: e.target.value,
                      },
                    })
                  }
                  placeholder="Tuliskan pesan pemberitahuan kuncian untuk siswa..."
                  className="w-full p-2.5 bg-white border border-teal-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
                />
              </div>

              {/* 3 Visibility Modes for LitNum on Welcome / Nav */}
              <div className="space-y-1.5 pt-2 border-t border-teal-200">
                <label className="block font-bold text-slate-800 text-[11px]">
                  Mode Kontrol Visibilitas Tombol CBT LitNum di Halaman Welcome:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'auto',
                      title: 'Otomatis Sesuai Jadwal',
                      subtitle: 'Rutin Selasa & Rabu (Auto-Hide)',
                    },
                    {
                      id: 'force_show',
                      title: 'Paksa Tampil (Aktif)',
                      subtitle: 'Selalu muncul jika akses buka',
                    },
                    {
                      id: 'force_hide',
                      title: 'Paksa Sembunyikan',
                      subtitle: 'Selalu disembunyikan (Nonaktif)',
                    },
                  ].map((m) => {
                    const activeMode = formData.litnumVisibilityMode || formData.litnumModuleSettings?.visibilityMode || 'auto';
                    const isSelected = activeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            litnumVisibilityMode: m.id as any,
                            litnumModuleSettings: {
                              ...(prev.litnumModuleSettings || {}),
                              visibilityMode: m.id as any,
                              isHidden: m.id === 'force_hide',
                            },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-800 shadow-xs font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-teal-300 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-extrabold">{m.title}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-[10px] block ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                          {m.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hide/Show Toggle Helper */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-teal-600" />
                    <span>Sembunyikan / Tampilkan Modul LitNum dari Menu Navigasi &amp; Portal Siswa</span>
                  </label>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                    {formData.litnumModuleSettings?.isHidden || formData.litnumVisibilityMode === 'force_hide'
                      ? 'Status saat ini: DISEMBUNYIKAN dari navigasi portal & sidebar umum.'
                      : 'Status saat ini: DITAMPILKAN di menu portal & sidebar.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentlyHidden = Boolean(formData.litnumModuleSettings?.isHidden || formData.litnumVisibilityMode === 'force_hide');
                    const nextHidden = !currentlyHidden;
                    setFormData((prev) => ({
                      ...prev,
                      litnumVisibilityMode: nextHidden ? 'force_hide' : 'auto',
                      litnumModuleSettings: {
                        ...(prev.litnumModuleSettings || {}),
                        isHidden: nextHidden,
                        visibilityMode: nextHidden ? 'force_hide' : 'auto',
                      },
                    }));
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    formData.litnumModuleSettings?.isHidden || formData.litnumVisibilityMode === 'force_hide'
                      ? 'bg-teal-700 hover:bg-teal-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  {formData.litnumModuleSettings?.isHidden || formData.litnumVisibilityMode === 'force_hide' ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-300" />
                      <span>Tampilkan Modul LitNum</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      <span>Sembunyikan Modul LitNum</span>
                    </>
                  )}
                </button>
              </div>
            </div>


          {/* Section 1: Logo & Scale */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Logo Sekolah & Ukuran Proporsi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
                <img
                  src={logoPreview}
                  alt="Preview Logo"
                  style={{ transform: `scale(${formData.logoSekolahScale / 100})` }}
                  className="h-20 w-20 object-contain transition-transform"
                />
                <span className="text-[10px] text-slate-400 mt-2">Pratinjau Logo</span>
              </div>

              <div className="sm:col-span-2 space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unggah Logo Sekolah Baru</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 cursor-pointer font-medium w-fit">
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Gambar (PNG/JPG)</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1">Logo akan otomatis tampil pada kop surat PDF / Word di sebelah kanan.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Skala Ukuran Logo ({formData.logoSekolahScale}%)</label>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={formData.logoSekolahScale}
                    onChange={(e) => setFormData({ ...formData, logoSekolahScale: Number(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Tahun Ajaran & Semester Aktif */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                required
                value={formData.tahunAjaranAktif}
                onChange={(e) => setFormData({ ...formData, tahunAjaranAktif: e.target.value })}
                placeholder="2026/2027"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Semester Aktif</label>
              <select
                value={formData.semesterAktif}
                onChange={(e) => setFormData({ ...formData, semesterAktif: e.target.value as any })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Ganjil">Semester 1 (Ganjil)</option>
                <option value="Genap">Semester 2 (Genap)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Identitas Lembaga & Kop */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              Teks Kop Surat Resmi
            </h4>

            <div className="mb-3">
              <label className="block font-medium text-slate-600 mb-1">Pemerintah Provinsi</label>
              <input
                type="text"
                value={formData.provinsiText}
                onChange={(e) => setFormData({ ...formData, provinsiText: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={formData.namaSekolah}
                  onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">NPSN</label>
                <input
                  type="text"
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Akreditasi</label>
                <input
                  type="text"
                  value={formData.akreditasi}
                  onChange={(e) => setFormData({ ...formData, akreditasi: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">E-mail Sekolah</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Website Resmi</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Kepala Sekolah & Penandatangan Resmi */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Kepala Sekolah & Penandatangan Dokumen Resmi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={formData.kepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, kepalaSekolah: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={formData.nipKepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Upload Tanda Tangan Kepala Sekolah */}
            <div className="pt-3 border-t border-slate-200">
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                Tanda Tangan Digital Kepala Sekolah (Cetak Kartu Ujian &amp; Berita Acara)
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Format yang didukung: <strong>.PNG (transparan)</strong> atau <strong>.JPG</strong>. Tanda tangan ini otomatis dimuat pada blok pengesahan Kartu Peserta Ujian CBT &amp; LitNum.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                {/* Preview Box */}
                <div className="w-40 h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px]">
                  {signaturePreview ? (
                    <img
                      src={signaturePreview}
                      alt="Tanda Tangan Kepala Sekolah"
                      className="max-h-16 max-w-[140px] object-contain drop-shadow-xs"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium text-center px-2">
                      Belum ada tanda tangan
                    </span>
                  )}
                </div>

                {/* Upload & Actions */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 cursor-pointer font-bold text-xs transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{signaturePreview ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>

                    {signaturePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 font-bold text-xs transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {signaturePreview
                      ? '✓ Tanda tangan aktif siap dirender ke dalam PDF Kartu Ujian.'
                      : 'Pilih file tanda tangan berlatar belakang transparan untuk hasil cetak terbaik.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4b: Format Kartu Peserta Ujian CBT (Judul Kop & QR Code Resmi) */}
          <div className="p-4 bg-gradient-to-r from-sky-50/90 via-indigo-50/60 to-white rounded-2xl border border-sky-200 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Format Kartu Peserta Ujian (Judul Kop &amp; QR Code)
              </h4>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                Pengganti Pasfoto Siswa
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                Judul Kop Kartu Peserta Ujian:
              </label>
              <input
                type="text"
                value={formData.judulKartuUjian || 'KARTU PESERTA CBT PENILAIAN AKHIR SEMESTER'}
                onChange={(e) => setFormData({ ...formData, judulKartuUjian: e.target.value })}
                placeholder="Contoh: KARTU PESERTA CBT PENILAIAN AKHIR SEMESTER"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none uppercase"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Teks judul ini dicetak dengan huruf kapital di bagian atas kartu peserta di atas nama sekolah, dengan layout yang presisi tanpa tumpang tindih.
              </p>
            </div>

            {/* QR Code Upload & Preview */}
            <div className="pt-2 border-t border-sky-200/80">
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                QR Code Resmi Kartu Peserta Ujian:
              </label>
              <p className="text-[11px] text-slate-600 mb-2">
                Foto siswa telah digantikan sepenuhnya dengan QR Code resmi sistem (55px x 55px) untuk otentikasi login ujian &amp; verifikasi peserta.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-sky-200">
                <div className="w-24 h-24 rounded-xl border-2 border-slate-300 bg-white p-1.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  <img
                    src={qrPreview}
                    alt="QR Code Kartu"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200 cursor-pointer font-bold text-xs transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah QR Code Kustom</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleQRCodeUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetQRCode}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-bold text-xs transition-all active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset ke Aset Bawaan</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    ✓ QR Code aktif akan langsung dicetak di kolom kiri kartu ujian (menggantikan bingkai pasfoto).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4c: Integrasi Link Google Drive & Form (4 Link Terpisah) */}
          <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-slate-50 rounded-2xl border border-indigo-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                Integrasi Tautan Google Drive / Google Form (4 Link Terpisah)
              </h4>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                100% Terpisah & Terverifikasi
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Masing-masing link Google Drive / Form bekerja secara terpisah dan mandiri (tidak sinkron satu sama lain). Guru akan diarahkan secara presisi sesuai jenis asesmen/rapor yang sedang dibuka.
            </p>

            {/* 1. Link Bank Soal ASTS */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  1. Link Google Drive / Form — Bank Soal ASTS (Essay)
                </label>
                {loadingSoalSTS ? (
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
                  </span>
                ) : verifSoalSTS?.isPublic ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi Publik
                  </span>
                ) : verifSoalSTS?.url ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Status Minta Akses
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... (Link ASTS)"
                  value={formData.driveSoalUrlSTS || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.trim()) setVerifSoalSTS(null);
                    setFormData((prev) => ({ ...prev, driveSoalUrlSTS: val }));
                  }}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const u = formData.driveSoalUrlSTS || '';
                    if (!u.trim()) {
                      setVerifSoalSTS(null);
                      return;
                    }
                    setLoadingSoalSTS(true);
                    const res = await verifyGoogleDriveLink(u);
                    setVerifSoalSTS(res);
                    setLoadingSoalSTS(false);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Cek ASTS</span>
                </button>
              </div>
              {verifSoalSTS?.message && (
                <p className={`text-[10px] font-medium ${verifSoalSTS.isPublic ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {verifSoalSTS.message}
                </p>
              )}
            </div>

            {/* 2. Link Bank Soal ASAS */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  2. Link Google Drive / Form — Bank Soal ASAS (Pilihan Ganda)
                </label>
                {loadingSoalSAS ? (
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
                  </span>
                ) : verifSoalSAS?.isPublic ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi Publik
                  </span>
                ) : verifSoalSAS?.url ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Status Minta Akses
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... (Link ASAS)"
                  value={formData.driveSoalUrlSAS || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.trim()) setVerifSoalSAS(null);
                    setFormData((prev) => ({ ...prev, driveSoalUrlSAS: val }));
                  }}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const u = formData.driveSoalUrlSAS || '';
                    if (!u.trim()) {
                      setVerifSoalSAS(null);
                      return;
                    }
                    setLoadingSoalSAS(true);
                    const res = await verifyGoogleDriveLink(u);
                    setVerifSoalSAS(res);
                    setLoadingSoalSAS(false);
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Cek ASAS</span>
                </button>
              </div>
              {verifSoalSAS?.message && (
                <p className={`text-[10px] font-medium ${verifSoalSAS.isPublic ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {verifSoalSAS.message}
                </p>
              )}
            </div>

            {/* 3. Link Rapor STS */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  3. Link Google Drive / Form — Rapor STS (Tengah Semester)
                </label>
                {loadingRaporSTS ? (
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
                  </span>
                ) : verifRaporSTS?.isPublic ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi Publik
                  </span>
                ) : verifRaporSTS?.url ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Status Minta Akses
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... (Link Rapor STS)"
                  value={formData.driveRaporUrlSTS || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.trim()) setVerifRaporSTS(null);
                    setFormData((prev) => ({ ...prev, driveRaporUrlSTS: val }));
                  }}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const u = formData.driveRaporUrlSTS || '';
                    if (!u.trim()) {
                      setVerifRaporSTS(null);
                      return;
                    }
                    setLoadingRaporSTS(true);
                    const res = await verifyGoogleDriveLink(u);
                    setVerifRaporSTS(res);
                    setLoadingRaporSTS(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Cek Rapor STS</span>
                </button>
              </div>
              {verifRaporSTS?.message && (
                <p className={`text-[10px] font-medium ${verifRaporSTS.isPublic ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {verifRaporSTS.message}
                </p>
              )}
            </div>

            {/* 4. Link Rapor SAS */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  4. Link Google Drive / Form — Rapor SAS (Akhir Semester)
                </label>
                {loadingRaporSAS ? (
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
                  </span>
                ) : verifRaporSAS?.isPublic ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi Publik
                  </span>
                ) : verifRaporSAS?.url ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Status Minta Akses
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... (Link Rapor SAS)"
                  value={formData.driveRaporUrlSAS || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.trim()) setVerifRaporSAS(null);
                    setFormData((prev) => ({ ...prev, driveRaporUrlSAS: val }));
                  }}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const u = formData.driveRaporUrlSAS || '';
                    if (!u.trim()) {
                      setVerifRaporSAS(null);
                      return;
                    }
                    setLoadingRaporSAS(true);
                    const res = await verifyGoogleDriveLink(u);
                    setVerifRaporSAS(res);
                    setLoadingRaporSAS(false);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Cek Rapor SAS</span>
                </button>
              </div>
              {verifRaporSAS?.message && (
                <p className={`text-[10px] font-medium ${verifRaporSAS.isPublic ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {verifRaporSAS.message}
                </p>
              )}
            </div>
          </div>

          {/* Section 5: Pemeliharaan Sistem (Maintenance Mode - Khusus Admin) */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${
            formData.maintenanceMode
              ? 'bg-slate-900 border-amber-400 shadow-xl text-white'
              : 'bg-slate-900 border-slate-700 shadow-lg text-white'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${formData.maintenanceMode ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-850 text-amber-400 border border-slate-700'}`}>
                  <Wrench className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                    <span>Pemeliharaan Sistem (Maintenance Mode)</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                      formData.maintenanceMode
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-slate-200 border-slate-600'
                    }`}>
                      {formData.maintenanceMode ? 'MODE MAINTENANCE AKTIF' : 'Sistem Normal (Aktif)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-200 mt-0.5 font-semibold">
                    Aktifkan saat Anda melakukan pemeliharaan, penyesuaian prompt, pembaruan fitur, atau pengeditan via Google AI Studio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextState = !formData.maintenanceMode;
                  setFormData((prev) => ({
                    ...prev,
                    maintenanceMode: nextState,
                    maintenanceStartedAt: nextState ? new Date().toISOString() : '',
                    maintenanceMessage: prev.maintenanceMessage || 'Sistem SMANTRI SMART ACADEMIC sedang dalam pemeliharaan & pengembangan berkala oleh Administrator via Google AI Studio. Seluruh data tetap aman dan tersimpan.',
                  }));
                  showToast(
                    nextState ? 'Maintenance Mode Aktif!' : 'Maintenance Mode Dinonaktifkan',
                    nextState
                      ? 'Seluruh akun Guru Mapel, Operator, dan Kepala Sekolah akan melihat tampilan pemeliharaan. Akun Admin tetap dapat mengakses penuh.'
                      : 'Sistem kembali dapat diakses normal oleh semua akun guru, operator, dan pengelola sekolah.',
                    nextState ? 'warning' : 'success'
                  );
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 ${
                  formData.maintenanceMode
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <Power className="w-4 h-4 stroke-[2.5]" />
                <span>{formData.maintenanceMode ? 'Matikan Maintenance' : 'Aktifkan Maintenance Mode'}</span>
              </button>
            </div>

            {formData.maintenanceMode && (
              <div className="space-y-3 pt-3.5 border-t border-slate-800 mb-4">
                <label className="block text-xs font-black text-amber-300">
                  Pesan Pemberitahuan Untuk Guru Mapel, Operator, &amp; Kepala Sekolah:
                </label>
                <textarea
                  rows={2}
                  value={formData.maintenanceMessage || ''}
                  onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                  placeholder="Ketik pesan pengumuman pemeliharaan sistem..."
                  className="w-full p-3 text-xs bg-slate-950 border-2 border-amber-400/80 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-semibold text-white placeholder-slate-400"
                />
                <div className="p-3 bg-amber-950/80 rounded-xl text-xs text-amber-200 border border-amber-500/50 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-white">Akses Khusus Admin:</strong> Selama Maintenance Mode aktif, akun Administrator dapat menavigasi, mengelola nilai, prompt, dan instrumen secara penuh. Guru akan otomatis dialihkan ke layar aman.
                  </p>
                </div>
              </div>
            )}

            {/* Rules Manajemen Maintenance Sistem Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 mt-3">
              <h5 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rules Manajemen Maintenance Sistem (SOP Pemeliharaan):</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-200">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-black text-white block">1. Hak Akses Terisolasi</span>
                  <p className="text-slate-300 font-medium">Hanya Administrator yang memiliki akses penuh; guru mapel diarahkan ke layar pemeliharaan.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-black text-white block">2. Garansi Keamanan Data</span>
                  <p className="text-slate-300 font-medium">Seluruh nilai rapor, bank soal, dan berita acara tetap aman 100% di cloud.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-black text-white block">3. Verifikasi Build AI Studio</span>
                  <p className="text-slate-300 font-medium">Pastikan kompilasi sistem tervalidasi sebelum menonaktifkan mode maintenance.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-black text-white block">4. Siaran Pengumuman Real-Time</span>
                  <p className="text-slate-300 font-medium">Pesan maintenance terdistribusi langsung ke layar semua guru tanpa refresh paksa.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Cadangan & Pemulihan Data Permanen (Aman dari Republish AI Studio) */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                Cadangan & Pemulihan Data Sistem (.json)
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Proteksi Otomatis Aktif
              </span>
            </div>
            <p className="text-[11px] text-indigo-950/80 mb-3 leading-relaxed">
              Sistem secara otomatis mengamankan data ke penyimpanan ganda (*Dual Local Storage & Server Disk*). Jika terjadi perombakan prompt atau *republish* di Google AI Studio, data akan dipulihkan secara otomatis. Anda juga dapat mengunduh file cadangan manual kapan saja.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportBackupJSON}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan (.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 shadow-xs cursor-pointer transition-colors mr-1">
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>Restorasi File Backup</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        const content = evt.target?.result as string;
                        if (content) {
                          await importBackupJSON(content);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={async () => {
                  await cleanSystemGarbage();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors cursor-pointer"
                title="Hapus permanen sampah sistem bekas error, cache, dan bersihkan koneksi"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Bersihkan Sampah & Cache</span>
              </button>
            </div>
          </div>

          {/* Section 6: Penyesuaian Jaringan & Bandwidth Pintar (Hemat Bitrate) */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-emerald-950 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                Penyesuaian Jaringan & Hemat Bitrate Pintar
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-mono">
                {networkProfile.tier} mode
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 mb-3 leading-relaxed">
              Sistem secara otomatis melonggarkan konsumsi kuota dan bitrate jaringan. Saat mengerjakan soal, koreksi ujian, atau penugasan, sistem mengutamakan penyimpanan lokal berkecepatan tinggi tanpa memakan bitrate berlebih.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNetworkPreference('auto');
                  showToast('Mode Jaringan', 'Penyesuaian pintar otomatis diaktifkan.', 'info');
                }}
                className="p-3 rounded-xl border text-left bg-white hover:bg-slate-50 transition-all border-slate-200 cursor-pointer"
              >
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  Otomatis Pintar
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Adaptif sesuai sinyal</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNetworkPreference('eco');
                  showToast('Mode Jaringan', 'Mode Hemat Bitrate & Kuota (Eco) diaktifkan.', 'info');
                }}
                className="p-3 rounded-xl border text-left bg-white hover:bg-slate-50 transition-all border-slate-200 cursor-pointer"
              >
                <div className="font-bold text-xs text-amber-700 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-amber-500" />
                  Mode Eco (Hemat)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Bitrate minimal (2G/WiFi padat)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNetworkPreference('balanced');
                  showToast('Mode Jaringan', 'Mode Seimbang diaktifkan.', 'info');
                }}
                className="p-3 rounded-xl border text-left bg-white hover:bg-slate-50 transition-all border-slate-200 cursor-pointer"
              >
                <div className="font-bold text-xs text-sky-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-500" />
                  Mode Seimbang
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Standar harian seimbang</div>
              </button>
            </div>
          </div>
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Pengaturan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
