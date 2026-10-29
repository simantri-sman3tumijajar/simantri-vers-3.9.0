import React, { useState } from 'react';
import { Assessment, SchoolInfo } from '../types';
import {
  X,
  Printer,
  FileText,
  BookOpen,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  Eye,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportASTSSoalPDF, exportASASSoalPDF } from '../utils/pdfExport';
import { exportASTSSoalWord, exportASASSoalWord } from '../utils/wordExport';
import { FormattedQuestionText, renderInlineFormattedText } from './FormattedQuestionText';

interface AssessmentDocumentPreviewModalProps {
  isOpen: boolean;
  assessment: Assessment;
  schoolInfo: SchoolInfo;
  onClose: () => void;
}

export const AssessmentDocumentPreviewModal: React.FC<AssessmentDocumentPreviewModalProps> = ({
  isOpen,
  assessment,
  schoolInfo,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'NASKAH' | 'KUNCI'>('NASKAH');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);

  if (!isOpen) return null;

  const isASTS = assessment.jenis === 'ASTS';

  const cleanSubTitle = (assessment.judul || '')
    .replace(/^(LEMBAR\s+SOAL\s+DAN\s+LEMBAR\s+JAWABAN|LEMBAR\s+SOAL)\s*/i, '')
    .trim() ||
    (isASTS
      ? `ASESMEN SUMATIF TENGAH SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()} T.P ${assessment.tahunAjaran}`
      : `SOAL ASESMEN SUMATIF AKHIR SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()}`);

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      if (isASTS) {
        await exportASTSSoalPDF(assessment, schoolInfo);
      } else {
        await exportASASSoalPDF(assessment, schoolInfo);
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    setDownloadingWord(true);
    try {
      if (isASTS) {
        await exportASTSSoalWord(assessment, schoolInfo);
      } else {
        await exportASASSoalWord(assessment, schoolInfo);
      }
    } finally {
      setDownloadingWord(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
      >
        {/* Modal Top Header Bar */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 text-indigo-300">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  PRATINJAU NASKAH SOAL ({assessment.jenis})
                </span>
                <span className="text-xs text-slate-400">Kelas {assessment.kelas} ({assessment.fase})</span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white mt-0.5 line-clamp-1">
                {assessment.mataPelajaran} — Standar Cetak F4 (Times New Roman)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('NASKAH')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'NASKAH'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Naskah Lembar Soal ({isASTS ? 'Essay' : 'Pilihan Ganda'})</span>
            </button>

            <button
              onClick={() => setActiveTab('KUNCI')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'KUNCI'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>{isASTS ? 'Rubrik & Kunci Jawaban Essay' : 'Kunci Jawaban PG (A-E)'}</span>
            </button>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500">
            Kertas F4 Folio • Font 11-12pt Times New Roman
          </span>
        </div>

        {/* Modal Scrollable Document Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain bg-slate-100/60">
          {activeTab === 'NASKAH' ? (
            /* Document Page Sheet (Styled like physical paper) */
            <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-md font-tnr text-black max-w-3xl mx-auto space-y-4">
              {/* Kop Surat Header */}
              <div className="border-b-2 border-black pb-2 text-center relative">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <img
                    src={schoolInfo.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                    alt="Logo Provinsi"
                    className="h-16 w-18 sm:w-20 object-fill shrink-0 scale-x-110"
                  />
                  <div className="flex-1 text-center font-bold uppercase leading-tight">
                    <div className="text-xs sm:text-sm font-bold">
                      {schoolInfo.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold tracking-wide">
                      {schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                    </div>
                    <div className="text-[10px] font-normal normal-case mt-0.5">
                      NPSN: {schoolInfo.npsn || '69955116'} — NSS: {schoolInfo.nss || '30.1.1812.02.021'} — Akreditasi "{schoolInfo.akreditasi || 'B'}"
                    </div>
                    <div className="text-[10px] font-normal normal-case">
                      {schoolInfo.alamat || 'Alamat : Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat'}
                    </div>
                  </div>
                  <img
                    src={schoolInfo.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                    alt="Logo Sekolah"
                    className="h-16 w-auto object-contain shrink-0"
                  />
                </div>
                <div className="border-t border-black mt-1" />
              </div>

              {/* Document Title Header (Single Line Without Duplication) */}
              <div className="text-center font-bold text-xs sm:text-sm uppercase space-y-0.5">
                {isASTS && <div>LEMBAR SOAL DAN LEMBAR JAWABAN</div>}
                <div>{cleanSubTitle}</div>
                {!isASTS && <div>TAHUN PELAJARAN {assessment.tahunAjaran}</div>}
              </div>

              {/* Student Metadata Table */}
              <div className="border border-black p-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-6 leading-relaxed">
                <div className="space-y-2">
                  <div>Mata Pelajaran : <strong>{assessment.mataPelajaran}</strong></div>
                  <div>Hari / Tanggal : {assessment.hariTanggal || '-'}</div>
                  <div>Pukul : {assessment.pukul || '07.30 - 09.00 WIB'}</div>
                  <div>Waktu : {assessment.waktuMenit} Menit</div>
                </div>
                <div className="space-y-2">
                  <div>Nama Siswa : ..........................................</div>
                  <div>Kelas / Fase : <strong>{assessment.kelas} ({assessment.fase})</strong></div>
                  <div>Guru Pengampu : {assessment.guruPengampu}</div>
                  <div>Nomor Peserta : ..........................................</div>
                </div>
              </div>

              {/* Petunjuk Umum */}
              <div className="text-xs space-y-1">
                <strong className="block font-bold uppercase">PETUNJUK UMUM:</strong>
                <ol className="list-decimal pl-4 space-y-0.5 text-[11px] leading-relaxed">
                  <li>Isikan identitas Anda pada lembar jawaban yang telah disediakan secara lengkap.</li>
                  <li>Kerjakan soal dengan teliti dan utamakan pemahaman mendalam.</li>
                  <li>Periksa kembali seluruh jawaban Anda sebelum diserahkan kepada pengawas ujian.</li>
                </ol>
              </div>

              {/* Question Items Content */}
              <div className="pt-2 border-t border-slate-300">
                <strong className="block font-bold text-xs uppercase mb-3 text-center underline">
                  SOAL UTAMA ({isASTS ? 'ESSAY TERSTRUKTUR' : 'PILIHAN GANDA A, B, C, D, E'})
                </strong>

                {isASTS ? (
                  /* ASTS Essay List */
                  <div className="space-y-4 text-xs leading-relaxed">
                    {assessment.essayRubrik && assessment.essayRubrik.length > 0 ? (
                      assessment.essayRubrik.map((q) => {
                        // Find if there is a reading passage for this question number
                        const passage = assessment.readingPassages?.find((pas) => pas.nomorAwal === q.nomor);
                        return (
                          <React.Fragment key={q.nomor}>
                            {passage && (
                              <div className="my-3 p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1 font-sans text-xs">
                                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-amber-700" />
                                  <span>
                                    Bacalah {passage.judul ? `"${passage.judul}"` : 'paragraf berikut'} untuk menjawab soal nomor {passage.nomorAwal} s.d. {passage.nomorAkhir}:
                                  </span>
                                </div>
                                <p className="text-slate-800 leading-relaxed italic whitespace-pre-wrap pl-2 border-l-2 border-amber-400">
                                  {passage.teks}
                                </p>
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="font-bold">{q.nomor}.</span>
                                <div className="flex-1">
                                  <FormattedQuestionText text={q.soal} />
                                  {q.gambarSoalUrl && (
                                    <div className="my-2">
                                      <img
                                        src={q.gambarSoalUrl}
                                        alt={`Gambar Soal ${q.nomor}`}
                                        className="max-h-48 max-w-full rounded border border-slate-300 object-contain mx-auto"
                                      />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] italic text-slate-500 font-sans">
                                  (Skor Maks: {q.skorMaks})
                                </span>
                              </div>
                              {/* Blank Answer Space Box */}
                              <div className="mt-1 border border-dashed border-slate-400 rounded p-2 min-h-[60px] text-[10px] text-slate-400 font-sans italic">
                                Lembar Jawaban Siswa No. {q.nomor}...
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <p className="text-slate-500 text-center py-4">Belum ada butir soal essay yang diinputkan.</p>
                    )}
                  </div>
                ) : (
                  /* ASAS MCQ List */
                  <div className="space-y-4 text-xs leading-relaxed">
                    {assessment.mcqQuestions && assessment.mcqQuestions.length > 0 ? (
                      assessment.mcqQuestions.map((q) => {
                        const passage = assessment.readingPassages?.find((pas) => pas.nomorAwal === q.nomor);
                        return (
                          <React.Fragment key={q.nomor}>
                            {passage && (
                              <div className="my-3 p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1 font-sans text-xs">
                                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-amber-700" />
                                  <span>
                                    Bacalah {passage.judul ? `"${passage.judul}"` : 'paragraf berikut'} untuk menjawab soal nomor {passage.nomorAwal} s.d. {passage.nomorAkhir}:
                                  </span>
                                </div>
                                <p className="text-slate-800 leading-relaxed italic whitespace-pre-wrap pl-2 border-l-2 border-amber-400">
                                  {passage.teks}
                                </p>
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="font-bold">{q.nomor}.</span>
                                <div className="flex-1">
                                  <FormattedQuestionText text={q.soal} />
                                  {q.gambarSoalUrl && (
                                    <div className="my-2">
                                      <img
                                        src={q.gambarSoalUrl}
                                        alt={`Gambar Soal PG ${q.nomor}`}
                                        className="max-h-48 max-w-full rounded border border-slate-300 object-contain mx-auto"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="pl-5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] mt-1">
                                {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                                  const val = (q.pilihan as any)?.[optKey];
                                  if (!val) return null;
                                  return (
                                    <div key={optKey} className="flex items-start gap-1.5">
                                      <span className="font-bold">{optKey}.</span>
                                      <span className="flex-1">{renderInlineFormattedText(String(val), `opt-doc-${optKey}`)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <p className="text-slate-500 text-center py-4">Belum ada butir soal pilihan ganda yang diinputkan.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Answer Keys & Rubric Tab */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-3xl mx-auto space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    Kunci Jawaban Resmi & Pedoman Penskoran ({assessment.jenis})
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                  Rahasia Guru / Korektor
                </span>
              </div>

              {isASTS ? (
                /* ASTS Rubric Details */
                <div className="space-y-3">
                  {assessment.essayRubrik?.map((item) => (
                    <div key={item.nomor} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center font-bold text-slate-800 flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span>Soal No. {item.nomor}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.essayType === 'TERBUKA' || (!item.essayType && (item.soal?.toLowerCase().includes('jelaskan') || item.soal?.toLowerCase().includes('analisis') || item.soal?.toLowerCase().includes('uraikan') || item.soal?.toLowerCase().includes('bagaimana')))
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {item.essayType === 'TERBUKA' || (!item.essayType && (item.soal?.toLowerCase().includes('jelaskan') || item.soal?.toLowerCase().includes('analisis') || item.soal?.toLowerCase().includes('uraikan') || item.soal?.toLowerCase().includes('bagaimana')))
                              ? 'Essay Terbuka'
                              : 'Essay Tertutup'}
                          </span>
                        </div>
                        <span className="text-indigo-600">Skor Maksimal: {item.skorMaks}</span>
                      </div>
                      <p className="text-slate-700 font-medium italic">"{item.soal}"</p>
                      <div className="pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-600">
                        <strong className="text-slate-800">Rubrik / Indikator Jawaban Utama:</strong>
                        <p className="mt-0.5 font-sans">{item.kunciJawaban || 'Tanggapan sesuai konsep utama Pembelajaran Mendalam.'}</p>
                      </div>

                      {(item.catatanKhususGuru || item.catatanJawaban) && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[10.5px] text-amber-900 space-y-0.5">
                          <strong className="text-amber-950 font-bold block">Catatan Khusus Guru & Toleransi Penilaian:</strong>
                          <p className="leading-snug">{item.catatanKhususGuru || item.catatanJawaban}</p>
                        </div>
                      )}
                      {item.kunciGambarUrl && (
                        <div className="pt-2 border-t border-emerald-200 space-y-1">
                          <strong className="text-emerald-800 text-[11px] flex items-center gap-1">
                            <span>Kunci Jawaban Gambar / Diagram Referensi Guru:</span>
                          </strong>
                          <img
                            src={item.kunciGambarUrl}
                            alt={`Kunci Gambar Referensi No. ${item.nomor}`}
                            className="max-h-48 rounded border border-emerald-300 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* ASAS Answer Keys Grid */
                <div className="space-y-3">
                  <p className="text-slate-600 text-[11px]">
                    Kunci jawaban resmi untuk {assessment.mcqQuestions?.length || 50} butir soal pilihan ganda:
                  </p>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono">
                    {assessment.mcqQuestions?.map((q) => (
                      <div
                        key={q.nomor}
                        className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center"
                      >
                        <span className="text-[10px] text-slate-400 font-sans font-semibold">No.{q.nomor}</span>
                        <span className="text-sm font-black text-indigo-700 mt-0.5">{q.kunci || 'A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Toolbar */}
        <div className="p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Cetak / Unduh PDF (.pdf)</span>
            </button>

            <button
              onClick={handleDownloadWord}
              disabled={downloadingWord}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold text-xs cursor-pointer shadow-xs transition-all disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Unduh Word Editabel (.doc)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs cursor-pointer transition-all duration-200"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
