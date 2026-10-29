import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Upload, Save, User, Lock, Camera, Check, Sparkles, HeartHandshake, UserCheck, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImageBase64 } from '../utils/imageCompressor';

import { TeacherRole } from '../types';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, saveTeacher, showToast } = useApp();

  const [nama, setNama] = useState(currentUser?.nama || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState(currentUser?.password || '');
  const [nip, setNip] = useState(currentUser?.nip || '');
  const [fotoUrl, setFotoUrl] = useState(currentUser?.fotoUrl || '');
  const [isGuruBK, setIsGuruBK] = useState(
    Boolean(currentUser?.isGuruBK || currentUser?.mataPelajaran?.some(m => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'))
  );
  const [isTimKesiswaan, setIsTimKesiswaan] = useState(
    Boolean(currentUser?.isTimKesiswaan || currentUser?.roles?.includes('kesiswaan'))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setNama(currentUser.nama || '');
      setUsername(currentUser.username || '');
      setPassword(currentUser.password || '');
      setNip(currentUser.nip || '');
      setFotoUrl(currentUser.fotoUrl || '');
      setIsGuruBK(
        Boolean(currentUser?.isGuruBK || currentUser?.mataPelajaran?.some(m => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'))
      );
      setIsTimKesiswaan(
        Boolean(currentUser?.isTimKesiswaan || currentUser?.roles?.includes('kesiswaan'))
      );
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 320, 0.85);
      if (compressed) {
        setFotoUrl(compressed);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();

    const currentMapel = currentUser.mataPelajaran || [];
    let updatedMapel = [...currentMapel];
    if (isGuruBK) {
      if (!updatedMapel.some(m => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')) {
        updatedMapel.push('Bimbingan Konseling (BK)');
      }
    } else {
      updatedMapel = updatedMapel.filter(m => !m.toLowerCase().includes('bimbingan konseling') && m.toLowerCase() !== 'bk');
    }

    const currentRoles: TeacherRole[] = Array.isArray(currentUser.roles) ? [...currentUser.roles] : [];
    let updatedRoles: TeacherRole[] = currentRoles.filter(r => r !== 'kesiswaan');
    if (isTimKesiswaan) {
      updatedRoles.push('kesiswaan');
    }

    saveTeacher({
      ...currentUser,
      nama,
      username,
      password: password || undefined,
      nip,
      fotoUrl,
      isGuruBK,
      isTimKesiswaan,
      roles: updatedRoles,
      mataPelajaran: updatedMapel,
    });

    if (isGuruBK || isTimKesiswaan) {
      const messages: string[] = [];
      if (isGuruBK) messages.push('Guru BK (7 Jurus BK)');
      if (isTimKesiswaan) messages.push('Tim Kesiswaan (Presensi Siswa)');
      showToast(
        'Profil & Hak Akses Diperbarui',
        `Pengaturan akun berhasil disimpan. Hak akses aktif: ${messages.join(' & ')}.`,
        'success'
      );
    } else {
      showToast('Profil Diperbarui', 'Data profil akun guru berhasil diperbarui.', 'success');
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
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Edit Profil & Foto Wajah</h3>
              <p className="text-xs text-slate-400">Pengaturan akun guru & administrator</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
            {/* Photo & Face-Fit Auto Preview (Bentuk Oval) */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative group">
              <div className="w-20 h-26 rounded-[50%] overflow-hidden ring-4 ring-indigo-500/20 shadow-md bg-slate-200 border-2 border-white flex items-center justify-center">
                <img
                  src={fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="Foto Profil"
                  className="w-full h-full object-cover object-top transition-transform group-hover:scale-105"
                />
              </div>
              <label className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg cursor-pointer transition-colors z-10">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <span className="text-[11px] font-semibold text-slate-700 mt-2">Format Foto Oval Pas di Wajah</span>
            <p className="text-[10px] text-slate-400">Pilih foto dari galeri atau kamera HP/laptop.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK (Opsional)</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 19850720 201001 1 012"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi baru..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Penugasan Bimbingan Konseling (BK) Hebat */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isGuruBK
                ? 'bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border-purple-300 ring-2 ring-purple-400/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isGuruBK ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <label
                    htmlFor="profile-toggle-guru-bk"
                    className="font-extrabold text-xs text-slate-900 cursor-pointer flex flex-wrap items-center gap-1.5"
                  >
                    <span>Penugasan Guru Bimbingan Konseling (BK)</span>
                    {isGuruBK && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                        7 Jurus BK Hebat
                      </span>
                    )}
                  </label>
                  <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                    Aktifkan akses Modul BK Hebat Kemendikdasmen (Profil Potensi Siswa, Jurnal Emosi, Peta Kerawanan, Rujukan MTSS, Resiliensi &amp; Rekomendasi Karir SNBP).
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="profile-toggle-guru-bk"
                  type="checkbox"
                  checked={isGuruBK}
                  onChange={(e) => setIsGuruBK(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>

          {/* Penugasan Tim Kesiswaan / Presensi Siswa */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isTimKesiswaan
                ? 'bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isTimKesiswaan ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <label
                    htmlFor="profile-toggle-kesiswaan"
                    className="font-extrabold text-xs text-slate-900 cursor-pointer flex flex-wrap items-center gap-1.5"
                  >
                    <span>Penugasan Tim Kesiswaan &amp; Guru Piket</span>
                    {isTimKesiswaan && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                        Presensi Siswa
                      </span>
                    )}
                  </label>
                  <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                    Aktifkan akses Modul Kesiswaan &amp; Presensi Siswa: Input absensi harian kelas, tombol aksi massal, ringkasan kehadiran hari ini, deteksi dini siswa rawan, dan rekapitulasi semester.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="profile-toggle-kesiswaan"
                  type="checkbox"
                  checked={isTimKesiswaan}
                  onChange={(e) => setIsTimKesiswaan(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-rose-600" />
              </label>
            </div>
          </div>

          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
