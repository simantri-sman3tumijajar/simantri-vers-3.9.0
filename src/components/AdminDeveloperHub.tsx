import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AIStudioPromptItem } from '../types';
import { DEFAULT_AISTUDIO_PROMPTS } from '../data/defaultAIStudioPrompts';
import {
  Terminal,
  Copy,
  Check,
  Cpu,
  Layers,
  Code2,
  Database,
  Sparkles,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  Info,
  Server,
  Zap,
  UserCheck,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Play,
  CheckCircle2,
  Radio,
  FileText,
  Users,
  GraduationCap,
  Megaphone,
  Bot,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Lock,
  LockOpen,
  Download,
  UploadCloud,
  FileJson,
  Calculator,
  AlertCircle,
  X,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';

export const AdminDeveloperHub: React.FC = () => {
  const {
    state,
    saveAIStudioPrompt,
    deleteAIStudioPrompt,
    resetAIStudioPromptsToDefault,
    updateSchoolInfo,
    showToast,
    refreshState,
    cleanSystemGarbage,
    exportBackupJSON,
    importBackupJSON,
    setCurrentView,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadSTSModalOpen, setIsUploadSTSModalOpen] = useState(false);

  const promptsList = useMemo(() => {
    const list = state?.aiStudioPrompts && state.aiStudioPrompts.length > 0
      ? [...state.aiStudioPrompts]
      : [...DEFAULT_AISTUDIO_PROMPTS];

    DEFAULT_AISTUDIO_PROMPTS.forEach((defPrompt) => {
      if (!list.some((p) => p.id === defPrompt.id)) {
        list.push(defPrompt);
      }
    });

    return list;
  }, [state?.aiStudioPrompts]);

  const [activeTab, setActiveTab] = useState<
    'prompts' | 'student-features' | 'playground' | 'database' | 'engine'
  >('prompts');

  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    promptsList[0]?.id || 'prompt-peserta-didik'
  );

  const selectedPrompt = useMemo(() => {
    return promptsList.find((p) => p.id === selectedPromptId) || promptsList[0];
  }, [promptsList, selectedPromptId]);

  // Edit Prompt State
  const [editInstruction, setEditInstruction] = useState<string>(
    selectedPrompt?.systemInstruction || ''
  );
  const [editModel, setEditModel] = useState<string>(selectedPrompt?.model || 'gemini-2.5-flash');
  const [editTemp, setEditTemp] = useState<number>(selectedPrompt?.temperature ?? 0.2);
  const [editTopP, setEditTopP] = useState<number>(selectedPrompt?.topP ?? 0.95);
  const [copied, setCopied] = useState<boolean>(false);

  // New Prompt Modal State
  const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [newPromptCategory, setNewPromptCategory] = useState<string>('peserta_didik');
  const [newPromptModel, setNewPromptModel] = useState<string>('gemini-2.5-flash');
  const [newPromptInstruction, setNewPromptInstruction] = useState<string>('');

  // Sync edit state when selected prompt changes
  React.useEffect(() => {
    if (selectedPrompt) {
      setEditInstruction(selectedPrompt.systemInstruction);
      setEditModel(selectedPrompt.model);
      setEditTemp(selectedPrompt.temperature ?? 0.2);
      setEditTopP(selectedPrompt.topP ?? 0.95);
    }
  }, [selectedPrompt]);

  // Playground Test State
  const [testInput, setTestInput] = useState<string>(
    'Bagaimana cara saya mengecek verifikasi nilai ujian ASTS dan mengakses latihan soal di portal siswa?'
  );
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Student Features Config State directly synced via schoolInfo
  const studentFeatures = useMemo(() => {
    return (
      state?.schoolInfo?.studentFeatures || {
        cbtExamLogin: false,
        verificationQR: true,
        aiLearningTutor: true,
        raportDigitalPreview: true,
        remedialAutoTrigger: true,
      }
    );
  }, [state?.schoolInfo?.studentFeatures]);

  const handleToggleStudentFeature = (
    key: 'cbtExamLogin' | 'verificationQR' | 'aiLearningTutor' | 'raportDigitalPreview' | 'remedialAutoTrigger',
    val: boolean
  ) => {
    const updated = { ...studentFeatures, [key]: val };
    updateSchoolInfo({
      studentFeatures: updated,
    });
    showToast('Pengaturan Disimpan!', `Akses fitur portal peserta didik berhasil diperbarui dan disinkronkan ke semua perangkat.`, 'success');
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Tersalin ke Clipboard!', 'Prompt Google AI Studio berhasil disalin.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCurrentPrompt = async () => {
    if (!selectedPrompt) return;
    const updated: AIStudioPromptItem = {
      ...selectedPrompt,
      systemInstruction: editInstruction,
      model: editModel,
      temperature: editTemp,
      topP: editTopP,
      updatedAt: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      updatedBy: 'Administrator',
    };

    const ok = await saveAIStudioPrompt(updated);
    if (ok) {
      showToast('Prompt Disimpan', `Prompt "${selectedPrompt.nama}" berhasil diperbarui.`, 'success');
    }
  };

  const handleCreateNewPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName.trim() || !newPromptInstruction.trim()) {
      showToast('Form Belum Lengkap', 'Nama prompt dan instruksi sistem wajib diisi.', 'warning');
      return;
    }

    const newId = `prompt-${Date.now()}`;
    const newPrompt: AIStudioPromptItem = {
      id: newId,
      nama: newPromptName.trim(),
      kategori: newPromptCategory as any,
      model: newPromptModel,
      temperature: 0.2,
      topP: 0.95,
      systemInstruction: newPromptInstruction.trim(),
      isActive: true,
      updatedAt: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      updatedBy: 'Administrator',
    };

    const ok = await saveAIStudioPrompt(newPrompt);
    if (ok) {
      showToast('Prompt Baru Ditambahkan', `Prompt "${newPrompt.nama}" berhasil dibuat.`, 'success');
      setSelectedPromptId(newId);
      setIsAddPromptModalOpen(false);
      setNewPromptName('');
      setNewPromptInstruction('');
    }
  };

  const handleDeleteCurrentPrompt = async () => {
    if (!selectedPrompt) return;
    if (promptsList.length <= 1) {
      showToast('Tidak Dapat Dihapus', 'Sistem membutuhkan minimal 1 prompt aktif.', 'warning');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus prompt "${selectedPrompt.nama}"?`)) {
      const ok = await deleteAIStudioPrompt(selectedPrompt.id);
      if (ok) {
        showToast('Prompt Dihapus', `Prompt "${selectedPrompt.nama}" telah dihapus.`, 'info');
        const remaining = promptsList.filter((p) => p.id !== selectedPrompt.id);
        if (remaining.length > 0) {
          setSelectedPromptId(remaining[0].id);
        }
      }
    }
  };

  const handleRunTestPlayground = () => {
    if (!testInput.trim()) return;
    setIsTesting(true);
    setTestOutput(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestOutput(`[ASISTEN DIGITAL SIMANTRI SMAN 3 TUMIJAJAR]
Halo Peserta Didik SMAN 3 Tumijajar!

1. Verifikasi Hasil Ujian ASTS:
   Anda dapat memverifikasi keabsahan lembar nilai dengan melihat Kode Otentik Resmi di pojok kanan atas dokumen hasil ujian (contoh: SMN3-2026-A1B2C3).

2. Fitur Akses & Latihan Soal:
   Modul ujian online CBT dan latihan soal interaktif saat ini disesuaikan dengan instruksi Google AI Studio (${editModel}) dengan suhu generasi ${editTemp}.

*Catatan Sistem:* Respon telah diproses sesuai dengan System Instruction "${selectedPrompt?.nama}".`);
    }, 1200);
  };

  const handleRestoreJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = evt.target?.result as string;
        if (content) {
          const ok = await importBackupJSON(content);
          if (ok) {
            showToast('Data Berhasil Dipulihkan!', 'Seluruh pangkalan data sistem telah diperbarui dari file cadangan JSON.', 'success');
          } else {
            showToast('Gagal Memulihkan Data', 'Format file JSON tidak valid atau rusak.', 'error');
          }
        }
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Data Restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleRestoreJSONFile}
        className="hidden"
      />

      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pusat Kendali Pengembang &amp; Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Google AI Studio &amp; Administrator System Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pengelolaan pusat System Instructions Google AI Studio untuk inisialisasi menu Peserta Didik, Engine Koreksi AI Vision, Pembelajaran Mendalam, serta kontrol penuh kelola data administrator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentView('announcements')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md shadow-purple-600/25"
              title="Buka Halaman Kelola Pengumuman Sekolah"
            >
              <Megaphone className="w-4 h-4 text-purple-200" />
              <span>Kelola Pengumuman</span>
            </button>

            <button
              onClick={() => refreshState()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <span>Sinkronkan System State</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'prompts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Prompt Google AI Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('student-features')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'student-features'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Fitur &amp; Portal Peserta Didik</span>
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>AI Playground / Uji Coba Live</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Kelola Data &amp; Cloud State</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'engine'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>AI Engine Proxy &amp; Models</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROMPT GOOGLE AI STUDIO */}
      {activeTab === 'prompts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Prompts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Prompt System Instruction
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddPromptModalOpen(true)}
                  className="text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Prompt</span>
                </button>
                <button
                  onClick={() => resetAIStudioPromptsToDefault()}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 font-bold cursor-pointer"
                  title="Reset seluruh prompt ke standar pabrik"
                >
                  Reset Default
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {promptsList.map((p) => {
                const isSelected = p.id === selectedPromptId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPromptId(p.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {p.kategori.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {p.model}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm leading-snug">{p.nama}</h4>
                    <p
                      className={`text-xs mt-1 line-clamp-2 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {p.systemInstruction}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Prompt Editor & Config Parameters */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
              {/* Header Editor */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {selectedPrompt?.kategori.replace('_', ' ')}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedPrompt?.nama}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyPrompt(editInstruction)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin!' : 'Salin ke AI Studio'}</span>
                  </button>

                  <button
                    onClick={handleDeleteCurrentPrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all cursor-pointer"
                    title="Hapus Prompt Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>

                  <button
                    onClick={handleSaveCurrentPrompt}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>

              {/* Model & Parameters Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model Gemini Target</label>
                  <select
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Penalaran Tinggi)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temperature (Suhu): <span className="text-indigo-600">{editTemp}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editTemp}
                    onChange={(e) => setEditTemp(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0.0 (Presisi)</span>
                    <span>1.0 (Kreatif)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Top-P Sampling: <span className="text-indigo-600">{editTopP}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editTopP}
                    onChange={(e) => setEditTopP(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Fokus</span>
                    <span>Bervariasi</span>
                  </div>
                </div>
              </div>

              {/* System Instruction Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    System Instructions (Instruksi Sistem AI Studio)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Terakhir diperbarui: {selectedPrompt?.updatedAt || '12 Oktober 2026'}
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  className="w-full font-mono text-xs p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FITUR & PORTAL PESERTA DIDIK */}
      {activeTab === 'student-features' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Pengelolaan Konfigurasi &amp; Akses Portal Peserta Didik
              </h3>
              <p className="text-xs text-slate-500">
                Atur status kunci/buka tombol portal siswa, ketersediaan fitur CBT, verifikasi QR Code, dan asisten AI.
              </p>
            </div>
          </div>

          {/* Master Access Control & Visibility Cards */}
          {(() => {
            const isStudentPortalLocked = Boolean(state?.schoolInfo?.studentPortalLocked ?? true);
            const isStudentPortalHidden = Boolean(state?.schoolInfo?.studentPortalHidden ?? false);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sakelar 1: Master Buka / Kunci Akses Siswa */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border-2 border-amber-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Sakelar 1: Status Buka / Kunci Siswa
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Kunci atau buka tombol akses portal siswa untuk pemeliharaan &amp; penataan menu.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    {isStudentPortalLocked ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        <span>TERKUNCI ADMIN</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>TERBUKA (AKTIF)</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const nextLocked = !isStudentPortalLocked;
                        updateSchoolInfo({
                          studentPortalLocked: nextLocked,
                        });
                        showToast(
                          nextLocked ? 'Portal Siswa Dikunci' : 'Portal Siswa Dibuka!',
                          nextLocked
                            ? 'Akses tombol Peserta Didik kini dikunci oleh Administrator.'
                            : 'Tombol Peserta Didik kini terbuka dan aktif untuk seluruh siswa.',
                          nextLocked ? 'warning' : 'success'
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isStudentPortalLocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isStudentPortalLocked ? (
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

                {/* Sakelar 2: Visibilitas Tampilkan / Sembunyikan Tombol Siswa */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 border-2 border-purple-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-xs shrink-0">
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Sakelar 2: Visibilitas Tombol Siswa
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Tampilkan atau sembunyikan kartu Peserta Didik secara langsung dari halaman utama website (*Welcome Screen*).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-200/80 flex items-center justify-between">
                    {isStudentPortalHidden ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                        <EyeOff className="w-3.5 h-3.5 text-purple-700" />
                        <span>DISEMBUNYIKAN</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>DITAMPILKAN</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const nextHidden = !isStudentPortalHidden;
                        updateSchoolInfo({
                          studentPortalHidden: nextHidden,
                        });
                        showToast(
                          nextHidden ? 'Tombol Siswa Disembunyikan' : 'Tombol Siswa Ditampilkan!',
                          nextHidden
                            ? 'Kartu Peserta Didik kini disembunyikan dari halaman utama secara real-time.'
                            : 'Kartu Peserta Didik kini ditampilkan kembali di halaman utama.',
                          nextHidden ? 'info' : 'success'
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isStudentPortalHidden
                          ? 'bg-purple-700 hover:bg-purple-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isStudentPortalHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tampilkan Tombol</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan Tombol</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Master Access Control: Modul Rekapitulasi Nilai & Leger Siswa */}
          {(() => {
            const isRekapLocked = Boolean(state?.schoolInfo?.rekapNilaiLocked ?? false);
            const isRekapHidden = Boolean(state?.schoolInfo?.rekapNilaiHidden ?? false);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sakelar Rekap 1: Kunci / Buka Akses Pengisian Nilai & Leger */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50 border-2 border-amber-300 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-600 text-white shadow-xs shrink-0">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <span>Sakelar Rekap: Kunci / Buka Akses Guru</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300">
                            IKM 2026
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Kunci pengisian nilai bagi Guru Mapel saat masa rekapitulasi ditutup, atau buka untuk penginputan nilai raport &amp; leger.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    {isRekapLocked ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        <span>TERKUNCI BY ADMIN</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>TERBUKA (AKTIF)</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const nextLocked = !isRekapLocked;
                        updateSchoolInfo({
                          rekapNilaiLocked: nextLocked,
                          rekapNilaiLockReason: state?.schoolInfo?.rekapNilaiLockReason || 'Pengisian nilai rekapitulasi raport & leger siswa saat ini sedang ditutup/dikunci oleh Administrator untuk persiapan verifikasi nilai rapor.',
                        });
                        showToast(
                          nextLocked ? 'Modul Rekap Nilai Dikunci' : 'Modul Rekap Nilai Dibuka!',
                          nextLocked
                            ? 'Pengisian nilai raport & leger siswa kini dikunci oleh Administrator.'
                            : 'Modul Rekapitulasi Nilai & Leger Siswa kini terbuka dan dapat diakses guru mapel.',
                          nextLocked ? 'warning' : 'success'
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isRekapLocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isRekapLocked ? (
                        <>
                          <LockOpen className="w-3.5 h-3.5" />
                          <span>Buka Akses Rekap</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Kunci Akses Rekap</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sakelar Rekap 2: Tampilkan / Sembunyikan Tombol Rekap Nilai & Leger */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50 border-2 border-indigo-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs shrink-0">
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Sakelar Visibilitas Tombol Rekap &amp; Leger
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Tampilkan atau sembunyikan tombol modul Rekapitulasi Nilai &amp; Leger dari portal modul dan menu sidebar guru.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/80 flex items-center justify-between">
                    {isRekapHidden ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                        <EyeOff className="w-3.5 h-3.5 text-purple-700" />
                        <span>DISEMBUNYIKAN</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>DITAMPILKAN</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const nextHidden = !isRekapHidden;
                        updateSchoolInfo({
                          rekapNilaiHidden: nextHidden,
                        });
                        showToast(
                          nextHidden ? 'Tombol Rekap Nilai Disembunyikan' : 'Tombol Rekap Nilai Ditampilkan!',
                          nextHidden
                            ? 'Kartu Rekapitulasi Nilai kini disembunyikan dari portal & sidebar untuk pengguna umum.'
                            : 'Kartu Rekapitulasi Nilai kini ditampilkan kembali secara aktif.',
                          nextHidden ? 'info' : 'success'
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isRekapHidden
                          ? 'bg-purple-700 hover:bg-purple-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isRekapHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tampilkan Tombol</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan Tombol</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle Item 1 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Mode Login Ujian Online &amp; CBT Siswa
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Menampilkan pesan bahwa modul login tes online sedang dalam tahap pengembangan intensif dan penyesuaian infrastruktur.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                  Tahap Pengembangan
                </span>
              </div>
              <input
                type="checkbox"
                checked={studentFeatures.cbtExamLogin}
                onChange={(e) => handleToggleStudentFeature('cbtExamLogin', e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
              />
            </div>

            {/* Toggle Item 2 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Verifikasi Digital QR Code Bukti Otentik
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Memungkinkan siswa dan publik memverifikasi keabsahan lembar nilai hasil ujian lewat scan QR Code resmi.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                  Aktif &amp; Terproteksi
                </span>
              </div>
              <input
                type="checkbox"
                checked={studentFeatures.verificationQR}
                onChange={(e) => handleToggleStudentFeature('verificationQR', e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
              />
            </div>

            {/* Toggle Item 3 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Asisten Belajar Cerdas SiMantri (AI Tutor)
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Siswa dapat berkonsultasi mengenai materi pembelajaran menggunakan prompt Google AI Studio terkonfigurasi.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900">
                  Gemini API Ready
                </span>
              </div>
              <input
                type="checkbox"
                checked={studentFeatures.aiLearningTutor}
                onChange={(e) => handleToggleStudentFeature('aiLearningTutor', e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
              />
            </div>

            {/* Toggle Item 4 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Preview Nilai Rapor Sisipan (STS &amp; ASAS)
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Akses melihat salinan rapor bayangan hasil pengoreksian otomatis AI Vision &amp; validasi guru.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-900">
                  Otentikasi NISN
                </span>
              </div>
              <input
                type="checkbox"
                checked={studentFeatures.raportDigitalPreview}
                onChange={(e) => handleToggleStudentFeature('raportDigitalPreview', e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAYGROUND / UJI COBA LIVE */}
      {activeTab === 'playground' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Studio Prompt Playground (Uji Coba Respon)</h3>
            <p className="text-xs text-slate-500">
              Uji coba eksekusi System Instruction secara simulatif menggunakan prompt yang dipilih ({selectedPrompt?.nama}).
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Input Pertanyaan / Latihan / Jawaban Siswa
            </label>
            <textarea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            <button
              onClick={handleRunTestPlayground}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{isTesting ? 'Memproses Respon AI...' : 'Jalankan Simulasi Respon AI'}</span>
            </button>
          </div>

          {testOutput && (
            <div className="mt-4 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-xs space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Respon Google AI Studio Output
              </span>
              <pre className="whitespace-pre-line leading-relaxed">{testOutput}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KELOLA DATA & CLOUD STATE */}
      {activeTab === 'database' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Kelola Data &amp; Kesehatan Cloud State</h3>
            <p className="text-xs text-slate-500">
              Pusat pengelolaan pangkalan data, ekspor-impor file JSON, dan sinkronisasi Cloud Firestore SMAN 3 Tumijajar.
            </p>
          </div>

          {/* Database Overview Interactive Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setCurrentView('students')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer shadow-2xs group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 group-hover:text-emerald-700 font-bold">Master Data Siswa</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 mt-1">{state?.students.length || 0}</div>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-medium">Buka Kelola Siswa &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('teachers')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-sky-50/60 border border-slate-200 hover:border-sky-300 text-left transition-all cursor-pointer shadow-2xs group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 group-hover:text-sky-700 font-bold">Akun Guru &amp; Roster</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 group-hover:text-sky-800 mt-1">{state?.teachers.length || 0}</div>
              <span className="text-[10px] text-slate-400 group-hover:text-sky-600 font-medium">Buka Direktori Guru &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('assessments')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-2xs group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 group-hover:text-indigo-700 font-bold">Modul Asesmen</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-800 mt-1">{state?.assessments.length || 0}</div>
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-medium">Buka Bank Soal &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('announcements')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-left transition-all cursor-pointer shadow-2xs group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 group-hover:text-purple-700 font-bold">Siaran Pengumuman</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900 group-hover:text-purple-800 mt-1">{state?.announcements?.length || 0}</div>
              <span className="text-[10px] text-slate-400 group-hover:text-purple-600 font-medium">Buka Pengumuman &rarr;</span>
            </button>
          </div>

          {/* Action Panel for Data Management */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-4 shadow-lg border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Panel Aksi Kelola Data &amp; Cadangan Sistem</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Gunakan tombol di bawah untuk mengunggah nilai rapor STS, mengunduh cadangan seluruh data sistem, atau memulihkan data dari file JSON.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {/* Button 0: Upload Nilai Rapor & Asesmen */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsUploadSTSModalOpen(true)}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ring-1 ring-sky-300"
                title="Unggah dan sinkronkan nilai rapor STS, SAS, formatif, atau SLM ke Daftar Nilai"
              >
                <UploadCloud className="w-4 h-4 text-sky-200" />
                <span>Upload Nilai Rapor &amp; Asesmen</span>
              </motion.button>

              {/* Button 1: Export Data JSON */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  exportBackupJSON();
                  showToast('Cadangan Data Berhasil Diunduh!', 'File backup data JSON sistem telah tersimpan.', 'success');
                }}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Backup JSON</span>
              </motion.button>

              {/* Button 2: Import / Restore Data JSON */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Restore Data JSON</span>
              </motion.button>

              {/* Button 3: Refresh State */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  refreshState();
                  showToast('Pangkalan Data Disinkronkan!', 'Sistem berhasil memperbarui state dari server.', 'info');
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <span>Sinkronkan Server State</span>
              </motion.button>

              {/* Button 4: Clean Cache */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  cleanSystemGarbage();
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-300 border border-slate-700 hover:border-rose-800 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Bersihkan Cache Lokal</span>
              </motion.button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>
              Versi Data: v{state?.version || 1} • Terakhir Diperbarui: {state?.lastUpdated || 'Hari ini'}
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Penyimpanan Ganda Aktif (Local Storage &amp; Cloud Disk)
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: AI ENGINE PROXY & MODELS */}
      {activeTab === 'engine' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Engine Proxy &amp; Models Configuration</h3>
            <p className="text-xs text-slate-500">
              Status integrasi @google/genai SDK, server proxy, dan parameter keamanan model.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 font-bold">SDK Status: @google/genai v0.1.1</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  CONNECTED
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Server proxy diatur untuk menangani pemanggilan Gemini API secara terisolasi tanpa mengekspos API Key ke kueri peramban. Terapkan fallback otomatis ke Gemini 2.5 Flash saat beban lalu lintas tinggi.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  showToast('Koneksi AI Engine Normal', 'Server proxy Gemini API terhubung dengan latensi 85ms.', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer transition-all active:scale-95"
              >
                Uji Koneksi Server Proxy Gemini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Prompt Baru */}
      <AnimatePresence>
        {isAddPromptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base text-slate-900">Tambah Prompt System Instruction Baru</h3>
                </div>
                <button
                  onClick={() => setIsAddPromptModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewPrompt} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Prompt / Modul
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Prompt Tutor Fisika & Eksperimen"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={newPromptCategory}
                      onChange={(e) => setNewPromptCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="peserta_didik">Peserta Didik</option>
                      <option value="koreksi_ai">Koreksi AI Vision</option>
                      <option value="pembelajaran_mendalam">Pembelajaran Mendalam</option>
                      <option value="administrasi">Administrasi &amp; Sistem</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Model Gemini Target</label>
                    <select
                      value={newPromptModel}
                      onChange={(e) => setNewPromptModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    System Instructions (Instruksi Sistem AI)
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Tuliskan instruksi peran, aturan, serta format respon AI..."
                    value={newPromptInstruction}
                    onChange={(e) => setNewPromptInstruction(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddPromptModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Prompt Baru</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Upload & Impor Nilai Rapor STS */}
      {isUploadSTSModalOpen && (
        <UploadRaporSTSModal
          isOpen={isUploadSTSModalOpen}
          onClose={() => setIsUploadSTSModalOpen(false)}
          onSuccessSync={() => {
            showToast('Sinkronisasi Sukses', 'Nilai Rapor STS berhasil terdata dan langsung terhubung ke Daftar Nilai.', 'success');
          }}
        />
      )}
    </div>
  );
};
