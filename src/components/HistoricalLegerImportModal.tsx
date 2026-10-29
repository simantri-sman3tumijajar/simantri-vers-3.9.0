import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Link,
  Users,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, HistoricalLegerImportRecord, HistoricalLegerStudentRow } from '../types';

export interface HistoricalLegerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToCurrentSheet?: (subjectName: string, matchedScores: Map<string, number>) => void;
  onImportSuccess?: (record: HistoricalLegerImportRecord) => void;
  currentSubject?: string;
  currentClass?: string;
}

const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const HistoricalLegerImportModal: React.FC<HistoricalLegerImportModalProps> = ({
  isOpen,
  onClose,
  onApplyToCurrentSheet,
  onImportSuccess,
  currentSubject,
  currentClass,
}) => {
  const { state, currentUser, showToast, saveHistoricalLegerRecord } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration Fields
  const [tahunAjaranAsal, setTahunAjaranAsal] = useState('2024/2025');
  const [semesterAsal, setSemesterAsal] = useState<'Ganjil' | 'Genap'>('Genap');
  const [kelasAsal, setKelasAsal] = useState('X.1');
  const [targetKelas, setTargetKelas] = useState(currentClass || 'ALL');

  // File parsing states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedSubjects, setDetectedSubjects] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<HistoricalLegerStudentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [syncToCurrentMapel, setSyncToCurrentMapel] = useState(false);

  // Available classes in system
  const availableClasses = useMemo(() => {
    return state.classes.map((c) => c.nama).sort();
  }, [state.classes]);

  if (!isOpen) return null;

  // Process Excel File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawData || rawData.length < 3) {
          throw new Error('File Excel tidak memiliki data yang cukup.');
        }

        // 1. Locate Header Row (find row containing 'nama' or 'siswa')
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(12, rawData.length); i++) {
          const row = rawData[i];
          if (Array.isArray(row)) {
            const hasName = row.some((cell) => {
              const s = String(cell || '').toLowerCase();
              return s.includes('nama') || s.includes('siswa') || s.includes('peserta');
            });
            if (hasName) {
              headerRowIndex = i;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Kolom Nama Siswa tidak teridentifikasi pada file Excel.');
        }

        const headerRow = rawData[headerRowIndex].map((c) => String(c || '').trim());

        // Find column indices
        let noIdx = -1;
        let nisnIdx = -1;
        let nameIdx = -1;
        let jkIdx = -1;
        const subjectIndices: { colIndex: number; name: string }[] = [];

        headerRow.forEach((colName, idx) => {
          const cLower = colName.toLowerCase();
          if (cLower === 'no' || cLower === 'no.' || cLower === 'nomor') {
            noIdx = idx;
          } else if (cLower.includes('nisn') || cLower.includes('nis') || cLower.includes('no_induk')) {
            nisnIdx = idx;
          } else if (cLower.includes('nama') || cLower.includes('siswa')) {
            nameIdx = idx;
          } else if (cLower === 'jk' || cLower.includes('kelamin') || cLower === 'l/p') {
            jkIdx = idx;
          } else if (
            cLower &&
            !cLower.includes('jumlah') &&
            !cLower.includes('total') &&
            !cLower.includes('rata') &&
            !cLower.includes('rank') &&
            !cLower.includes('peringkat') &&
            !cLower.includes('ket') &&
            !cLower.includes('keterangan')
          ) {
            subjectIndices.push({ colIndex: idx, name: colName });
          }
        });

        if (nameIdx === -1) {
          throw new Error('Kolom NAMA SISWA wajib ada pada file Excel.');
        }

        const subjectsList = subjectIndices.map((s) => s.name);
        setDetectedSubjects(subjectsList);

        // 2. Parse Student Data Rows & Match with current system students
        const allStudentsInSystem = state.students || [];
        const studentNisnMap = new Map<string, Student>();
        const studentNameMap = new Map<string, Student>();

        allStudentsInSystem.forEach((st) => {
          if (st.nisn) {
            const cleanNisn = st.nisn.replace(/\D/g, '');
            if (cleanNisn) studentNisnMap.set(cleanNisn, st);
          }
          studentNameMap.set(cleanCanonical(st.nama), st);
        });

        const rows: HistoricalLegerStudentRow[] = [];

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;

          const rawName = String(row[nameIdx] || '').trim();
          if (!rawName || rawName.toLowerCase().includes('rata') || rawName.toLowerCase().includes('jumlah')) {
            continue;
          }

          const rawNisn = nisnIdx >= 0 ? String(row[nisnIdx] || '').trim() : '';
          const cleanRowNisn = rawNisn.replace(/\D/g, '');
          const rawJk = jkIdx >= 0 ? String(row[jkIdx] || '').trim().toUpperCase() : 'L';
          const noVal = noIdx >= 0 ? Number(row[noIdx]) : i - headerRowIndex;

          // Attempt Matching
          let matchedStudent: Student | undefined;
          let matchType: 'nisn' | 'nama' | 'unmatched' = 'unmatched';

          if (cleanRowNisn && studentNisnMap.has(cleanRowNisn)) {
            matchedStudent = studentNisnMap.get(cleanRowNisn);
            matchType = 'nisn';
          } else if (studentNameMap.has(cleanCanonical(rawName))) {
            matchedStudent = studentNameMap.get(cleanCanonical(rawName));
            matchType = 'nama';
          } else {
            // Partial name inclusion fallback
            const cRaw = cleanCanonical(rawName);
            matchedStudent = allStudentsInSystem.find((st) => {
              const cSt = cleanCanonical(st.nama);
              return cSt.length >= 5 && (cSt.includes(cRaw) || cRaw.includes(cSt));
            });
            if (matchedStudent) {
              matchType = 'nama';
            }
          }

          // Read Subject Scores
          const scores: Record<string, number | null> = {};
          let totalScore = 0;
          let countScore = 0;

          subjectIndices.forEach(({ colIndex, name }) => {
            const val = row[colIndex];
            const num = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.'));
            if (!isNaN(num) && num >= 0 && num <= 100) {
              scores[name] = Math.round(num);
              totalScore += scores[name]!;
              countScore++;
            } else {
              scores[name] = null;
            }
          });

          const averageScore = countScore > 0 ? totalScore / countScore : undefined;

          rows.push({
            studentId: matchedStudent?.id,
            matchedBy: matchType,
            noUrut: isNaN(noVal) ? rows.length + 1 : noVal,
            nisn: rawNisn || matchedStudent?.nisn,
            nama: rawName,
            jenisKelamin: rawJk === 'P' ? 'P' : 'L',
            kelasSekarang: matchedStudent?.kelas,
            kelasAsal: kelasAsal,
            scores,
            totalScore: countScore > 0 ? totalScore : undefined,
            averageScore,
          });
        }

        // Calculate rankings
        rows.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        rows.forEach((r, idx) => {
          r.rank = idx + 1;
        });
        rows.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));

        setParsedRows(rows);

        const matchedCount = rows.filter((r) => r.studentId).length;
        showToast(
          'File Berhasil Dibaca',
          `Terdeteksi ${rows.length} siswa dan ${subjectsList.length} mata pelajaran. ${matchedCount} siswa berhasil terhubung otomatis ke Master Data!`,
          'success'
        );
      } catch (err: any) {
        console.error('Error parsing historical leger Excel:', err);
        showToast('Gagal Membaca Excel', err.message || 'Format Excel tidak sesuai.', 'error');
        setParsedRows([]);
        setDetectedSubjects([]);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Metrics
  const totalParsed = parsedRows.length;
  const totalMatched = parsedRows.filter((r) => r.studentId).length;
  const totalUnmatched = totalParsed - totalMatched;
  const matchPercent = totalParsed > 0 ? Math.round((totalMatched / totalParsed) * 100) : 0;

  // Filtered rows for preview
  const displayRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (filterView === 'matched' && !r.studentId) return false;
      if (filterView === 'unmatched' && r.studentId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.nama.toLowerCase().includes(q) || (r.nisn && r.nisn.includes(q));
      }
      return true;
    });
  }, [parsedRows, filterView, searchQuery]);

  // Save Leger to System
  const handleCommitLeger = async () => {
    if (parsedRows.length === 0) {
      showToast('Data Kosong', 'Silakan pilih file Excel leger terlebih dahulu.', 'warning');
      return;
    }

    const newRecord: HistoricalLegerImportRecord = {
      id: `hist_leger_${Date.now()}_${kelasAsal.replace(/[^a-zA-Z0-9]/g, '_')}`,
      title: `Leger Kelas ${kelasAsal} (TP ${tahunAjaranAsal} - Sem ${semesterAsal})`,
      sourceFileName: selectedFile?.name || 'leger_import.xlsx',
      importedAt: new Date().toISOString(),
      importedBy: currentUser?.nama || 'Operator',
      tahunAjaranAsal,
      semesterAsal,
      kelasAsal,
      targetKelas: targetKelas === 'ALL' ? undefined : targetKelas,
      totalStudentsImported: totalParsed,
      totalMatchedStudents: totalMatched,
      subjectsDetected: detectedSubjects,
      records: parsedRows,
    };

    const success = await saveHistoricalLegerRecord(newRecord);

    // Optional: apply scores to current active sheet if requested and matching
    if (syncToCurrentMapel && onApplyToCurrentSheet && currentSubject) {
      const bestMatchSubject = detectedSubjects.find(
        (s) => s.toLowerCase().includes(currentSubject.toLowerCase()) || currentSubject.toLowerCase().includes(s.toLowerCase())
      ) || detectedSubjects[0];

      if (bestMatchSubject) {
        const scoreMap = new Map<string, number>();
        parsedRows.forEach((r) => {
          if (r.studentId && r.scores[bestMatchSubject] !== null && r.scores[bestMatchSubject] !== undefined) {
            scoreMap.set(r.studentId, r.scores[bestMatchSubject]!);
          }
        });
        onApplyToCurrentSheet(bestMatchSubject, scoreMap);
      }
    }

    if (success) {
      if (onImportSuccess) {
        onImportSuccess(newRecord);
      }
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Modul Integrasi Nilai Masa Lalu
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Impor File Leger Siswa (Tahun &amp; Kelas Sebelumnya)
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50">
            {/* Step 1: Configuration Parameters */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>1. Tentukan Parameter Leger Asal &amp; Target Hubungan Data</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Tahun Ajaran Asal */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tahun Ajaran Asal:</label>
                  <input
                    type="text"
                    value={tahunAjaranAsal}
                    onChange={(e) => setTahunAjaranAsal(e.target.value)}
                    placeholder="Contoh: 2024/2025"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Semester Asal */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Semester Asal:</label>
                  <select
                    value={semesterAsal}
                    onChange={(e) => setSemesterAsal(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>

                {/* Kelas / Rombel Asal */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kelas Asal (Ketika Dulu):</label>
                  <input
                    type="text"
                    value={kelasAsal}
                    onChange={(e) => setKelasAsal(e.target.value)}
                    placeholder="Contoh: X.1 atau XI.2"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Target Hubungan Kelas Sekarang */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Siswa Kelas Sekarang:</label>
                  <select
                    value={targetKelas}
                    onChange={(e) => setTargetKelas(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">Semua Siswa Terdaftar (Otomatis)</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        Khusus Siswa Rombel {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>2. Pilih File Excel Leger (.xlsx / .xls)</span>
              </h4>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">
                    {selectedFile ? selectedFile.name : 'Klik disini untuk memilih file Excel Leger'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mendukung file Excel resmi e-Rapor, Leger Sekolah, atau format rekapitulasi semester sebelumnya
                  </p>
                </div>
                {isProcessing && (
                  <span className="text-xs font-bold text-indigo-600 animate-pulse mt-1">
                    Sedang memproses dan mencocokkan data siswa...
                  </span>
                )}
              </div>
            </div>

            {/* Step 3: Match Statistics & Preview */}
            {parsedRows.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block">TOTAL SISWA DIBACA</span>
                    <span className="text-xl font-black text-slate-800">{totalParsed}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 font-bold block">✓ TERHUBUNG KE SISTEM</span>
                    <span className="text-xl font-black text-emerald-700">{totalMatched} ({matchPercent}%)</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-700 font-bold block">BELUM TERHUBUNG</span>
                    <span className="text-xl font-black text-amber-700">{totalUnmatched}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                    <span className="text-[10px] text-indigo-700 font-bold block">MAPEL TERDETEKSI</span>
                    <span className="text-xl font-black text-indigo-700">{detectedSubjects.length}</span>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterView('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterView === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Semua ({totalParsed})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('matched')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterView === 'matched' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ✓ Terhubung ({totalMatched})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('unmatched')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterView === 'unmatched' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Belum Terhubung ({totalUnmatched})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NISN..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Table Preview */}
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2 text-center w-10">No</th>
                        <th className="p-2 w-28">NISN</th>
                        <th className="p-2">Nama Siswa (Excel)</th>
                        <th className="p-2">Status Koneksi Data Sistem</th>
                        <th className="p-2 text-center">Rata-rata</th>
                        <th className="p-2 text-center">Peringkat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {displayRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-mono text-slate-600">{r.nisn || '-'}</td>
                          <td className="p-2 font-black text-slate-800">{r.nama}</td>
                          <td className="p-2">
                            {r.studentId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Terhubung ({r.kelasSekarang || 'Aktif'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Belum Terhubung
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-700">
                            {r.averageScore ? r.averageScore.toFixed(1) : '-'}
                          </td>
                          <td className="p-2 text-center font-black text-indigo-700">
                            {r.rank ? `#${r.rank}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Optional Sync to Current Mapel */}
                {onApplyToCurrentSheet && currentSubject && (
                  <label className="flex items-center gap-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncToCurrentMapel}
                      onChange={(e) => setSyncToCurrentMapel(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-900">
                      Terapkan nilai yang cocok langsung ke lembar nilai aktif saat ini ({currentSubject} kelas {currentClass})
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500 font-medium">
              Data yang diimpor akan tersimpan permanen di Riwayat Leger Sistem.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleCommitLeger}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Simpan Riwayat Leger ({totalMatched} Siswa Cocok)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
