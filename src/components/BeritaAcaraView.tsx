import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BeritaAcaraItem, AbsentStudentInfo, StudentAttendanceItem, BeritaAcaraFileProof } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import {
  FileText,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  Printer,
  Edit,
  Trash2,
  Eye,
  FileCheck,
  X,
  Loader2,
  Sparkles,
  Download,
  Calendar,
  Users,
  Building,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  ClipboardCheck,
  Layers,
  Merge,
  Files,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportBeritaAcaraPDF } from '../utils/pdfExport';
import { CrossDeviceUploadModal } from './CrossDeviceUploadModal';

export const BeritaAcaraView: React.FC = () => {
  const { state, currentUser, saveBeritaAcara, deleteBeritaAcara, showToast } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCrossDeviceModalOpen, setIsCrossDeviceModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<BeritaAcaraItem | null>(null);
  const [previewItem, setPreviewItem] = useState<BeritaAcaraItem | null>(null);
  const [editingItem, setEditingItem] = useState<BeritaAcaraItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload Modal State
  const [uploadTab, setUploadTab] = useState<'LAPTOP' | 'HP' | 'MANUAL'>('LAPTOP');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BeritaAcaraItem>>({
    assessmentType: 'ASTS',
    namaSekolah: state.schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR',
    mataPelajaran: '',
    kelasRuang: '',
    hariTanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    waktuPelaksanaan: '07.30 - 09.30 WIB',
    pengawas1: currentUser?.nama || '',
    nipPengawas1: currentUser?.nip || '',
    pengawas2: '',
    nipPengawas2: '',
    jumlahPesertaSeharusnya: 36,
    jumlahPesertaHadir: 36,
    jumlahPesertaTidakHadir: 0,
    siswaTidakHadirDetail: [],
    catatanKejadianKhusus: 'Pelaksanaan ujian/asesmen berlangsung lancar, aman, dan tertib.',
    verifiedStatus: 'Verified',
  });

  const [absentInput, setAbsentInput] = useState<AbsentStudentInfo>({
    nama: '',
    kelas: '',
    alasan: 'Sakit',
  });

  if (!state || !currentUser) return null;

  const beritaList = state.beritaAcaraList || [];

  // Filtered List
  const filteredList = useMemo(() => {
    return beritaList.filter((item) => {
      if (filterType !== 'ALL' && item.assessmentType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMapel = item.mataPelajaran?.toLowerCase().includes(q);
        const matchKelas = item.kelasRuang?.toLowerCase().includes(q);
        const matchPengawas = item.pengawas1?.toLowerCase().includes(q) || item.pengawas2?.toLowerCase().includes(q);
        const matchSekolah = item.namaSekolah?.toLowerCase().includes(q);
        const matchTgl = item.hariTanggal?.toLowerCase().includes(q);
        if (!matchMapel && !matchKelas && !matchPengawas && !matchSekolah && !matchTgl) {
          return false;
        }
      }
      return true;
    });
  }, [beritaList, filterType, searchQuery]);

  // Quick Stats
  const totalCount = beritaList.length;
  const astsCount = beritaList.filter((b) => b.assessmentType === 'ASTS').length;
  const asasCount = beritaList.filter((b) => b.assessmentType === 'ASAS').length;
  const totalAbsentCount = beritaList.reduce((acc, b) => acc + (Number(b.jumlahPesertaTidakHadir) || 0), 0);

  // Detect duplicate class items in current active list
  const duplicateClassGroups = useMemo(() => {
    const map: Record<string, BeritaAcaraItem[]> = {};
    beritaList.forEach((item) => {
      const classKey = (item.kelasRuang || 'Tanpa Kelas').trim().toLowerCase();
      if (!map[classKey]) map[classKey] = [];
      map[classKey].push(item);
    });

    return Object.entries(map)
      .filter(([_, items]) => items.length > 1)
      .map(([classKey, items]) => ({
        className: items[0].kelasRuang || classKey,
        items,
      }));
  }, [beritaList]);

  // Combine items belonging to the same class into 1 consolidated item
  const handleCombineSameClassItems = async (itemsToCombine: BeritaAcaraItem[]) => {
    if (itemsToCombine.length <= 1) return;

    const baseItem = { ...itemsToCombine[0] };
    const combinedStudentMap = new Map<string, StudentAttendanceItem>();
    const combinedFileProofs: BeritaAcaraFileProof[] = [];

    itemsToCombine.forEach((item) => {
      // Collect file proofs
      if (item.fileBuktiList && item.fileBuktiList.length > 0) {
        item.fileBuktiList.forEach((fp) => {
          if (!combinedFileProofs.some((p) => p.url === fp.url)) {
            combinedFileProofs.push(fp);
          }
        });
      } else if (item.fileBuktiUrl) {
        if (!combinedFileProofs.some((p) => p.url === item.fileBuktiUrl)) {
          combinedFileProofs.push({
            url: item.fileBuktiUrl,
            name: item.fileBuktiName || 'Bukti Berita Acara',
            type: item.fileBuktiType || 'image',
          });
        }
      }

      // Collect students
      if (item.daftarSiswaDetail && item.daftarSiswaDetail.length > 0) {
        item.daftarSiswaDetail.forEach((st) => {
          const key = (st.nama || '').trim().toLowerCase();
          if (!key) return;

          if (!combinedStudentMap.has(key)) {
            combinedStudentMap.set(key, { ...st });
          } else {
            const existing = combinedStudentMap.get(key)!;
            if (st.hasSignature && !existing.hasSignature) {
              existing.hasSignature = true;
              existing.status = 'Hadir';
              existing.keterangan = 'Hadir';
            }
            if (st.nisn && !existing.nisn) existing.nisn = st.nisn;
          }
        });
      }
    });

    const mergedStudents: StudentAttendanceItem[] = Array.from(combinedStudentMap.values()).map((st, idx) => ({
      ...st,
      no: idx + 1,
    }));

    const presentCount = mergedStudents.filter((s) => s.hasSignature).length;
    const absentCount = mergedStudents.filter((s) => !s.hasSignature).length;

    const mergedAbsentDetails: AbsentStudentInfo[] = mergedStudents
      .filter((s) => !s.hasSignature)
      .map((s) => ({
        nama: s.nama,
        kelas: s.kelas || baseItem.kelasRuang || '',
        alasan: s.keterangan || 'Tanpa Keterangan',
      }));

    const combinedNotes = Array.from(new Set(itemsToCombine.map((i) => i.catatanKejadianKhusus).filter(Boolean))).join('; ');

    const updatedCombinedItem: BeritaAcaraItem = {
      ...baseItem,
      daftarSiswaDetail: mergedStudents,
      siswaTidakHadirDetail: mergedAbsentDetails,
      jumlahPesertaSeharusnya: mergedStudents.length > 0 ? mergedStudents.length : baseItem.jumlahPesertaSeharusnya,
      jumlahPesertaHadir: mergedStudents.length > 0 ? presentCount : baseItem.jumlahPesertaHadir,
      jumlahPesertaTidakHadir: mergedStudents.length > 0 ? absentCount : baseItem.jumlahPesertaTidakHadir,
      catatanKejadianKhusus: combinedNotes || baseItem.catatanKejadianKhusus,
      fileBuktiList: combinedFileProofs,
      fileBuktiUrl: combinedFileProofs[0]?.url || baseItem.fileBuktiUrl,
    };

    const idsToRemove = itemsToCombine.slice(1).map((i) => i.id);

    // Save updated item & remove merged items
    for (const id of idsToRemove) {
      await deleteBeritaAcara(id);
    }
    await saveBeritaAcara(updatedCombinedItem);

    showToast(
      'Kombinasi Berita Acara Sukses!',
      `Seluruh lembar berita acara kelas ${baseItem.kelasRuang} berhasil dikombinasikan secara rapi (${mergedStudents.length} siswa).`,
      'success'
    );
  };

  // Multi-File Upload Handler (Laptop)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    setIsParsing(true);
    setParsingStep(`Membaca ${fileList.length} berkas/foto berita acara...`);

    try {
      const readFileBase64 = (file: File): Promise<{ fileBase64: string; mimeType: string; fileName: string }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : file.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg');
          reader.onload = () => {
            resolve({
              fileBase64: reader.result as string,
              mimeType,
              fileName: file.name,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const preparedFiles = await Promise.all(fileList.map(readFileBase64));

      setParsingStep('Memproses AI Vision & Menggabungkan presensi multi-halaman...');

      const response = await fetch('/api/gemini/parse-berita-acara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: preparedFiles,
          defaultType: formData.assessmentType || 'ASTS',
        }),
      });

      const json = await response.json();

      if (json.success && json.beritaAcara) {
        const b = json.beritaAcara;
        const parsedStudentDetail: StudentAttendanceItem[] = Array.isArray(b.daftarSiswaDetail) ? b.daftarSiswaDetail : [];
        const parsedAbsentDetail: AbsentStudentInfo[] = Array.isArray(b.siswaTidakHadirDetail) ? b.siswaTidakHadirDetail : [];

        const fileProofList: BeritaAcaraFileProof[] = preparedFiles.map((pf) => ({
          url: pf.fileBase64,
          name: pf.fileName,
          type: pf.mimeType.includes('pdf') ? 'pdf' : pf.mimeType.includes('word') || pf.mimeType.includes('docx') ? 'docx' : 'image',
        }));

        setFormData((prev) => ({
          ...prev,
          assessmentType: (b.assessmentType === 'ASAS' ? 'ASAS' : 'ASTS') as 'ASTS' | 'ASAS',
          namaSekolah: b.namaSekolah || state.schoolInfo.namaSekolah,
          mataPelajaran: b.mataPelajaran || prev.mataPelajaran,
          kelasRuang: b.kelasRuang || prev.kelasRuang,
          hariTanggal: b.hariTanggal || prev.hariTanggal,
          waktuPelaksanaan: b.waktuPelaksanaan || prev.waktuPelaksanaan,
          pengawas1: b.pengawas1 || prev.pengawas1,
          nipPengawas1: b.nipPengawas1 || prev.nipPengawas1,
          pengawas2: b.pengawas2 || '',
          nipPengawas2: b.nipPengawas2 || '',
          jumlahPesertaSeharusnya: Number(b.jumlahPesertaSeharusnya) || (parsedStudentDetail.length > 0 ? parsedStudentDetail.length : 36),
          jumlahPesertaHadir: Number(b.jumlahPesertaHadir) || (parsedStudentDetail.length > 0 ? parsedStudentDetail.filter(s => s.hasSignature).length : 36),
          jumlahPesertaTidakHadir: Number(b.jumlahPesertaTidakHadir) || (parsedStudentDetail.length > 0 ? parsedStudentDetail.filter(s => !s.hasSignature).length : 0),
          daftarSiswaDetail: parsedStudentDetail,
          siswaTidakHadirDetail: parsedAbsentDetail,
          catatanKejadianKhusus: b.catatanKejadianKhusus || 'Pelaksanaan berjalan lancar dan tertib.',
          fileBuktiUrl: fileProofList[0]?.url || '',
          fileBuktiName: fileProofList[0]?.name || fileList[0].name,
          fileBuktiType: fileProofList[0]?.type || 'image',
          fileBuktiList: fileProofList,
        }));

        showToast(
          `${fileList.length} Berkas Dikombinasikan & Terbaca!`,
          'Sistem AI telah menggabungkan seluruh lembar berita acara & presensi siswa dengan presisi.',
          'success'
        );
        setUploadTab('MANUAL');
      } else {
        throw new Error(json.message || 'Gagal membaca isi berkas.');
      }
    } catch (err: any) {
      showToast('Proses AI Terkendala', err.message || 'Silakan lengkapi atau periksa form secara manual.', 'warning');
      setUploadTab('MANUAL');
    } finally {
      setIsParsing(false);
    }
  };

  // Add absent student to list
  const handleAddAbsentStudent = () => {
    if (!absentInput.nama.trim()) {
      showToast('Nama Siswa Kosong', 'Silakan masukkan nama siswa yang tidak hadir.', 'warning');
      return;
    }
    const updatedList = [...(formData.siswaTidakHadirDetail || []), { ...absentInput }];
    setFormData((prev) => ({
      ...prev,
      siswaTidakHadirDetail: updatedList,
      jumlahPesertaTidakHadir: updatedList.length,
      jumlahPesertaHadir: Math.max(0, (prev.jumlahPesertaSeharusnya || 36) - updatedList.length),
    }));
    setAbsentInput({ nama: '', kelas: '', alasan: 'Sakit' });
  };

  // Remove absent student
  const handleRemoveAbsentStudent = (index: number) => {
    const updatedList = (formData.siswaTidakHadirDetail || []).filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      siswaTidakHadirDetail: updatedList,
      jumlahPesertaTidakHadir: updatedList.length,
      jumlahPesertaHadir: Math.max(0, (prev.jumlahPesertaSeharusnya || 36) - updatedList.length),
    }));
  };

  // Toggle student signature status (Ada Tanda Tangan -> Hadir vs Kosong -> Tidak Hadir)
  const handleToggleStudentSignature = (index: number) => {
    const list = [...(formData.daftarSiswaDetail || [])];
    if (!list[index]) return;

    const curSig = list[index].hasSignature;
    const newSig = !curSig;
    list[index] = {
      ...list[index],
      hasSignature: newSig,
      status: newSig ? 'Hadir' : 'Tidak Hadir',
      keterangan: newSig ? 'Hadir' : 'Tanpa Keterangan',
    };

    const presentCount = list.filter((s) => s.hasSignature).length;
    const absentCount = list.filter((s) => !s.hasSignature).length;
    const absentDetails: AbsentStudentInfo[] = list
      .filter((s) => !s.hasSignature)
      .map((s) => ({
        nama: s.nama,
        kelas: s.kelas || formData.kelasRuang || '',
        alasan: s.keterangan || 'Tanpa Keterangan',
      }));

    setFormData((prev) => ({
      ...prev,
      daftarSiswaDetail: list,
      jumlahPesertaSeharusnya: list.length,
      jumlahPesertaHadir: presentCount,
      jumlahPesertaTidakHadir: absentCount,
      siswaTidakHadirDetail: absentDetails,
    }));
  };

  const [newStudentInput, setNewStudentInput] = useState('');
  const [newStudentNoPeserta, setNewStudentNoPeserta] = useState('');

  const handleAddStudentToDetail = () => {
    if (!newStudentInput.trim()) return;
    const list = [...(formData.daftarSiswaDetail || [])];
    const cleanNoPeserta = newStudentNoPeserta.trim();
    const newStudent: StudentAttendanceItem = {
      no: list.length + 1,
      nama: newStudentInput.trim(),
      nomorPeserta: cleanNoPeserta || undefined,
      nisn: cleanNoPeserta || undefined,
      kelas: formData.kelasRuang || '',
      hasSignature: true,
      status: 'Hadir',
      keterangan: 'Hadir',
    };
    const updatedList = [...list, newStudent];
    const presentCount = updatedList.filter((s) => s.hasSignature).length;
    const absentCount = updatedList.filter((s) => !s.hasSignature).length;
    const absentDetails: AbsentStudentInfo[] = updatedList
      .filter((s) => !s.hasSignature)
      .map((s) => ({
        nama: s.nama,
        nomorPeserta: s.nomorPeserta || s.nisn || '',
        nisn: s.nisn || s.nomorPeserta || '',
        kelas: s.kelas || formData.kelasRuang || '',
        alasan: s.keterangan || 'Tanpa Keterangan',
      }));

    setFormData((prev) => ({
      ...prev,
      daftarSiswaDetail: updatedList,
      jumlahPesertaSeharusnya: updatedList.length,
      jumlahPesertaHadir: presentCount,
      jumlahPesertaTidakHadir: absentCount,
      siswaTidakHadirDetail: absentDetails,
    }));
    setNewStudentInput('');
    setNewStudentNoPeserta('');
  };

  const handleUpdateStudentNomorPeserta = (index: number, val: string) => {
    const list = [...(formData.daftarSiswaDetail || [])];
    if (!list[index]) return;
    list[index] = {
      ...list[index],
      nomorPeserta: val,
      nisn: val,
    };
    setFormData((prev) => ({ ...prev, daftarSiswaDetail: list }));
  };

  const handleRemoveStudentFromDetail = (index: number) => {
    const list = (formData.daftarSiswaDetail || []).filter((_, i) => i !== index);
    const updatedList = list.map((s, idx) => ({ ...s, no: idx + 1 }));
    const presentCount = updatedList.filter((s) => s.hasSignature).length;
    const absentCount = updatedList.filter((s) => !s.hasSignature).length;
    const absentDetails: AbsentStudentInfo[] = updatedList
      .filter((s) => !s.hasSignature)
      .map((s) => ({
        nama: s.nama,
        kelas: s.kelas || formData.kelasRuang || '',
        alasan: s.keterangan || 'Tanpa Keterangan',
      }));

    setFormData((prev) => ({
      ...prev,
      daftarSiswaDetail: updatedList,
      jumlahPesertaSeharusnya: updatedList.length,
      jumlahPesertaHadir: presentCount,
      jumlahPesertaTidakHadir: absentCount,
      siswaTidakHadirDetail: absentDetails,
    }));
  };

  // Save Berita Acara
  const handleSaveForm = async () => {
    if (!formData.mataPelajaran || !formData.mataPelajaran.trim()) {
      showToast('Mapel Belum Diisi', 'Silakan tentukan mata pelajaran terlebih dahulu.', 'warning');
      return;
    }
    if (!formData.kelasRuang || !formData.kelasRuang.trim()) {
      showToast('Kelas/Ruang Belum Diisi', 'Silakan tentukan kelas atau ruang pelaksanaan.', 'warning');
      return;
    }

    const itemToSave: BeritaAcaraItem = {
      id: editingItem ? editingItem.id : `ba-${Date.now()}`,
      assessmentType: formData.assessmentType || 'ASTS',
      namaSekolah: formData.namaSekolah || state.schoolInfo.namaSekolah,
      mataPelajaran: formData.mataPelajaran.trim(),
      kelasRuang: formData.kelasRuang.trim(),
      hariTanggal: formData.hariTanggal || new Date().toLocaleDateString('id-ID'),
      waktuPelaksanaan: formData.waktuPelaksanaan || '07.30 - 09.30 WIB',
      pengawas1: formData.pengawas1 || currentUser.nama,
      nipPengawas1: formData.nipPengawas1,
      pengawas2: formData.pengawas2 ? formData.pengawas2.trim() : undefined,
      nipPengawas2: formData.nipPengawas2 ? formData.nipPengawas2.trim() : undefined,
      jumlahPesertaSeharusnya: Number(formData.jumlahPesertaSeharusnya) || 0,
      jumlahPesertaHadir: Number(formData.jumlahPesertaHadir) || 0,
      jumlahPesertaTidakHadir: Number(formData.jumlahPesertaTidakHadir) || 0,
      siswaTidakHadirDetail: formData.siswaTidakHadirDetail || [],
      daftarSiswaDetail: formData.daftarSiswaDetail || [],
      catatanKejadianKhusus: formData.catatanKejadianKhusus || 'Lancar dan tertib.',
      fileBuktiUrl: formData.fileBuktiUrl,
      fileBuktiName: formData.fileBuktiName,
      fileBuktiType: formData.fileBuktiType,
      fileBuktiList: formData.fileBuktiList,
      uploadedAt: editingItem ? editingItem.uploadedAt : new Date().toISOString(),
      uploadedBy: currentUser.nama,
      verifiedStatus: formData.verifiedStatus || 'Verified',
    };

    setIsUploadModalOpen(false);
    setEditingItem(null);
    resetForm();
    saveBeritaAcara(itemToSave);
  };

  const resetForm = () => {
    setFormData({
      assessmentType: 'ASTS',
      namaSekolah: state.schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR',
      mataPelajaran: '',
      kelasRuang: '',
      hariTanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      waktuPelaksanaan: '07.30 - 09.30 WIB',
      pengawas1: currentUser?.nama || '',
      nipPengawas1: currentUser?.nip || '',
      pengawas2: '',
      nipPengawas2: '',
      jumlahPesertaSeharusnya: 36,
      jumlahPesertaHadir: 36,
      jumlahPesertaTidakHadir: 0,
      siswaTidakHadirDetail: [],
      daftarSiswaDetail: [],
      catatanKejadianKhusus: 'Pelaksanaan ujian/asesmen berlangsung lancar, aman, dan tertib.',
      verifiedStatus: 'Verified',
    });
  };

  const handleOpenEdit = (item: BeritaAcaraItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setUploadTab('MANUAL');
    setIsUploadModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Fitur Baru: Automated Berita Acara Vision
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ClipboardCheck className="w-8 h-8 text-indigo-400" />
              Berita Acara ASTS & ASAS
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unggah foto/file berita acara dari HP atau dokumen PDF/Word dari Laptop. AI akan membaca secara teliti, menyusun data akurat, dan dapat dipantau serta dicetak resmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setUploadTab('LAPTOP');
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Berita Acara</span>
            </button>

            <button
              onClick={() => setIsCrossDeviceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Foto via HP (QR)</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/60">
            <p className="text-xs text-slate-400 font-medium">Total Dokumen</p>
            <p className="text-xl font-black text-white mt-0.5">{totalCount} <span className="text-xs font-normal text-slate-400">Berkas</span></p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/60">
            <p className="text-xs text-amber-300 font-medium">Berita Acara ASTS</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">{astsCount} <span className="text-xs font-normal text-slate-400">Tengah Semester</span></p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/60">
            <p className="text-xs text-blue-300 font-medium">Berita Acara ASAS</p>
            <p className="text-xl font-black text-blue-400 mt-0.5">{asasCount} <span className="text-xs font-normal text-slate-400">Akhir Semester</span></p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/60">
            <p className="text-xs text-rose-300 font-medium">Rekap Siswa Absen</p>
            <p className="text-xl font-black text-rose-400 mt-0.5">{totalAbsentCount} <span className="text-xs font-normal text-slate-400">Siswa Tidak Hadir</span></p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('ASTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ASTS'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ASTS ({astsCount})
          </button>
          <button
            onClick={() => setFilterType('ASAS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ASAS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ASAS ({asasCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mapel, kelas, pengawas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid of Berita Acara */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-slate-800 text-base">Belum Ada Berita Acara Terdata</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? 'Tidak ada berita acara yang cocok dengan pencarian Anda.'
                : 'Silakan unggah foto dari HP atau file PDF/Word dari Laptop untuk mulai mendata berita acara ASTS/ASAS.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setUploadTab('LAPTOP');
                setIsUploadModalOpen(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              + Unggah Berita Acara Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Duplicate Class Combination Banner */}
          {duplicateClassGroups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-2 border-indigo-200 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>Terdeteksi {duplicateClassGroups.length} Rombel/Kelas Memiliki Berkas Berlembar-lembar</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                        Siap Dikombinasikan
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Sistem mendeteksi beberapa lembar berita acara untuk kelas yang sama. Klik tombol di bawah untuk mengombinasikan presensi secara rapi & presisi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-100/60">
                {duplicateClassGroups.map((group, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCombineSameClassItems(group.items)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Merge className="w-4 h-4" />
                    <span>Kombinasikan Kelas <strong>{group.className}</strong> ({group.items.length} Berkas)</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative group"
            >
              {/* Header Badges */}
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.assessmentType === 'ASTS'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {item.assessmentType === 'ASTS' ? 'ASTS (Tengah Sem.)' : 'ASAS (Akhir Sem.)'}
                </span>

                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Terverifikasi
                </span>
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {item.mataPelajaran || 'Mata Pelajaran'}
                </h3>
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.kelasRuang || 'Ruang Ujian'}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.hariTanggal}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.waktuPelaksanaan}</span>
                </p>
              </div>

              {/* Attendance & Supervisor Summary */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium text-slate-500">Pengawas:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[150px]">{item.pengawas1}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Kehadiran:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                      Hadir: {item.jumlahPesertaHadir}
                    </span>
                    {item.jumlahPesertaTidakHadir > 0 ? (
                      <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded">
                        Absen: {item.jumlahPesertaTidakHadir}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Absen: 0</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDetailItem(item)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Lihat Detail & Lampiran File"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Data Berita Acara"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Berita Acara"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    title="Preview Laporan Berita Acara Resmi"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Preview Laporan</span>
                  </button>
                  <button
                    onClick={() => exportBeritaAcaraPDF(item, state.schoolInfo)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                    title="Unduh PDF Berita Acara"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
      )}

      {/* Modal Upload / Form Berita Acara */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col shadow-2xl border border-slate-200 my-auto overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {editingItem ? 'Edit Berita Acara' : 'Unggah & Kelola Berita Acara'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ekstraksi otomatis via AI Vision atau pengisian manual resmi
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Tabs */}
              {!editingItem && (
                <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setUploadTab('LAPTOP')}
                    className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                      uploadTab === 'LAPTOP'
                        ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Dokumen (Laptop)</span>
                  </button>
                  <button
                    onClick={() => setUploadTab('HP')}
                    className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                      uploadTab === 'HP'
                        ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Kamera / File HP (Scan QR)</span>
                  </button>
                  <button
                    onClick={() => setUploadTab('MANUAL')}
                    className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                      uploadTab === 'MANUAL'
                        ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Periksa & Form Manual</span>
                  </button>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
                {/* TAB 1: LAPTOP FILE UPLOAD */}
                {uploadTab === 'LAPTOP' && (
                  <div className="space-y-4">
                    <div className="p-6 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 rounded-2xl text-center space-y-3 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px] mb-2 border border-indigo-200">
                          <Files className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Mendukung Unggah Lebih Dari 1 File / Multi-Halaman</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          Pilih Satu atau Beberapa Dokumen PDF, Word (.docx), atau Foto (JPG/PNG) Berita Acara
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Jika berita acara terdiri dari berlembar-lembar foto/dokumen, pilih seluruh berkas sekaligus. AI akan menggabungkannya secara rapi!
                        </p>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.docx,.doc"
                        multiple
                        className="hidden"
                      />

                      <button
                        disabled={isParsing}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengekstrak AI...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            <span>Pilih Berkas dari Laptop</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isParsing && (
                      <div className="p-4 bg-indigo-950 text-indigo-100 rounded-2xl flex items-center gap-3 animate-pulse border border-indigo-800">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold">{parsingStep}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: HP QR CODE CROSS-DEVICE */}
                {uploadTab === 'HP' && (
                  <div className="text-center p-6 space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Gunakan Kamera HP Untuk Ambil Foto Berita Acara</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Pindai QR Code untuk mengunggah foto berita acara atau berkas dari smartphone Anda. Foto akan langsung terhubung ke laptop!
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUploadModalOpen(false);
                        setIsCrossDeviceModalOpen(true);
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Buka Koneksi QR Code HP Sekarang</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: FORM MANUAL & VERIFICATION */}
                {(uploadTab === 'MANUAL' || editingItem) && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Jenis Asesmen</label>
                        <select
                          value={formData.assessmentType || 'ASTS'}
                          onChange={(e) =>
                            setFormData({ ...formData, assessmentType: e.target.value as 'ASTS' | 'ASAS' })
                          }
                          className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="ASTS">ASTS (Asesmen Sumatif Tengah Semester)</option>
                          <option value="ASAS">ASAS (Asesmen Sumatif Akhir Semester)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Satuan Pendidikan / Sekolah</label>
                        <input
                          type="text"
                          value={formData.namaSekolah || ''}
                          onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="SMA NEGERI 3 TUMIJAJAR"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran *</label>
                        <input
                          type="text"
                          value={formData.mataPelajaran || ''}
                          onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Contoh: Biologi, Bahasa Indonesia"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Kelas / Ruang / Rombel *</label>
                        <input
                          type="text"
                          value={formData.kelasRuang || ''}
                          onChange={(e) => setFormData({ ...formData, kelasRuang: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Contoh: X.1 / Ruang 03"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Hari & Tanggal Pelaksanaan</label>
                        <input
                          type="text"
                          value={formData.hariTanggal || ''}
                          onChange={(e) => setFormData({ ...formData, hariTanggal: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Senin, 12 Oktober 2026"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Waktu Pelaksanaan</label>
                        <input
                          type="text"
                          value={formData.waktuPelaksanaan || ''}
                          onChange={(e) => setFormData({ ...formData, waktuPelaksanaan: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="07.30 - 09.30 WIB"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nama Pengawas 1 / Penanggung Jawab</label>
                        <input
                          type="text"
                          value={formData.pengawas1 || ''}
                          onChange={(e) => setFormData({ ...formData, pengawas1: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Nama Pengawas 1"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">NIP Pengawas 1 (Opsional)</label>
                        <input
                          type="text"
                          value={formData.nipPengawas1 || ''}
                          onChange={(e) => setFormData({ ...formData, nipPengawas1: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="1980xxxx xxxx x xxx"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nama Pengawas 2 (Opsional)</label>
                        <input
                          type="text"
                          value={formData.pengawas2 || ''}
                          onChange={(e) => setFormData({ ...formData, pengawas2: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Nama Pengawas 2"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">NIP Pengawas 2 (Opsional)</label>
                        <input
                          type="text"
                          value={formData.nipPengawas2 || ''}
                          onChange={(e) => setFormData({ ...formData, nipPengawas2: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="1985xxxx xxxx x xxx"
                        />
                      </div>
                    </div>

                    {/* Attendance Numbers */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>Data Kehadiran Peserta Ujian</span>
                      </h4>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Peserta Terdaftar</label>
                          <input
                            type="number"
                            value={formData.jumlahPesertaSeharusnya || 36}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                jumlahPesertaSeharusnya: val,
                                jumlahPesertaHadir: Math.max(0, val - (formData.jumlahPesertaTidakHadir || 0)),
                              });
                            }}
                            className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-emerald-700 mb-1">Peserta Hadir</label>
                          <input
                            type="number"
                            value={formData.jumlahPesertaHadir || 36}
                            onChange={(e) => setFormData({ ...formData, jumlahPesertaHadir: Number(e.target.value) || 0 })}
                            className="w-full p-2 border border-emerald-300 rounded-lg text-center font-bold bg-emerald-50 text-emerald-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-rose-700 mb-1">Peserta Tidak Hadir</label>
                          <input
                            type="number"
                            value={formData.jumlahPesertaTidakHadir || 0}
                            onChange={(e) => setFormData({ ...formData, jumlahPesertaTidakHadir: Number(e.target.value) || 0 })}
                            className="w-full p-2 border border-rose-300 rounded-lg text-center font-bold bg-rose-50 text-rose-800"
                          />
                        </div>
                      </div>

                      {/* Student Attendance List with AI Signature Detection */}
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span>Daftar Siswa & Deteksi Tanda Tangan ({formData.daftarSiswaDetail?.length || 0} Siswa)</span>
                          </h5>

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={newStudentInput}
                              onChange={(e) => setNewStudentInput(e.target.value)}
                              placeholder="Nama Siswa..."
                              className="p-1.5 text-xs border border-slate-200 rounded-lg w-32 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddStudentToDetail();
                                }
                              }}
                            />
                            <input
                              type="text"
                              value={newStudentNoPeserta}
                              onChange={(e) => setNewStudentNoPeserta(e.target.value)}
                              placeholder="No. Peserta..."
                              className="p-1.5 text-xs border border-slate-200 rounded-lg w-28 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddStudentToDetail();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleAddStudentToDetail}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                            >
                              + Tambah
                            </button>
                          </div>
                        </div>

                        {formData.daftarSiswaDetail && formData.daftarSiswaDetail.length > 0 ? (
                          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                            {formData.daftarSiswaDetail.map((s, idx) => (
                              <div key={idx} className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-bold text-slate-400 w-5 text-right shrink-0">{s.no || idx + 1}.</span>
                                  <span className="font-bold text-slate-800 truncate max-w-[140px]">{s.nama}</span>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                                    <span className="hidden sm:inline">No. Peserta:</span>
                                    <input
                                      type="text"
                                      value={s.nomorPeserta || s.nisn || ''}
                                      onChange={(e) => handleUpdateStudentNomorPeserta(idx, e.target.value)}
                                      placeholder="No. Peserta"
                                      className="px-1.5 py-0.5 text-[11px] font-mono border border-slate-200 rounded w-24 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStudentSignature(idx)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                      s.hasSignature
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                    }`}
                                  >
                                    {s.hasSignature ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Hadir (Ada Tanda Tangan)</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Tidak Hadir (Kosong)</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudentFromDetail(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                    title="Hapus Siswa"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs italic">
                            Belum ada daftar siswa terdeteksi. Unggah berkas/foto berita acara agar AI membaca presensi & tanda tangan secara otomatis, atau ketik nama siswa di atas.
                          </div>
                        )}
                      </div>

                      {/* Absent Students Detail */}
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <label className="block font-bold text-slate-700 text-[11px]">Daftar Rincian Siswa Tidak Hadir (Jika Ada):</label>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={absentInput.nama}
                            onChange={(e) => setAbsentInput({ ...absentInput, nama: e.target.value })}
                            placeholder="Nama Lengkap Siswa"
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs"
                          />
                          <select
                            value={absentInput.alasan}
                            onChange={(e) => setAbsentInput({ ...absentInput, alasan: e.target.value })}
                            className="p-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                          >
                            <option value="Sakit">Sakit</option>
                            <option value="Izin">Izin</option>
                            <option value="Tanpa Keterangan">Tanpa Keterangan (Alpha)</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleAddAbsentStudent}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                          >
                            + Tambah
                          </button>
                        </div>

                        {formData.siswaTidakHadirDetail && formData.siswaTidakHadirDetail.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {formData.siswaTidakHadirDetail.map((s, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                              >
                                <span>
                                  <strong>{idx + 1}. {s.nama}</strong> <span className="text-slate-500">({s.alasan})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAbsentStudent(idx)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes & Incidents */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Catatan Kejadian Khusus Selama Asesmen</label>
                      <textarea
                        rows={3}
                        value={formData.catatanKejadianKhusus || ''}
                        onChange={(e) => setFormData({ ...formData, catatanKejadianKhusus: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ujian berlangsung lancar, tertib, dan aman..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>

                <button
                  onClick={handleSaveForm}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Berita Acara</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detail Inspection */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            >
              <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
                    {detailItem.assessmentType}
                  </span>
                  <h3 className="font-extrabold text-lg mt-1">{detailItem.mataPelajaran}</h3>
                  <p className="text-xs text-slate-400">{detailItem.namaSekolah}</p>
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-medium">Kelas / Ruang:</span>
                    <p className="font-bold text-slate-900">{detailItem.kelasRuang}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Hari & Tanggal:</span>
                    <p className="font-bold text-slate-900">{detailItem.hariTanggal}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Waktu:</span>
                    <p className="font-bold text-slate-900">{detailItem.waktuPelaksanaan}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Pengawas 1:</span>
                    <p className="font-bold text-slate-900">{detailItem.pengawas1}</p>
                  </div>
                  {detailItem.pengawas2 && detailItem.pengawas2.trim() !== '' && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-500 font-medium">Pengawas 2:</span>
                      <p className="font-bold text-slate-900">{detailItem.pengawas2}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900">Rekap Kehadiran Peserta:</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <div>Terdaftar: <strong>{detailItem.jumlahPesertaSeharusnya}</strong></div>
                    <div className="text-emerald-600">Hadir: <strong>{detailItem.jumlahPesertaHadir}</strong></div>
                    <div className="text-rose-600">Tidak Hadir: <strong>{detailItem.jumlahPesertaTidakHadir}</strong></div>
                  </div>

                  {detailItem.siswaTidakHadirDetail && detailItem.siswaTidakHadirDetail.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <p className="font-bold text-slate-700 text-[11px]">Siswa Tidak Hadir:</p>
                      {detailItem.siswaTidakHadirDetail.map((s, idx) => (
                        <p key={idx} className="text-slate-600 text-[11px]">
                          {idx + 1}. {s.nama} ({s.alasan})
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {detailItem.daftarSiswaDetail && detailItem.daftarSiswaDetail.length > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Daftar Presensi & Tanda Tangan Siswa:</span>
                      <span className="text-[11px] font-normal text-slate-500">{detailItem.daftarSiswaDetail.length} Siswa</span>
                    </h4>

                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {detailItem.daftarSiswaDetail.map((s, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {s.no || idx + 1}. {s.nama} {(s.nomorPeserta || s.nisn) ? `(No. Peserta: ${s.nomorPeserta || s.nisn})` : ''}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              s.hasSignature
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {s.hasSignature ? 'HADIR (Tanda Tangan Ada)' : 'TIDAK HADIR (Kosong)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
                  <h4 className="font-bold text-xs">Catatan / Kejadian Khusus:</h4>
                  <p className="text-xs leading-relaxed">{detailItem.catatanKejadianKhusus}</p>
                </div>

                {/* Multi-File or Single File Proof Gallery */}
                {((detailItem.fileBuktiList && detailItem.fileBuktiList.length > 0) || detailItem.fileBuktiUrl) && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Files className="w-4 h-4 text-indigo-600" />
                        <span>Lampiran Bukti Berkas/Foto Unggahan ({detailItem.fileBuktiList?.length || 1} File)</span>
                      </span>
                    </h4>

                    {detailItem.fileBuktiList && detailItem.fileBuktiList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                        {detailItem.fileBuktiList.map((proof, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-center relative group">
                            <span className="text-[10px] font-bold text-slate-500 block">
                              Lembar #{idx + 1}: {proof.name || `File ${idx + 1}`}
                            </span>
                            {proof.url && proof.url.startsWith('data:image') ? (
                              <a href={proof.url} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={proof.url}
                                  alt={`Proof ${idx + 1}`}
                                  className="h-36 w-full rounded-xl object-contain bg-slate-900/5 hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ) : (
                              <div className="h-36 rounded-xl bg-slate-100 flex flex-col items-center justify-center p-3 text-slate-600 space-y-1">
                                <FileText className="w-8 h-8 text-indigo-600" />
                                <span className="text-xs font-bold line-clamp-2">{proof.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : detailItem.fileBuktiUrl ? (
                      <div>
                        {detailItem.fileBuktiUrl.startsWith('data:image') ? (
                          <img
                            src={detailItem.fileBuktiUrl}
                            alt="Bukti Unggahan"
                            className="max-h-60 rounded-2xl border border-slate-200 mx-auto object-contain"
                          />
                        ) : (
                          <div className="p-4 bg-slate-100 rounded-2xl text-center font-bold text-slate-700 flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <span>{detailItem.fileBuktiName || 'Berkas Dokumen Lampiran (PDF/Word)'}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => {
                    const item = detailItem;
                    setDetailItem(null);
                    setPreviewItem(item);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Laporan</span>
                </button>
                <button
                  onClick={() => exportBeritaAcaraPDF(detailItem, state.schoolInfo)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak PDF Resmi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview Laporan Berita Acara Resmi */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto cursor-default"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/80 text-white flex items-center justify-center shrink-0 border border-indigo-400/30">
                    <FileCheck className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div className="truncate">
                    <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                      <span>Preview Laporan Berita Acara Resmi</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        {previewItem.assessmentType}
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200/80 truncate">
                      {previewItem.mataPelajaran} • {previewItem.kelasRuang} • {previewItem.hariTanggal}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content - Official Document Paper View */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-200/60 font-sans">
                <div className="bg-white rounded-xl shadow-lg border border-slate-300 p-6 sm:p-10 max-w-3xl mx-auto space-y-6 text-slate-900 text-sm leading-relaxed font-sans">
                  
                  {/* Kop Surat SMAN 3 Tumijajar */}
                  <div className="border-b-4 border-double border-slate-900 pb-3 flex items-start justify-between gap-4">
                    <img
                      src={state.schoolInfo.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                      alt="Logo Provinsi"
                      className="w-19 h-20 object-fill shrink-0 scale-x-110"
                    />
                    <div className="text-center flex-1 space-y-0.5 font-sans">
                      <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                        {state.schoolInfo.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
                      </h4>
                      <h3 className="font-black text-base sm:text-lg uppercase text-slate-900 tracking-tight">
                        {state.schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                      </h3>
                      <p className="text-[11px] text-slate-700 font-sans">
                        NPSN: {state.schoolInfo.npsn || '69955116'} - NSS: {state.schoolInfo.nss || '30.1.1812.02.021'} - AKREDITASI "{state.schoolInfo.akreditasi || 'B'}"
                      </p>
                      <p className="text-[10px] text-slate-600 font-sans">
                        {state.schoolInfo.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung 34794'}
                      </p>
                      <p className="text-[10px] text-slate-600 font-sans">
                        E-mail: {state.schoolInfo.email || 'smantitumijajar@gmail.com'} – Website: {state.schoolInfo.website || 'https://sman3tumijajar.sch.id'}
                      </p>
                    </div>
                    <img
                      src={state.schoolInfo.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                      alt="Logo Sekolah"
                      className="w-16 h-20 object-contain shrink-0"
                    />
                  </div>

                  {/* Document Title */}
                  <div className="text-center space-y-1">
                    <h2 className="font-bold text-base sm:text-lg uppercase tracking-wide border-b border-slate-900 inline-block px-2 pb-0.5">
                      BERITA ACARA PELAKSANAAN {previewItem.assessmentType === 'ASTS' ? 'ASESMEN SUMATIF TENGAH SEMESTER (ASTS)' : 'ASESMEN SUMATIF AKHIR SEMESTER (ASAS)'}
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                      TAHUN PELAJARAN {state.schoolInfo.tahunAjaranAktif || '2026/2027'}
                    </p>
                  </div>

                  {/* Opening Paragraph */}
                  <p className="text-xs text-justify leading-relaxed font-sans">
                    Pada hari ini <span className="font-bold">{previewItem.hariTanggal || '...'}</span>, telah diselenggarakan <span className="font-bold">{previewItem.assessmentType === 'ASTS' ? 'Asesmen Sumatif Tengah Semester (ASTS)' : 'Asesmen Sumatif Akhir Semester (ASAS)'}</span> untuk mata pelajaran dan ruang ujian sebagai berikut:
                  </p>

                  {/* Table Information */}
                  <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 font-sans">
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-4 font-bold text-slate-700">1. Satuan Pendidikan</span>
                      <span className="col-span-8 font-semibold text-slate-900">: {previewItem.namaSekolah || state.schoolInfo.namaSekolah}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-4 font-bold text-slate-700">2. Mata Pelajaran</span>
                      <span className="col-span-8 font-bold text-indigo-900">: {previewItem.mataPelajaran}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-4 font-bold text-slate-700">3. Kelas / Ruang / Rombel</span>
                      <span className="col-span-8 font-semibold text-slate-900">: {previewItem.kelasRuang}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-4 font-bold text-slate-700">4. Waktu Pelaksanaan</span>
                      <span className="col-span-8 font-semibold text-slate-900">: {previewItem.waktuPelaksanaan}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-4 font-bold text-slate-700">5. Pengawas 1 / Penanggung Jawab</span>
                      <span className="col-span-8 font-semibold text-slate-900">: {previewItem.pengawas1} {previewItem.nipPengawas1 ? `(NIP. ${previewItem.nipPengawas1})` : ''}</span>
                    </div>
                    {previewItem.pengawas2 && (
                      <div className="grid grid-cols-12 gap-2">
                        <span className="col-span-4 font-bold text-slate-700">6. Pengawas 2</span>
                        <span className="col-span-8 font-semibold text-slate-900">: {previewItem.pengawas2} {previewItem.nipPengawas2 ? `(NIP. ${previewItem.nipPengawas2})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Section I. Attendance Table */}
                  <div className="space-y-2 font-sans">
                    <h4 className="font-bold text-xs uppercase text-slate-900 border-l-4 border-indigo-600 pl-2">
                      I. DATA KEHADIRAN PESERTA ASESMEN
                    </h4>
                    <table className="w-full text-xs border-collapse border border-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                          <th className="p-2 border-r border-slate-300">URAIAN KEHADIRAN PESERTA</th>
                          <th className="p-2 border-r border-slate-300 text-center w-32">JUMLAH SISWA</th>
                          <th className="p-2 text-center">KETERANGAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 border-r border-slate-300 font-medium">Jumlah Peserta Seharusnya (Terdaftar)</td>
                          <td className="p-2 border-r border-slate-300 text-center font-extrabold">{previewItem.jumlahPesertaSeharusnya} Orang</td>
                          <td className="p-2 text-center text-slate-600">Sesuai DKN / Roster Kelas</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-300 font-medium">Jumlah Peserta Hadir</td>
                          <td className="p-2 border-r border-slate-300 text-center font-extrabold text-emerald-700">{previewItem.jumlahPesertaHadir} Orang</td>
                          <td className="p-2 text-center text-emerald-700 font-bold">Mengikuti Asesmen</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-slate-300 font-medium">Jumlah Peserta Tidak Hadir</td>
                          <td className="p-2 border-r border-slate-300 text-center font-extrabold text-rose-700">{previewItem.jumlahPesertaTidakHadir} Orang</td>
                          <td className="p-2 text-center text-rose-700 font-medium">{previewItem.jumlahPesertaTidakHadir > 0 ? 'Lihat Rincian Lampiran' : 'Nihil'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section II. Absent List */}
                  {previewItem.siswaTidakHadirDetail && previewItem.siswaTidakHadirDetail.length > 0 && (
                    <div className="space-y-2 font-sans">
                      <h4 className="font-bold text-xs uppercase text-slate-900 border-l-4 border-rose-600 pl-2">
                        II. DAFTAR SISWA YANG TIDAK HADIR
                      </h4>
                      <table className="w-full text-xs border-collapse border border-slate-300 text-left">
                        <thead>
                          <tr className="bg-rose-50 font-bold text-rose-900 border-b border-slate-300">
                            <th className="p-2 border-r border-slate-300 text-center w-10">NO</th>
                            <th className="p-2 border-r border-slate-300">NAMA SISWA</th>
                            <th className="p-2 border-r border-slate-300 text-center">NO. PESERTA / NISN</th>
                            <th className="p-2 border-r border-slate-300 text-center">KELAS</th>
                            <th className="p-2 text-center">ALASAN / KETERANGAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {previewItem.siswaTidakHadirDetail.map((s, idx) => (
                            <tr key={idx}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{s.nama}</td>
                              <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px] text-slate-700">{s.nomorPeserta || s.nisn || '-'}</td>
                              <td className="p-2 border-r border-slate-300 text-center font-medium">{s.kelas || previewItem.kelasRuang}</td>
                              <td className="p-2 text-center font-semibold text-rose-700">{s.alasan || 'Tanpa Keterangan'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section III. Incident Notes */}
                  <div className="space-y-2 font-sans">
                    <h4 className="font-bold text-xs uppercase text-slate-900 border-l-4 border-amber-500 pl-2">
                      III. CATATAN / KEJADIAN KHUSUS SELAMA PELAKSANAAN UJIAN
                    </h4>
                    <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs italic text-slate-800 leading-relaxed">
                      "{previewItem.catatanKejadianKhusus || 'Pelaksanaan ujian/asesmen berlangsung lancar, tertib, dan aman.'}"
                    </div>
                  </div>

                  {/* Section IV. Student Signature Detection List */}
                  {previewItem.daftarSiswaDetail && previewItem.daftarSiswaDetail.length > 0 && (
                    <div className="space-y-2 font-sans">
                      <h4 className="font-bold text-xs uppercase text-slate-900 border-l-4 border-emerald-600 pl-2">
                        IV. DAFTAR PRESENSI PESERTA & HASIL DETEKSI TANDA TANGAN
                      </h4>
                      <div className="max-h-72 overflow-y-auto border border-slate-300 rounded-lg">
                        <table className="w-full text-xs border-collapse text-left">
                          <thead className="sticky top-0 bg-slate-100 z-10 shadow-xs">
                            <tr className="font-bold text-slate-800 border-b border-slate-300">
                              <th className="p-2 border-r border-slate-300 text-center w-10">NO</th>
                              <th className="p-2 border-r border-slate-300">NAMA SISWA</th>
                              <th className="p-2 border-r border-slate-300 text-center w-36">NO. PESERTA</th>
                              <th className="p-2 border-r border-slate-300 text-center">STATUS DETEKSI TANDA TANGAN</th>
                              <th className="p-2 text-center w-28">KETERANGAN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {previewItem.daftarSiswaDetail.map((st, idx) => (
                              <tr key={idx} className={st.hasSignature ? 'bg-white' : 'bg-rose-50/40'}>
                                <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-400">{st.no || idx + 1}</td>
                                <td className="p-1.5 border-r border-slate-300 font-bold text-slate-900">{st.nama}</td>
                                <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[11px] text-slate-700">{st.nomorPeserta || st.nisn || '-'}</td>
                                <td className="p-1.5 border-r border-slate-300 text-center font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${st.hasSignature ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                                    {st.hasSignature ? 'HADIR (Tanda Tangan Ada)' : 'TIDAK HADIR (Kosong)'}
                                  </span>
                                </td>
                                <td className="p-1.5 text-center text-slate-600 font-medium">{st.keterangan || (st.hasSignature ? 'Hadir' : 'Tanpa Keterangan')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Signature Block */}
                  <div className="pt-6 font-sans flex items-start justify-between text-xs">
                    <div></div>
                    <div className="text-center space-y-10 min-w-56">
                      <div>
                        <p className="text-slate-700">Tumijajar, {formatIndonesianDate(new Date())}</p>
                        <p className="font-bold text-slate-900">Pengawas Ujian / Penanggung Jawab,</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 underline underline-offset-2">{previewItem.pengawas1}</p>
                        {previewItem.nipPengawas1 && <p className="text-[10px] text-slate-600">NIP. {previewItem.nipPengawas1}</p>}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500">
                  Preview dokumen resmi Berita Acara ASTS & ASAS SMA Negeri 3 Tumijajar.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportBeritaAcaraPDF(previewItem, state.schoolInfo)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Cetak / Unduh PDF</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Langsung</span>
                  </button>
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cross Device QR Code Modal */}
      {isCrossDeviceModalOpen && (
        <CrossDeviceUploadModal
          isOpen={isCrossDeviceModalOpen}
          onClose={() => setIsCrossDeviceModalOpen(false)}
          onImageReceived={(photo) => {
            if (photo) {
              setFormData((prev) => ({
                ...prev,
                fileBuktiUrl: photo,
                fileBuktiType: 'image',
                fileBuktiName: 'Foto_HP_Berita_Acara.jpg',
              }));
              setIsCrossDeviceModalOpen(false);
              setUploadTab('MANUAL');
              setIsUploadModalOpen(true);
              showToast('Foto Berita Acara dari HP Diterima!', 'Foto berhasil dikirimkan dari HP dan dapat disimpan.', 'success');
            }
          }}
          onImagesReceived={(photos) => {
            if (photos && photos.length > 0) {
              setFormData((prev) => ({
                ...prev,
                fileBuktiUrl: photos[0],
                fileBuktiType: 'image',
                fileBuktiName: 'Foto_HP_Berita_Acara.jpg',
              }));
              setIsCrossDeviceModalOpen(false);
              setUploadTab('MANUAL');
              setIsUploadModalOpen(true);
              showToast('Foto Berita Acara dari HP Diterima!', 'Foto berhasil dikirimkan dari HP dan dapat disimpan.', 'success');
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Berita Acara?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Data berita acara yang dihapus tidak dapat dikembalikan.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    await deleteBeritaAcara(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg"
                >
                  Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
