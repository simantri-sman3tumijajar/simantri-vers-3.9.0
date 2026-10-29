import React, { useState } from 'react';
import {
  Sparkles,
  Trash2,
  Plus,
  Camera,
  CheckCircle2,
  HelpCircle,
  Check,
  X,
  Layers,
  ArrowRight,
  ListOrdered,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { MCQQuestionItem, QuestionModelType, MatrixRowItem, MatchingPairItem } from '../types';
import { QuestionFormattingToolbar } from './QuestionFormattingToolbar';
import { InlineFormattedInput } from './InlineFormattedInput';

interface DynamicQuestionEditorProps {
  question: MCQQuestionItem;
  index: number;
  totalQuestions?: number;
  subjectName?: string;
  stimulusText?: string;
  domain?: 'literasi' | 'numerasi';
  onChange: (updated: MCQQuestionItem) => void;
  onDelete: () => void;
  showToast?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DynamicQuestionEditor: React.FC<DynamicQuestionEditorProps> = ({
  question,
  index,
  totalQuestions,
  subjectName = 'Umum',
  stimulusText = '',
  domain,
  onChange,
  onDelete,
  showToast,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const currentModel: QuestionModelType = question.modelSoal || 'PG';

  const updateQuestion = (patch: Partial<MCQQuestionItem>) => {
    onChange({
      ...question,
      ...patch,
    });
  };

  // Switch model handler
  const handleModelChange = (newModel: QuestionModelType) => {
    const patch: Partial<MCQQuestionItem> = { modelSoal: newModel };

    if (newModel === 'PG') {
      if (!question.pilihan || Object.keys(question.pilihan).length === 0) {
        patch.pilihan = { A: '', B: '', C: '', D: '', E: '' };
      }
      patch.kunci = question.kunci && ['A', 'B', 'C', 'D', 'E'].includes(question.kunci) ? question.kunci : 'A';
    } else if (newModel === 'BS') {
      patch.pilihan = { A: 'Benar', B: 'Salah', C: '', D: '', E: '' };
      patch.kunci = question.kunci === 'B' || question.kunci === 'Salah' ? 'Salah' : 'Benar';
    } else if (newModel === 'PG_KOMPLEKS') {
      if (!question.pilihan || Object.keys(question.pilihan).length === 0) {
        patch.pilihan = { A: '', B: '', C: '', D: '', E: '' };
      }
      if (!question.kunciMulti || question.kunciMulti.length === 0) {
        patch.kunciMulti = ['A'];
        patch.kunci = 'A';
      }
    } else if (newModel === 'MATRIX_TF') {
      patch.matrixType = question.matrixType || 'BENAR_SALAH';
      if (!question.matrixRows || question.matrixRows.length === 0) {
        patch.matrixRows = [
          { id: 'row-1', pernyataan: 'Pernyataan turunan 1...', kunci: 'Benar' },
          { id: 'row-2', pernyataan: 'Pernyataan turunan 2...', kunci: 'Salah' },
          { id: 'row-3', pernyataan: 'Pernyataan turunan 3...', kunci: 'Benar' },
        ];
      }
    } else if (newModel === 'MENJODOHKAN') {
      if (!question.matchingPairs || question.matchingPairs.length === 0) {
        patch.matchingPairs = [
          { id: 'match-1', premis: 'Premis pertanyaan 1', jawaban: 'Jawaban pasangan 1' },
          { id: 'match-2', premis: 'Premis pertanyaan 2', jawaban: 'Jawaban pasangan 2' },
        ];
      }
    } else if (newModel === 'ISIAN_SINGKAT') {
      patch.shortAnswerKey = question.shortAnswerKey || question.kunci || '';
    } else if (newModel === 'URAIAN') {
      patch.essayKeywords = question.essayKeywords || [];
    }

    updateQuestion(patch);
  };

  // Toggle Multi-select keys
  const toggleMultiKey = (optKey: string) => {
    let currentMulti = question.kunciMulti || [];
    if (currentMulti.includes(optKey)) {
      currentMulti = currentMulti.filter((k) => k !== optKey);
    } else {
      currentMulti = [...currentMulti, optKey].sort();
    }
    updateQuestion({
      kunciMulti: currentMulti,
      kunci: currentMulti.length > 0 ? currentMulti.join(', ') : 'A',
    });
  };

  // Auto-Generate Explanation via Server-Side Gemini API
  const handleGenerateExplanation = async () => {
    if (!question.soal.trim() && !stimulusText.trim()) {
      showToast?.('Soal Masih Kosong', 'Tuliskan teks butir soal terlebih dahulu sebelum men-generate pembahasan.', 'warning');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch('/api/gemini/generate-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soal: question.soal,
          modelSoal: currentModel,
          pilihan: question.pilihan,
          kunci: question.kunci,
          kunciMulti: question.kunciMulti,
          matrixType: question.matrixType,
          matrixRows: question.matrixRows,
          matchingPairs: question.matchingPairs,
          shortAnswerKey: question.shortAnswerKey,
          stimulusText,
          subjectName,
          domainLitNum: domain,
        }),
      });

      const data = await res.json();
      if (data.success && data.explanation) {
        updateQuestion({ penjelasan: data.explanation });
        showToast?.('Pembahasan Berhasil Dibuat', 'Penjelasan jawaban akurat telah di-generate. Anda dapat meninjau dan mengeditnya.', 'success');
      } else {
        throw new Error(data.message || 'Gagal menghasilkan pembahasan');
      }
    } catch (err: any) {
      console.error('Error generating explanation:', err);
      showToast?.('Gagal Generate Pembahasan', err.message || 'Koneksi AI sedang sibuk. Silakan coba kembali.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs space-y-4 relative group">
      {/* Top Header: Nomor Soal & Pemilih Model Soal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-slate-900 text-sm">
            Soal Nomor #{question.nomor}
          </span>

          {/* Model Soal Selector */}
          <select
            value={currentModel}
            onChange={(e) => handleModelChange(e.target.value as QuestionModelType)}
            className="p-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="PG">1. Pilihan Ganda Tunggal (Single Choice A-E)</option>
            <option value="PG_KOMPLEKS">2. Pilihan Ganda Kompleks (Multi Select A-E)</option>
            <option value="BS">3. Benar atau Salah (Pilihan Ganda Biner)</option>
            <option value="MATRIX_TF">4. Matriks Pernyataan (Benar/Salah atau Sesuai/Tidak)</option>
            <option value="MENJODOHKAN">5. Menjodohkan (Matching Pasangan Premis)</option>
            <option value="ISIAN_SINGKAT">6. Isian Singkat (Short Answer Eksak)</option>
            <option value="URAIAN">7. Uraian / Essay Deskriptif</option>
          </select>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
            Skor: {question.skor || 2}
          </span>
        </div>

        {/* Delete Question Button */}
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
          title="Hapus Butir Soal Ini"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Teks Butir Soal */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-extrabold text-slate-800">
            Pertanyaan Soal
          </label>
          <div className="flex items-center gap-1.5 text-[10.5px]">
            <span className="text-slate-400 font-bold">Sisipkan:</span>
            <button
              type="button"
              onClick={() => {
                const phrase = 'Perhatikan gambar berikut!';
                if (!question.soal.includes(phrase)) {
                  updateQuestion({ soal: `${phrase}\n${question.soal}`.trim() });
                }
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
            >
              + "Perhatikan gambar"
            </button>
          </div>
        </div>

        <QuestionFormattingToolbar
          value={question.soal}
          onChange={(newVal) => updateQuestion({ soal: newVal })}
          placeholder="Tuliskan pertanyaan soal di sini (dukung Bold Ctrl+B, Italic Ctrl+I, Underline Ctrl+U, penomoran berurutan, rumus/simbol)..."
          minHeight="72px"
        />

        {/* Gambar Soal Sisipan */}
        <div className="mt-2">
          {question.gambarSoalUrl ? (
            <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Gambar Terpasang pada Soal</span>
                </span>
                <button
                  type="button"
                  onClick={() => updateQuestion({ gambarSoalUrl: undefined })}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Hapus Gambar Soal
                </button>
              </div>
              <img
                src={question.gambarSoalUrl}
                alt="Gambar Soal"
                className="max-h-36 rounded-lg border border-slate-300 shadow-2xs object-contain"
              />
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 cursor-pointer text-xs font-semibold w-fit transition-all">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ Sisipkan Gambar ke Soal</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const res = evt.target?.result as string;
                    updateQuestion({
                      gambarSoalUrl: res,
                      soal: question.soal.includes('Perhatikan gambar')
                        ? question.soal
                        : `Perhatikan gambar di bawah ini!\n${question.soal || ''}`.trim(),
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODEL INPUT PILIHAN JAWABAN BERDASARKAN currentModel */}
      {/* ================================================================= */}

      {/* MODEL 1: Pilihan Ganda Tunggal (Radio Button) */}
      {currentModel === 'PG' && (
        <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Pilihan Jawaban (Klik Radio Button untuk Menentukan 1 Kunci Benar):
            </span>
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              Kunci: {question.kunci || 'A'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => (
              <div
                key={opt}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  question.kunci === opt
                    ? 'bg-emerald-50/80 border-emerald-400 font-bold ring-1 ring-emerald-400/30'
                    : 'bg-white border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name={`radio-key-${index}`}
                  checked={question.kunci === opt}
                  onChange={() => updateQuestion({ kunci: opt })}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-black text-slate-700 w-4">{opt}.</span>
                <InlineFormattedInput
                  value={question.pilihan?.[opt] || ''}
                  onChange={(newVal) => {
                    updateQuestion({
                      pilihan: {
                        ...(question.pilihan || { A: '', B: '', C: '', D: '', E: '' }),
                        [opt]: newVal,
                      },
                    });
                  }}
                  placeholder={`Teks pilihan ${opt}...`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODEL 2: Pilihan Ganda Kompleks (Multiple Select Checkbox) */}
      {currentModel === 'PG_KOMPLEKS' && (
        <div className="space-y-2 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-950">
              Pilihan Ganda Kompleks (Ceklis Semua Kotak yang Bernilai Benar):
            </span>
            <span className="text-xs font-black text-purple-900 bg-purple-200/80 px-2.5 py-0.5 rounded border border-purple-300">
              Kunci: {(question.kunciMulti || []).join(', ') || 'Belum Ditentukan'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => {
              const isChecked = (question.kunciMulti || []).includes(opt);
              return (
                <div
                  key={opt}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-purple-100/90 border-purple-400 font-bold ring-1 ring-purple-400/30'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMultiKey(opt)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="font-black text-purple-950 w-4">{opt}.</span>
                  <InlineFormattedInput
                    value={question.pilihan?.[opt] || ''}
                    onChange={(newVal) => {
                      updateQuestion({
                        pilihan: {
                          ...(question.pilihan || { A: '', B: '', C: '', D: '', E: '' }),
                          [opt]: newVal,
                        },
                      });
                    }}
                    placeholder={`Opsi pilihan ${opt}...`}
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODEL 3: Benar atau Salah (BS) */}
      {currentModel === 'BS' && (
        <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
          <span className="text-xs font-bold text-emerald-950 block">
            Pilihan Kunci Jawaban Biner (Benar / Salah):
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                question.kunci === 'Benar' || question.kunci === 'A'
                  ? 'bg-emerald-100 border-emerald-500 font-black text-emerald-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name={`radio-bs-${index}`}
                checked={question.kunci === 'Benar' || question.kunci === 'A'}
                onChange={() => updateQuestion({ kunci: 'Benar' })}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold">A. BENAR</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                question.kunci === 'Salah' || question.kunci === 'B'
                  ? 'bg-rose-100 border-rose-500 font-black text-rose-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name={`radio-bs-${index}`}
                checked={question.kunci === 'Salah' || question.kunci === 'B'}
                onChange={() => updateQuestion({ kunci: 'Salah' })}
                className="w-4 h-4 text-rose-600 focus:ring-rose-500"
              />
              <span className="font-bold">B. SALAH</span>
            </label>
          </div>
        </div>
      )}

      {/* MODEL 4: Matriks Pernyataan (Benar/Salah atau Sesuai/Tidak Sesuai) */}
      {currentModel === 'MATRIX_TF' && (
        <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-950">
              Tabel Pernyataan Matriks (Tentukan status biner tiap pernyataan):
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-bold text-slate-600">Model Biner:</span>
              <select
                value={question.matrixType || 'BENAR_SALAH'}
                onChange={(e) => updateQuestion({ matrixType: e.target.value as any })}
                className="p-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-sky-800"
              >
                <option value="BENAR_SALAH">Benar / Salah</option>
                <option value="SESUAI_TIDAK_SESUAI">Sesuai / Tidak Sesuai</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {(question.matrixRows || []).map((row, rIdx) => {
              const opt1 = question.matrixType === 'SESUAI_TIDAK_SESUAI' ? 'Sesuai' : 'Benar';
              const opt2 = question.matrixType === 'SESUAI_TIDAK_SESUAI' ? 'Tidak Sesuai' : 'Salah';

              return (
                <div key={row.id || rIdx} className="p-2.5 bg-white rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-sky-800 w-5 text-center">{rIdx + 1}.</span>
                    <input
                      type="text"
                      value={row.pernyataan}
                      onChange={(e) => {
                        const updatedRows = [...(question.matrixRows || [])];
                        updatedRows[rIdx].pernyataan = e.target.value;
                        updateQuestion({ matrixRows: updatedRows });
                      }}
                      placeholder={`Pernyataan ${rIdx + 1}...`}
                      className="flex-1 p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      row.kunci === opt1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name={`matrix-r-${index}-${rIdx}`}
                        checked={row.kunci === opt1}
                        onChange={() => {
                          const updatedRows = [...(question.matrixRows || [])];
                          updatedRows[rIdx].kunci = opt1 as any;
                          updateQuestion({ matrixRows: updatedRows });
                        }}
                        className="hidden"
                      />
                      <span>{opt1}</span>
                    </label>

                    <label className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      row.kunci === opt2 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name={`matrix-r-${index}-${rIdx}`}
                        checked={row.kunci === opt2}
                        onChange={() => {
                          const updatedRows = [...(question.matrixRows || [])];
                          updatedRows[rIdx].kunci = opt2 as any;
                          updateQuestion({ matrixRows: updatedRows });
                        }}
                        className="hidden"
                      />
                      <span>{opt2}</span>
                    </label>

                    {(question.matrixRows || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = (question.matrixRows || []).filter((_, i) => i !== rIdx);
                          updateQuestion({ matrixRows: filtered });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const rows = question.matrixRows || [];
              const defaultKey = question.matrixType === 'SESUAI_TIDAK_SESUAI' ? 'Sesuai' : 'Benar';
              updateQuestion({
                matrixRows: [
                  ...rows,
                  { id: `row-${Date.now()}`, pernyataan: `Pernyataan turunan ${rows.length + 1}...`, kunci: defaultKey as any },
                ],
              });
            }}
            className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Pernyataan Matriks</span>
          </button>
        </div>
      )}

      {/* MODEL 5: Menjodohkan (Matching) */}
      {currentModel === 'MENJODOHKAN' && (
        <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-3">
          <span className="text-xs font-bold text-teal-950 block">
            Daftar Pasangan Menjodohkan (Premis Lajur Kiri &lt;-&gt; Pasangan Jawaban Benar Lajur Kanan):
          </span>

          <div className="space-y-2">
            {(question.matchingPairs || []).map((pair, pIdx) => (
              <div key={pair.id || pIdx} className="p-2.5 bg-white rounded-xl border border-teal-200 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <span className="font-bold text-teal-800 w-5 text-center">{pIdx + 1}.</span>
                <input
                  type="text"
                  value={pair.premis}
                  onChange={(e) => {
                    const updated = [...(question.matchingPairs || [])];
                    updated[pIdx].premis = e.target.value;
                    updateQuestion({ matchingPairs: updated });
                  }}
                  placeholder="Item Premis (Kiri)..."
                  className="flex-1 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />

                <ArrowRight className="w-4 h-4 text-teal-600 hidden sm:block shrink-0" />

                <input
                  type="text"
                  value={pair.jawaban}
                  onChange={(e) => {
                    const updated = [...(question.matchingPairs || [])];
                    updated[pIdx].jawaban = e.target.value;
                    updateQuestion({ matchingPairs: updated });
                  }}
                  placeholder="Pasangan Jawaban Benar (Kanan)..."
                  className="flex-1 p-1.5 bg-teal-50/40 border border-teal-300 rounded-lg text-xs font-bold text-teal-900"
                />

                {(question.matchingPairs || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = (question.matchingPairs || []).filter((_, i) => i !== pIdx);
                      updateQuestion({ matchingPairs: filtered });
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Hapus Pasangan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const pairs = question.matchingPairs || [];
              updateQuestion({
                matchingPairs: [
                  ...pairs,
                  { id: `match-${Date.now()}`, premis: `Premis ${pairs.length + 1}`, jawaban: `Jawaban ${pairs.length + 1}` },
                ],
              });
            }}
            className="px-3 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Pasangan Menjodohkan</span>
          </button>
        </div>
      )}

      {/* MODEL 6: Isian Singkat (Short Answer) */}
      {currentModel === 'ISIAN_SINGKAT' && (
        <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
          <label className="block text-xs font-bold text-amber-950">
            Kunci Jawaban Singkat Eksak (Teks / Angka):
          </label>
          <input
            type="text"
            value={question.shortAnswerKey || question.kunci || ''}
            onChange={(e) => {
              updateQuestion({
                shortAnswerKey: e.target.value,
                kunci: e.target.value,
              });
            }}
            placeholder="Contoh: Fotosintesis atau 45 atau 3.14..."
            className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-[10px] text-amber-800 block">
            * Jawaban siswa akan dinilai otomatis berdasarkan kecocokan teks/angka ini (tidak sensitif huruf besar/kecil).
          </span>
        </div>
      )}

      {/* MODEL 7: Uraian / Essay Deskriptif */}
      {currentModel === 'URAIAN' && (
        <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
          <label className="block text-xs font-bold text-indigo-950">
            Pedoman Rubrik Jawaban Uraian &amp; Kata Kunci Penilaian:
          </label>
          <textarea
            value={question.kunci || ''}
            onChange={(e) => updateQuestion({ kunci: e.target.value })}
            placeholder="Tuliskan poin-poin rubrik penilaian jawaban benar, kata kunci utama, dan bobot skor..."
            rows={3}
            className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* SEKSI PENJELASAN / PEMBAHASAN SOAL & AUTO-GENERATE GEMINI AI */}
      {/* ================================================================= */}
      <div className="p-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 rounded-xl border border-slate-300 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Penjelasan / Pembahasan Jawaban Lengkap (Bisa Diedit Guru)</span>
            </label>
            <span className="text-[10.5px] text-slate-500">
              Tampil saat siswa meninjau pembahasan atau setelah ujian selesai.
            </span>
          </div>

          {/* Tombol Auto-Generate Pembahasan AI */}
          <button
            type="button"
            onClick={handleGenerateExplanation}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto"
            title="Generate otomatis penjelasan mengapa kunci benar dan pengecoh salah menggunakan Gemini AI"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyusun Pembahasan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate Pembahasan AI</span>
              </>
            )}
          </button>
        </div>

        {/* Textarea Penjelasan Jawaban (Dapat diedit guru) */}
        <textarea
          value={question.penjelasan || ''}
          onChange={(e) => updateQuestion({ penjelasan: e.target.value })}
          rows={3}
          placeholder="Penjelasan/pembahasan mengapa kunci jawaban benar dan opsi lain salah... (Klik 'Generate Pembahasan AI' untuk mengisi otomatis)"
          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
        />

        {question.penjelasan && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pembahasan siap disajikan kepada peserta didik.</span>
          </div>
        )}
      </div>
    </div>
  );
};
