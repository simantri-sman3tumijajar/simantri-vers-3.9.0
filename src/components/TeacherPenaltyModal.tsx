import React, { useState } from 'react';
import { Student, Submission, Assessment } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  CheckCircle2,
  Users,
  Percent,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getKKTPKategori } from '../utils/kktpHelper';

interface TeacherPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  submissions: Submission[];
  classStudents: Student[];
  onApplyPenalty: (
    updatedSubmissions: Array<{
      studentId: string;
      nilaiMurni: number;
      aiPenaltyPercent: number;
      aiPenaltyDeduction: number;
      nilaiAkhir: number;
      tuntas: boolean;
      aiExplanation: string;
    }>
  ) => void;
  initialSelectedStudentIds?: string[];
}

export const TeacherPenaltyModal: React.FC<TeacherPenaltyModalProps> = ({
  isOpen,
  onClose,
  assessment,
  submissions,
  classStudents,
  onApplyPenalty,
  initialSelectedStudentIds = [],
}) => {
  // Find all graded/submitted students
  const gradedStudents = classStudents.filter((std) => {
    const sub = submissions.find(
      (s) => s.studentId === std.id || s.studentName === std.nama
    );
    return !!sub && sub.nilaiAkhir !== undefined;
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
    if (initialSelectedStudentIds.length > 0) {
      return new Set(initialSelectedStudentIds);
    }
    return new Set();
  });

  const [penaltyPercent, setPenaltyPercent] = useState<number>(20);
  const [reasonNote, setReasonNote] = useState<string>(
    'Terindikasi kecurangan / mencontek saat pelaksanaan asesmen'
  );
  const [showConfirmStep, setShowConfirmStep] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === gradedStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(gradedStudents.map((s) => s.id)));
    }
  };

  // Preview calculations
  const simulationList = Array.from(selectedStudentIds).map((stdId) => {
    const std = classStudents.find((s) => s.id === stdId);
    const sub = submissions.find(
      (s) => s.studentId === stdId || s.studentName === std?.nama
    );

    const nilaiMurniAwal = sub?.nilaiMurni ?? sub?.nilaiAkhir ?? 0;
    const deduction = Math.round(nilaiMurniAwal * (penaltyPercent / 100));
    const newNilaiAkhir = Math.max(0, nilaiMurniAwal - deduction);
    const oldKktp = getKKTPKategori(nilaiMurniAwal);
    const newKktp = getKKTPKategori(newNilaiAkhir);

    return {
      studentId: stdId,
      studentName: std?.nama || sub?.studentName || 'Siswa',
      nisn: std?.nisn || sub?.nisn || '-',
      kelas: std?.kelas || sub?.kelas || assessment.kelas,
      nilaiMurniAwal,
      deduction,
      newNilaiAkhir,
      oldKktp,
      newKktp,
      sub,
    };
  });

  const handleConfirmApply = () => {
    if (selectedStudentIds.size === 0) return;

    const payload = simulationList.map((sim) => ({
      studentId: sim.studentId,
      nilaiMurni: sim.nilaiMurniAwal,
      aiPenaltyPercent: penaltyPercent,
      aiPenaltyDeduction: sim.deduction,
      nilaiAkhir: sim.newNilaiAkhir,
      tuntas: sim.newNilaiAkhir >= (assessment.kktp ?? 70),
      aiExplanation: `[Kebijakan Guru Mapel]: ${reasonNote} (Pemotongan ${penaltyPercent}% dari nilai murni ${sim.nilaiMurniAwal})`,
    }));

    onApplyPenalty(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col text-slate-900 my-auto"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white flex items-center justify-between border-b border-amber-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Kebijakan Pengurangan Nilai (Kecurangan / Mencontek)</span>
              </h3>
              <p className="text-xs text-amber-200/80">
                Mata Pelajaran: <strong className="text-white">{assessment.mataPelajaran}</strong> ({assessment.judul})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain">
          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ketentuan Kebijakan Penalti Guru Mapel:</span>
            </div>
            <p>
              Guru mata pelajaran berhak menetapkan persentase pengurangan nilai bagi siswa yang terindikasi kecurangan (seperti mencontek atau plagiarisme).
              <strong className="text-amber-900"> Nilai Murni Awal siswa tetap akan tersimpan aman di database</strong> sebagai arsip bukti otentik.
            </p>
          </div>

          {/* Step 1: Input Percentage & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  <span>Persentase Pengurangan Nilai (%)</span>
                </span>
                <span className="text-amber-600 font-extrabold">-{penaltyPercent}%</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={penaltyPercent}
                  onChange={(e) =>
                    setPenaltyPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                  }
                  className="w-20 p-2.5 bg-white border border-slate-300 rounded-xl text-center font-extrabold text-base text-amber-600 focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-xs"
                />
                <span className="text-xs font-bold text-slate-500">% Dari Nilai Murni Awal</span>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                {[10, 20, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPenaltyPercent(preset)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      penaltyPercent === preset
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    -{preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Alasan / Catatan Kebijakan Guru</span>
              </label>
              <textarea
                rows={3}
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Tuliskan catatan alasan penalti..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Step 2: Student Selection List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Pilih Siswa Terindikasi Kecurangan ({selectedStudentIds.size} dari {gradedStudents.length} Siswa)</span>
              </h4>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {selectedStudentIds.size === gradedStudents.length ? 'Batalkan Semua' : 'Pilih Semua Siswa'}
              </button>
            </div>

            {gradedStudents.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                Belum ada data siswa yang selesai dikoreksi untuk asesmen ini.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                {gradedStudents.map((std) => {
                  const sub = submissions.find(
                    (s) => s.studentId === std.id || s.studentName === std.nama
                  );
                  const isChecked = selectedStudentIds.has(std.id);
                  const score = sub?.nilaiMurni ?? sub?.nilaiAkhir ?? 0;

                  return (
                    <label
                      key={std.id}
                      className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/80 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(std.id)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-slate-900 font-bold block">{std.nama}</span>
                          <span className="text-[11px] text-slate-500">
                            Absen {std.noUrut || '-'} • NISN: {std.nisn || '-'} • Kelas {std.kelas}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 text-[11px] block">Nilai Awal</span>
                        <span className="font-black text-slate-900 text-sm">{score}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Simulation Preview Table */}
          {selectedStudentIds.size > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Simulasi Hasil Pengurangan Nilai ({simulationList.length} Siswa Terpilih)</span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5 text-center">Nilai Murni Awal</th>
                      <th className="p-2.5 text-center">Potongan (-{penaltyPercent}%)</th>
                      <th className="p-2.5 text-center">Nilai Akhir Baru</th>
                      <th className="p-2.5">Status KKTP Baru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {simulationList.map((sim) => (
                      <tr key={sim.studentId} className="hover:bg-amber-50/40">
                        <td className="p-2.5 font-bold text-slate-900">{sim.studentName}</td>
                        <td className="p-2.5 text-center font-bold text-slate-600">
                          {sim.nilaiMurniAwal}
                        </td>
                        <td className="p-2.5 text-center font-bold text-rose-600">
                          -{sim.deduction}
                        </td>
                        <td className="p-2.5 text-center font-black text-amber-700 text-sm">
                          {sim.newNilaiAkhir}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sim.newKktp.badgeClass}`}
                          >
                            <span>{sim.newKktp.iconSymbol}</span>
                            <span>{sim.newKktp.badgeTag}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {selectedStudentIds.size === 0 ? (
              <span className="text-rose-600 font-semibold">* Pilih minimal 1 siswa untuk melanjutkan</span>
            ) : (
              <span>
                Menyimpan perubahan untuk <strong className="text-slate-900">{selectedStudentIds.size} siswa</strong>.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={selectedStudentIds.size === 0}
              onClick={() => {
                if (!showConfirmStep) {
                  setShowConfirmStep(true);
                } else {
                  handleConfirmApply();
                }
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                showConfirmStep
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>
                {showConfirmStep
                  ? 'Ya, Konfirmasi & Simpan Pengurangan Nilai'
                  : 'Konfirmasi Pengurangan Nilai'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
