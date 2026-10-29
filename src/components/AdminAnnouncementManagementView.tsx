import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Announcement } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import { AnnouncementsBanner } from './AnnouncementsBanner';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Pin,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Clock,
  UserCheck,
  Eye,
  AlertTriangle,
  Bell,
  Calendar,
  Info,
  Sparkles,
  X,
  Layers,
  Users,
  GraduationCap,
  ShieldCheck,
  Radio,
  ToggleLeft,
  ToggleRight,
  Medal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OlimpiadeAssistantModal } from './OlimpiadeAssistantModal';

export const AdminAnnouncementManagementView: React.FC = () => {
  const { state, saveAnnouncement, deleteAnnouncement, toggleAnnouncementPin, toggleAnnouncementActive, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOlimpiadeModalOpen, setIsOlimpiadeModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    judul: string;
    isi: string;
    kategori: 'Mendesak' | 'Penting' | 'Ujian & Asesmen' | 'Info Sekolah';
    targetRole: 'semua' | 'guru' | 'siswa';
    penulis: string;
    isPin: boolean;
    isActive: boolean;
    isFlashBroadcast: boolean;
    flashPriority: 'urgent' | 'critical' | 'warning';
  }>({
    judul: '',
    isi: '',
    kategori: 'Ujian & Asesmen',
    targetRole: 'semua',
    penulis: 'Administrator SMAN 3 Tumijajar',
    isPin: false,
    isActive: true,
    isFlashBroadcast: false,
    flashPriority: 'urgent',
  });

  const announcementsList = state?.announcements || [];

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcementsList.filter((a) => {
      const matchSearch =
        a.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.isi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.penulis || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === 'ALL' || a.kategori === selectedCategory;
      const matchRole = selectedRole === 'ALL' || a.targetRole === selectedRole;

      return matchSearch && matchCat && matchRole;
    }).sort((a, b) => {
      if (a.isPin && !b.isPin) return -1;
      if (!a.isPin && b.isPin) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [announcementsList, searchTerm, selectedCategory, selectedRole]);

  const handleOpenAddModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      judul: '',
      isi: '',
      kategori: 'Ujian & Asesmen',
      targetRole: 'semua',
      penulis: 'Administrator SMAN 3 Tumijajar',
      isPin: false,
      isActive: true,
      isFlashBroadcast: false,
      flashPriority: 'urgent',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Announcement) => {
    setEditingAnnouncement(item);
    setFormData({
      judul: item.judul,
      isi: item.isi,
      kategori: item.kategori,
      targetRole: item.targetRole,
      penulis: item.penulis || 'Administrator SMAN 3 Tumijajar',
      isPin: item.isPin ?? false,
      isActive: item.isActive !== false,
      isFlashBroadcast: item.isFlashBroadcast ?? false,
      flashPriority: item.flashPriority || 'urgent',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.isi.trim()) {
      showToast('Form Inkomplit', 'Mohon isi judul dan isi pengumuman.', 'warning');
      return;
    }

    const payload: Announcement = {
      id: editingAnnouncement ? editingAnnouncement.id : `anc-${Date.now()}`,
      judul: formData.judul.trim(),
      isi: formData.isi.trim(),
      kategori: formData.kategori,
      targetRole: formData.targetRole,
      penulis: formData.penulis.trim() || 'Administrator SMAN 3 Tumijajar',
      isPin: formData.isPin,
      isActive: formData.isActive,
      isFlashBroadcast: formData.isFlashBroadcast,
      flashPriority: formData.flashPriority,
      createdAt: editingAnnouncement ? editingAnnouncement.createdAt : formatIndonesianDate(new Date()),
      updatedAt: editingAnnouncement ? formatIndonesianDate(new Date()) : undefined,
    };

    const success = await saveAnnouncement(payload);
    if (success) {
      setIsModalOpen(false);
      showToast(
        'Pengumuman Disimpan',
        editingAnnouncement ? 'Pengumuman berhasil diperbarui.' : 'Pengumuman baru telah ditiupkan ke dashboard.',
        'success'
      );
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteAnnouncement(id);
    if (success) {
      setDeleteConfirmId(null);
      showToast('Berhasil Dihapus', 'Pengumuman telah dihapus dari sistem.', 'success');
    }
  };

  const handleTogglePin = async (id: string) => {
    await toggleAnnouncementPin(id);
  };

  const handleToggleActive = async (id: string) => {
    await toggleAnnouncementActive(id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-xs">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Kelola Pengumuman Sekolah
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                Administrator
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Siarkan pengumuman resmi, jadwal ujian ASTS/ASAS & update penting ke dashboard guru dan siswa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOlimpiadeModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer border border-amber-400/30"
          >
            <Medal className="w-4 h-4 text-amber-200" />
            <span>AI Specialist Olimpiade / OSN</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-600" />
            Pratinjau Tampilan Banner Pengumuman di Dashboard
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Tampilan Pengguna Terkini</span>
        </div>
        <AnnouncementsBanner targetRole="admin" />
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Pengumuman</span>
          <div className="mt-1 text-xl font-bold text-slate-900">{announcementsList.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Aktif Disiarkan</span>
          <div className="mt-1 text-xl font-bold text-emerald-600">
            {announcementsList.filter((a) => a.isActive !== false).length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Disematkan (Pinned)</span>
          <div className="mt-1 text-xl font-bold text-amber-600">
            {announcementsList.filter((a) => a.isPin).length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Target Khusus Siswa</span>
          <div className="mt-1 text-xl font-bold text-indigo-600">
            {announcementsList.filter((a) => a.targetRole === 'siswa').length}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul, isi pengumuman, atau penulis..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Ujian & Asesmen">Ujian & Asesmen</option>
            <option value="Penting">Penting</option>
            <option value="Mendesak">Mendesak</option>
            <option value="Info Sekolah">Info Sekolah</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">Semua Target Peran</option>
            <option value="semua">Semua Pengguna</option>
            <option value="guru">Khusus Guru</option>
            <option value="siswa">Khusus Siswa</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Tidak ada pengumuman ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== 'ALL' || selectedRole !== 'ALL'
                ? 'Tidak ada pengumuman yang sesuai dengan filter pencarian.'
                : 'Belum ada pengumuman disiarkan. Klik "Buat Pengumuman Baru" untuk memulainya.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                className={`p-5 transition-colors hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  !item.isActive ? 'opacity-60 bg-slate-50/50' : ''
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isFlashBroadcast && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                        <Radio className="w-3 h-3 text-white" />
                        FLASH BROADCAST
                      </span>
                    )}

                    {item.isPin && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                        Disematkan
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {item.kategori}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      Target: {item.targetRole}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ml-auto ${
                        item.isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {item.isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif Disiarkan</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.judul}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.isi}
                    </p>
                  </div>

                  {/* Author & Date */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      {item.penulis || 'Administrator'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatIndonesianDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Controls & Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  {/* Pin Toggle */}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(item.id)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      item.isPin
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={item.isPin ? 'Lepas Sematan (Unpin)' : 'Sematkan di Atas (Pin)'}
                  >
                    <Pin className={`w-4 h-4 ${item.isPin ? 'fill-amber-500 text-amber-600' : ''}`} />
                  </button>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      item.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={item.isActive ? 'Sembunyikan Pengumuman' : 'Tampilkan Pengumuman'}
                  >
                    {item.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Edit Pengumuman"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingAnnouncement ? 'Edit Pengumuman Sekolah' : 'Buat Pengumuman Baru'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Isi rincian pengumuman yang akan ditampilkan di dashboard.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Judul */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Judul Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    placeholder="Contoh: Pelaksanaan Asesmen Sumatif Tengah Semester (ASTS)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Kategori & Target Peran */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                    <select
                      value={formData.kategori}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kategori: e.target.value as Announcement['kategori'],
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Ujian & Asesmen">Ujian & Asesmen</option>
                      <option value="Penting">Penting</option>
                      <option value="Mendesak">Mendesak</option>
                      <option value="Info Sekolah">Info Sekolah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Audien</label>
                    <select
                      value={formData.targetRole}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetRole: e.target.value as Announcement['targetRole'],
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="semua">Semua Pengguna (Guru & Siswa)</option>
                      <option value="guru">Khusus Guru Mapel</option>
                      <option value="siswa">Khusus Peserta Didik (Siswa)</option>
                    </select>
                  </div>
                </div>

                {/* Penulis */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Penulis / Pengirim
                  </label>
                  <input
                    type="text"
                    value={formData.penulis}
                    onChange={(e) => setFormData({ ...formData, penulis: e.target.value })}
                    placeholder="Pihak penerbit pengumuman (misal: Administrator / Tim Kurikulum)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Isi Pengumuman */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Isi Pengumuman Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.isi}
                    onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                    placeholder="Tuliskan rincian pengumuman, jadwal ujian, atau petunjuk selengkapnya di sini..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>

                {/* Options: Pin, Active & Flash Broadcast */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isPin}
                      onChange={(e) => setFormData({ ...formData, isPin: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Sematkan di Atas</span>
                      <span className="text-[10px] text-slate-500 block">
                        Pin di bagian atas
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Aktifkan Pengumuman</span>
                      <span className="text-[10px] text-slate-500 block">
                        Siarkan ke dashboard
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isFlashBroadcast}
                      onChange={(e) => setFormData({ ...formData, isFlashBroadcast: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-rose-900 block">Flash Broadcast</span>
                      <span className="text-[10px] text-rose-700 block">
                        Banner mendesak atas layar
                      </span>
                    </div>
                  </label>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    {editingAnnouncement ? 'Simpan Perubahan' : 'Siarkan Pengumuman'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Pengumuman ini?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pengumuman yang dihapus tidak akan ditampilkan lagi di dashboard guru dan siswa.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Olimpiade AI Specialist Modal */}
      <OlimpiadeAssistantModal
        isOpen={isOlimpiadeModalOpen}
        onClose={() => setIsOlimpiadeModalOpen(false)}
        onApplyToAnnouncement={(title, content) => {
          setEditingAnnouncement(null);
          setFormData({
            judul: title,
            isi: content,
            kategori: 'Ujian & Asesmen',
            targetRole: 'semua',
            penulis: 'Panitia Olimpiade SMAN 3 Tumijajar',
            isPin: true,
            isActive: true,
            isFlashBroadcast: true,
            flashPriority: 'urgent',
          });
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};
