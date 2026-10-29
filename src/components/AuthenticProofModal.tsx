import React, { useState, useEffect, useRef } from 'react';
import { Submission, Assessment, Student, SchoolInfo } from '../types';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Printer,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
  FileText,
  Award,
  Sparkles,
  QrCode,
  Calendar,
  User,
  BookOpen,
  Edit,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { generateAuthenticVerificationCode, getAuthenticStatus, buildVerificationURL, formatGuruNip } from '../utils/authenticProofHelper';
import { formatIndonesianDate, formatIndonesianDateTime } from '../utils/dateUtils';
import { getKKTPKategori, formatAcademicTitles } from '../utils/kktpHelper';
import { exportAuthenticProofPDF } from '../utils/pdfExport';
import { exportAuthenticProofWord } from '../utils/wordExport';

interface AuthenticProofModalProps {
  submission: Submission;
  assessment: Assessment;
  student?: Student;
  schoolInfo?: SchoolInfo;
  onClose: () => void;
  onOpenGrading?: () => void;
}

export const AuthenticProofModal: React.FC<AuthenticProofModalProps> = ({
  submission,
  assessment,
  student,
  schoolInfo,
  onClose,
  onOpenGrading,
}) => {
  const { state } = useApp();
  const school = schoolInfo || state?.schoolInfo;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(100);

  const studentName = submission.studentName || student?.nama || 'Siswa';
  const studentNisn = submission.nisn !== '-' ? submission.nisn : student?.nisn || '-';
  const studentClass = submission.kelas || student?.kelas || assessment.kelas;
  const guruName = assessment.guruPengampu || 'Guru Mata Pelajaran';

  const authCode =
    submission.authCode ||
    generateAuthenticVerificationCode(
      assessment.id,
      submission.studentId || submission.studentName,
      submission.waktuKoreksi || ''
    );

  const authStatus = getAuthenticStatus(submission);
  const kktpInfo = getKKTPKategori(submission.nilaiAkhir);

  const scannedImages: string[] = Array.isArray(submission.scannedImages) && submission.scannedImages.length > 0
    ? submission.scannedImages
    : submission.scannedImage
    ? [submission.scannedImage]
    : [];

  const teacherObj = state?.teachers?.find((t) => t.id === assessment.guruId || t.nama === assessment.guruPengampu);

  useEffect(() => {
    const payload = buildVerificationURL(submission, assessment, student, school, teacherObj);

    QRCode.toDataURL(payload, { width: 140, margin: 1 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [submission, assessment, student, school, teacherObj]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    await exportAuthenticProofPDF(submission, assessment, student, school);
  };

  const handleExportWord = async () => {
    await exportAuthenticProofWord(submission, assessment, student, school);
  };

  const handleDownloadImage = (imgUrl: string, index = 1) => {
    try {
      const link = document.createElement('a');
      link.href = imgUrl;
      const sanitizedName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const sanitizedClass = (student?.kelas || assessment.kelas || 'KELAS').replace(/[^a-zA-Z0-9_-]/g, '_');
      const sanitizedMapel = (assessment.mataPelajaran || 'MAPEL').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `LEMBAR_JAWABAN_KELAS_${sanitizedClass}_${sanitizedName}_${sanitizedMapel}_Lembar_${index}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(imgUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Lightbox for Scanned Photos */}
      <AnimatePresence>
        {selectedLightboxImage && (
          <div
            onClick={() => {
              setSelectedLightboxImage(null);
              setLightboxZoom(100);
            }}
            className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 select-none"
          >
            {/* Floating Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 inset-x-4 max-w-xl mx-auto z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Zoom Out (-) */}
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(50, prev - 25))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  title="Perkecil Foto (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Zoom Indicator */}
                <span className="text-xs font-black font-mono px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-indigo-400">
                  {lightboxZoom}%
                </span>

                {/* Zoom In (+) */}
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(400, prev + 25))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  title="Perbesar Foto (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {/* Reset Zoom */}
                <button
                  type="button"
                  onClick={() => setLightboxZoom(100)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset Skala Zoom ke 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">100%</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadImage(selectedLightboxImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  title="Unduh Berkas Foto Lembar Jawaban Ini"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Foto</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLightboxImage(null);
                    setLightboxZoom(100);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Preview Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex-1 overflow-auto w-full flex items-center justify-center p-4 pt-16"
            >
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center"
                style={{ transform: `scale(${lightboxZoom / 100})`, transformOrigin: 'center center' }}
              >
                <img
                  src={selectedLightboxImage}
                  alt="Pratinjau Lembar Jawaban Siswa"
                  className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-white/20"
                />
              </div>
            </div>
            <p className="text-white/70 text-[11px] font-semibold mt-1">
              Gunakan tombol Zoom (+ / -) di atas atau putar roda tetikus untuk memperbesar/memperkecil gambar
            </p>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-900 my-auto"
      >
        {/* Top Floating Control Bar */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>Bukti Otentik Hasil Asesmen & Koreksi</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-black border ${
                    authStatus.isDraft ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {authStatus.isDraft ? 'DRAF TERSIMPAN' : 'TERVERIFIKASI RESMI'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Kode Registrasi: <strong className="text-indigo-300">{authCode}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenGrading && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGrading();
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                title="Buka Lembar Siswa di Menu Koreksi Massal"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Buka di Koreksi</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 md:p-10 overflow-y-auto space-y-6 font-tnr print-only-sheet flex-1 min-h-0 overscroll-contain">
          {/* Official School Kop */}
          <div className="border-b-2 border-black pb-4 text-center relative">
            <div className="flex items-center justify-between mb-2">
              <img
                src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                alt="Logo Provinsi"
                className="w-18 h-16 sm:w-22 sm:h-20 object-fill scale-x-110"
              />
              <div className="text-center flex-1 px-3 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  {school?.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
                </h4>
                <h1 className="text-base sm:text-xl font-black uppercase tracking-wide text-black">
                  {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                </h1>
                <p className="text-[10px] sm:text-xs font-normal leading-snug text-slate-700">
                  {school?.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung 34794'}
                </p>
                <p className="text-[10px] sm:text-xs font-normal text-slate-700">
                  NPSN: {school?.npsn || '69955116'} • Website: {school?.website || 'https://sman3tumijajar.sch.id'} • Email: {school?.email || 'smantitumijajar@gmail.com'}
                </p>
              </div>
              <img
                src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                alt="Logo Sekolah"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            </div>
            <div className="w-full border-b border-black mt-1" />
          </div>

          {/* Document Title & Digital Seal */}
          <div className="text-center relative pt-2">
            <div className="inline-block border-b-2 border-black pb-1 mb-1">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide">
                BUKTI OTENTIK PENILAIAN HASIL ASESMEN & DRAF KOREKSI
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Nomor Registrasi Verifikasi Dokumen: <span className="font-mono font-bold text-black">{authCode}</span>
            </p>

            {/* Stamp Badge */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${authStatus.badgeClass}`}
              >
                {authStatus.isDraft ? (
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>{authStatus.label}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-900 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Asesmen {assessment.jenis} • Semester {assessment.semester} T.A {assessment.tahunAjaran}</span>
              </span>
            </div>
          </div>

          {/* Identity & Assessment Specification Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm bg-slate-50/80 p-4 rounded-2xl border border-slate-300">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Nama Peserta Didik</span>
                <span className="w-3">:</span>
                <span className="font-bold uppercase text-black flex-1">{studentName}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">NISN / No. Induk</span>
                <span className="w-3">:</span>
                <span className="font-mono font-semibold text-black flex-1">{studentNisn}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Kelas & Rombel</span>
                <span className="w-3">:</span>
                <span className="font-bold text-black flex-1">{studentClass} ({assessment.fase})</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">No. Absen / Urut</span>
                <span className="w-3">:</span>
                <span className="font-semibold text-black flex-1">{submission.noUrut || student?.noUrut || '-'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Mata Pelajaran</span>
                <span className="w-3">:</span>
                <span className="font-bold text-black flex-1">{assessment.mataPelajaran}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Guru Pengampu</span>
                <span className="w-3">:</span>
                <span className="font-bold text-black flex-1">{formatAcademicTitles(guruName)}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Waktu Simpan/Koreksi</span>
                <span className="w-3">:</span>
                <span className="font-semibold text-black flex-1">{formatIndonesianDateTime(submission.waktuKoreksi)}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Kriteria KKTP</span>
                <span className="w-3">:</span>
                <span className="font-bold text-black flex-1">{assessment.kktp || 75} Poin</span>
              </div>
            </div>
          </div>

          {/* Score & Academic Integrity Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs">
              <span className="block text-[11px] font-bold text-slate-500 uppercase">Nilai Akhir Rapor</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                {submission.nilaiAkhir}
              </span>
              <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${kktpInfo.badgeClass}`}>
                {kktpInfo.iconSymbol} {kktpInfo.kategori} ({kktpInfo.rentang})
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs">
              <span className="block text-[11px] font-bold text-slate-500 uppercase">Nilai Murni Siswa</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1 block">
                {submission.nilaiMurni ?? submission.nilaiAkhir}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Skala 100
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs col-span-2 sm:col-span-1">
              <span className="block text-[11px] font-bold text-slate-500 uppercase">Ketuntasan KKTP</span>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className={`text-xs sm:text-sm font-black text-center ${kktpInfo.badgeText}`}>
                  {kktpInfo.iconSymbol} {kktpInfo.subLabel}
                </span>
              </div>
              <span className="text-[10px] text-slate-600 font-semibold block mt-1 italic">
                {kktpInfo.remedialInfo}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs">
              <span className="block text-[11px] font-bold text-slate-500 uppercase">Deteksi Integritas AI</span>
              <span className="text-base sm:text-lg font-black mt-1 block text-slate-800">
                {submission.aiDetected ? `AI (${submission.aiPenaltyPercent || 0}%)` : '100% Tulisan Tangan'}
              </span>
              <span className="text-[9px] text-slate-500 font-semibold block mt-1">
                {submission.aiDetected ? 'Penalti Diberlakukan' : 'Orisinal & Alami'}
              </span>
            </div>
          </div>

          {/* AI Explanation / Reasoning if present */}
          {submission.aiExplanation && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Analisis Keaslian & Karakteristik Tulisan:</strong>
              <p className="text-slate-700 italic">{submission.aiExplanation}</p>
            </div>
          )}

          {/* Physical Document Proof: Scanned Answer Sheets Gallery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>
                  {scannedImages.length > 0
                    ? `Bukti Fisik & Foto Lembar Jawaban Siswa (${scannedImages.length} Lembar Terlampir)`
                    : 'Pernyataan Keabsahan & Validasi Lembar Jawaban Siswa'}
                </span>
              </h4>
              {scannedImages.length > 0 && (
                <span className="text-[11px] text-indigo-700 font-semibold">
                  Klik foto untuk memperbesar resolusi tinggi
                </span>
              )}
            </div>

            {scannedImages.length === 0 ? (
              <div className="p-5 text-center bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1.5">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                <p className="font-extrabold text-sm text-emerald-950">Jawaban Siswa Dinyatakan Sah & Terverifikasi Otentik</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed max-w-lg mx-auto">
                  Jawaban siswa dinyatakan sah setelah dilakukan pengecekan dan verifikasi secara mendalam meliputi struktur huruf, kata, kalimat, serta penyesuaian yang presisi dengan kunci jawaban dan rubrik penilaian yang berlaku. Berkas foto lembar jawaban telah dibersihkan secara otomatis demi efisiensi dan keamanan penyimpanan sistem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {scannedImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedLightboxImage(img)}
                    className="group relative rounded-xl overflow-hidden border-2 border-slate-300 hover:border-indigo-500 bg-slate-100 aspect-3/4 cursor-pointer shadow-xs transition-all"
                  >
                    <img
                      src={img}
                      alt={`Lembar Jawaban ${studentName} Hal ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity">
                      <ZoomIn className="w-6 h-6 mb-1" />
                      <span>Perbesar Lembar {i + 1}</span>
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                      Lembar {i + 1}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(img, i + 1);
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md cursor-pointer transition-transform active:scale-90 z-10 flex items-center gap-1 text-[10px] font-bold"
                      title="Unduh foto lembar jawaban ini"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item-by-Item Rubric & Student Real Text Breakdown */}
          <div className="space-y-2">
            <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Rincian Penilaian Butir per Butir Soal (Bukti Jawaban Nyata)</span>
            </h4>

            {Array.isArray(submission.itemScores) && submission.itemScores.length > 0 ? (
              <div className="border border-black rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-black font-bold text-center border-b border-black">
                      <th className="py-2 px-2 w-10 border-r border-black">No</th>
                      <th className="py-2 px-3 text-left w-2/5 border-r border-black">Jawaban / Transkripsi Siswa</th>
                      <th className="py-2 px-3 text-left border-r border-black">Rubrik & Ulasan Pedagogis</th>
                      <th className="py-2 px-2 w-16 border-r border-black">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {submission.itemScores.map((itm, idx) => {
                      const rubricItem = assessment.essayRubrik?.find((r) => r.nomor === itm.nomor);
                      const maxScore = rubricItem ? rubricItem.skorMaks : 10;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 text-center font-bold border-r border-black align-top">
                            {itm.nomor || idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-black align-top leading-relaxed">
                            <span className="font-semibold text-slate-900 block">
                              "{itm.jawabanSiswa || '(Jawaban tidak terdeteksi / kosong)'}"
                            </span>
                            {rubricItem && (
                              <span className="text-[10px] text-slate-500 block mt-1 font-sans">
                                <strong>Soal:</strong> {rubricItem.soal.substring(0, 80)}...
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 border-r border-black align-top text-slate-700 leading-relaxed font-sans text-[11px]">
                            {itm.feedback || 'Evaluasi sesuai rubrik ketuntasan kompetensi.'}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-slate-900 align-top">
                            <span className="text-sm">{itm.skor}</span>
                            <span className="text-[10px] text-slate-500 block">/ {maxScore}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : Array.isArray(submission.studentAnswers) && submission.studentAnswers.length > 0 ? (
              <div className="border border-black rounded-xl overflow-hidden p-3 bg-slate-50">
                <span className="font-bold text-xs block mb-2">Jawaban Pilihan Ganda (PG):</span>
                <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                  {submission.studentAnswers.map((ans, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-md border ${
                        ans.benar ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}
                    >
                      {ans.nomor}. {ans.jawabanSiswa} <span className="ml-1 text-[10px] font-black">{ans.benar ? '(B)' : '(S)'}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Rincian butir soal tersimpan secara global pada modul asesmen.
              </div>
            )}
          </div>

          {/* Official Capaian Pembelajaran / Kompetensi Narrative */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
            <h4 className="font-black text-xs sm:text-sm text-indigo-950 uppercase flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <span>Deskripsi Capaian Kompetensi (Rapor Resmi)</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify font-sans">
              {submission.capaianKompetensi || 'Telah mengikuti asesmen dan menunjukkan pemahaman materi sesuai kriteria.'}
            </p>
          </div>

          {/* Official Signature & QR Code Verification Footnote */}
          <div className="pt-6 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-6 text-xs sm:text-sm">
            {/* QR Code Seal */}
            <div className="flex items-center gap-3">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Verifikasi Otentik"
                  className="w-20 h-20 border border-black p-0.5 rounded-lg bg-white shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <div className="text-[10px] leading-tight text-slate-600 max-w-xs font-sans">
                <strong className="text-slate-900 block font-bold text-xs mb-0.5">
                  Verifikasi Sah SiMantri (SMAN 3 Tumijajar)
                </strong>
                Dokumen ini merupakan bukti otentik penilaian berbasis sistem kecerdasan buatan dan validasi guru. Keaslian data dapat dipindai secara langsung.
              </div>
            </div>

            {/* Teacher and Principal Signatures */}
            <div className="flex items-center gap-8 text-center shrink-0">
              <div>
                <p>Tumijajar, {formatIndonesianDate(submission.waktuKoreksi)}</p>
                <p className="font-semibold mt-0.5">Guru Mata Pelajaran</p>
                <div className="h-14" />
                <p className="font-bold underline">{formatAcademicTitles(guruName)}</p>
                <p className="text-[10px] text-slate-600">NIP: {formatGuruNip(assessment.guruId, teacherObj)}</p>
              </div>

              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold mt-0.5">Kepala Sekolah</p>
                <div className="h-14" />
                <p className="font-bold underline">{formatAcademicTitles(school?.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.')}</p>
                <p className="text-[10px] text-slate-600">NIP: {school?.nipKepalaSekolah || '19720512 199802 1 002'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>ID Dokumen: <strong className="text-slate-800">{authCode}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-rose-100" />
              <span>Ekspor PDF</span>
            </button>

            <button
              onClick={handleExportWord}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-100" />
              <span>Ekspor Word (.doc)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>Cetak Bukti Fisik</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
