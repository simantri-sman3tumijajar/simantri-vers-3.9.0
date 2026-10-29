import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Printer,
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  BookOpen,
  Download,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  generateDSMartParticipantMap,
  formatClassToDSMartGroup,
} from '../utils/dsmartHelper';
import { DSMartGuideAndSimulatorModal } from './DSMartGuideAndSimulatorModal';
import { exportExamAttendancePDF } from '../utils/pdfExport';
import { ProctorMonitorDashboard } from './ProctorMonitorDashboard';

export const ExamAttendanceView: React.FC = () => {
  const { state, showToast } = useApp();

  const school = state.schoolInfo;
  const students = state.students || [];
  const schedules = state.examManagement?.schedules || [];
  const classes = state.classes || [];
  const teachers = state.teachers || [];

  // Format Mode: 'DSMART_F4' (default) or 'REGULAR_A4'
  const [formatMode, setFormatMode] = useState<'DSMART_F4' | 'REGULAR_A4'>('DSMART_F4');
  const [activeSection, setActiveSection] = useState<'attendance' | 'live_proctor'>('attendance');

  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [sessionNumber, setSessionNumber] = useState<string>('1');
  const [examTimeRange, setExamTimeRange] = useState<string>('07:30 sampai dengan pukul 12:30');
  const [examDay, setExamDay] = useState<string>('Senin');
  const [examDate, setExamDate] = useState<string>('14');
  const [examMonth, setExamMonth] = useState<string>('September');
  const [examYear, setExamYear] = useState<string>('2026');
  const [examLocation, setExamLocation] = useState<string>('Tulang Bawang Barat');

  const [pengawasName, setPengawasName] = useState<string>('YOGI SUBAGJA, S.Pd.');
  const [pengawasNip, setPengawasNip] = useState<string>('19980828 202521 1 031');
  const [pengawasId, setPengawasId] = useState<string>(() => {
    const found = teachers.find((t) => t.proctorId);
    return found?.proctorId || 'PGW-12-26-001';
  });
  const [proktorName, setProktorName] = useState<string>('IRWAN WAYUDI, S.Pd.');
  const [proktorNip, setProktorNip] = useState<string>('19881209 202421 1 009');

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Compute DSMART continuous sequential numbers map:
  // Class X.1 starts at 001, ends at 036; Class X.2 starts at 037; etc.
  const dsmartMap = useMemo(() => {
    return generateDSMartParticipantMap(
      students,
      classes,
      school.npsn || '69955116',
      '2026'
    );
  }, [students, classes, school.npsn]);

  // Attendance Students (filtered by class or all)
  const attendanceStudents = useMemo(() => {
    const list = students.filter((s) => {
      if (selectedClass === 'ALL') return true;
      return s.kelas === selectedClass;
    });

    // Sort by name inside the selected class
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [students, selectedClass]);

  // Determine Grade Level (Tingkat) and Group Name (Kelompok)
  const gradeLevel = useMemo(() => {
    if (selectedClass === 'ALL') return 'X / XI / XII';
    return formatClassToDSMartGroup(selectedClass);
  }, [selectedClass]);

  const groupName = useMemo(() => {
    if (selectedClass === 'ALL') return 'Semua Kelas';
    return formatClassToDSMartGroup(selectedClass);
  }, [selectedClass]);

  // Pagination for F4 printing (20 students per page)
  const studentsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(attendanceStudents.length / studentsPerPage));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (attendanceStudents.length === 0) {
      showToast('Data Kosong', 'Tidak ada data siswa untuk diunduh sebagai presensi PDF.', 'warning');
      return;
    }

    try {
      setIsExportingPDF(true);
      await exportExamAttendancePDF(
        attendanceStudents,
        school,
        formatMode,
        {
          selectedClass,
          sessionNumber,
          examTimeRange,
          examDay,
          examDate,
          examMonth,
          examYear,
          examLocation,
          pengawasName,
          pengawasNip,
          proktorName,
          proktorNip,
        },
        dsmartMap
      );
      showToast('PDF Presensi Diunduh', `Daftar Hadir PDF (${formatMode === 'DSMART_F4' ? 'F4 Landscape' : 'A4 Portrait'}) dengan Font Arial telah dibuat.`, 'success');
    } catch (err: any) {
      console.error('Error generating Attendance PDF:', err);
      showToast('Gagal Membuat PDF', err?.message || 'Terjadi kesalahan saat membuat file PDF presensi.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-teal-600 selection:text-white">
      {/* Inline Print Styles for F4 Landscape */}
      <style>{`
        @media print {
          @page {
            size: 330mm 215mm landscape !important;
            margin: 8mm 12mm 8mm 12mm !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: #ffffff !important;
          }
          .dsmart-f4-page {
            page-break-after: always;
            break-after: page;
            min-height: 195mm;
            width: 100%;
          }
          .dsmart-f4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* Top Section Tab Switcher: Dokumen Daftar Hadir vs Live Sensor Pengawas */}
      <div className="print:hidden bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSection('attendance')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSection === 'attendance'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Daftar Hadir &amp; Presensi Siswa (Cetak F4/A4)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('live_proctor')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSection === 'live_proctor'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Live Sensor Pengawas (Anti-Cheat &amp; Pelanggaran)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900">
            Real-Time
          </span>
        </button>
      </div>

      {activeSection === 'live_proctor' ? (
        <ProctorMonitorDashboard initialClassFilter={selectedClass} />
      ) : (
        <>
          {/* Top Header - Screen Only */}
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider block">
                    Dokumen Administrasi Presensi &bull; Format Kertas F4 / Folio Landscape
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    {formatMode === 'DSMART_F4'
                      ? 'Daftar Hadir Simulasi DSMART Lampung (Kertas F4 Landscape)'
                      : 'Cetak Daftar Hadir Peserta Ujian CBT (A4 Portrait)'}
                  </h1>
                </div>
              </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            {formatMode === 'DSMART_F4'
              ? 'Standar resmi Simulasi D\'SMART Lampung. Kertas F4 Landscape (215 x 330 mm) dengan kop dinas, nomor peserta berurutan kontinu, berita acara, kolom tanda tangan zig-zag, serta lembar tanda tangan pengawas dan proktor.'
              : 'Format lembar presensi kehadiran resmi peserta asesmen sumatif / CBT per ruang ujian dengan kolom tanda tangan zig-zag.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Lihat Panduan &amp; Hasil Akhir DSMART</span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Unduh Daftar Hadir PDF dengan Font Arial"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExportingPDF ? 'Proses PDF...' : 'Unduh PDF (Arial)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-lg shadow-slate-900/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Cetak Presensi ({formatMode === 'DSMART_F4' ? 'F4 Landscape' : 'A4'})</span>
          </button>
        </div>
      </div>

      {/* Control Filter Bar - Screen Only */}
      <div className="print:hidden bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
        {/* Toggle Format: DSMART F4 Landscape vs REGULAR A4 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-700">Pilihan Format Dokumen:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFormatMode('DSMART_F4')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  formatMode === 'DSMART_F4'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>DAFTAR HADIR DSMART ASSESMENT (F4 Landscape)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormatMode('REGULAR_A4')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  formatMode === 'REGULAR_A4'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Format Reguler CBT (A4 Portrait)</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
            Kertas Cetak: {formatMode === 'DSMART_F4' ? 'F4 / Folio (215 x 330 mm) Landscape' : 'A4 Portrait'}
          </div>
        </div>

        {/* Input Parameters for Attendance Sheet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pilih Rombel / Kelas:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.nama}>
                  {c.nama} ({students.filter((s) => s.kelas === c.nama).length} Siswa)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nomor Sesi Ujian:</label>
            <select
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="1">Sesi 1</option>
              <option value="2">Sesi 2</option>
              <option value="3">Sesi 3</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Rentang Waktu Ujian:</label>
            <input
              type="text"
              value={examTimeRange}
              onChange={(e) => setExamTimeRange(e.target.value)}
              placeholder="Contoh: 07:30 sampai dengan pukul 12:30"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Hari &amp; Tanggal Ujian:</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={examDay}
                onChange={(e) => setExamDay(e.target.value)}
                placeholder="Senin"
                className="w-20 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-center"
              />
              <input
                type="text"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                placeholder="14"
                className="w-14 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-center"
              />
              <input
                type="text"
                value={examMonth}
                onChange={(e) => setExamMonth(e.target.value)}
                placeholder="September"
                className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-center"
              />
              <input
                type="text"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="2026"
                className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-center"
              />
            </div>
          </div>
        </div>

        {/* Pengawas & Proktor Signatories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ID Pengawas CBT:</label>
            <input
              type="text"
              value={pengawasId}
              onChange={(e) => setPengawasId(e.target.value)}
              placeholder="Contoh: PGW-12-26-001"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-900 font-mono text-xs uppercase"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Pengawas Ruang:</label>
            <input
              type="text"
              value={pengawasName}
              onChange={(e) => setPengawasName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">NIP Pengawas:</label>
            <input
              type="text"
              value={pengawasNip}
              onChange={(e) => setPengawasNip(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Proktor Ruang:</label>
            <input
              type="text"
              value={proktorName}
              onChange={(e) => setProktorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">NIP Proktor &amp; Lokasi:</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={proktorNip}
                onChange={(e) => setProktorNip(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 font-mono text-xs"
              />
              <input
                type="text"
                value={examLocation}
                onChange={(e) => setExamLocation(e.target.value)}
                placeholder="Tulang Bawang Barat"
                className="w-40 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINTABLE SHEET CONTAINER                                      */}
      {/* ============================================================== */}
      {formatMode === 'DSMART_F4' ? (
        /* ============================================================ */
        /* DAFTAR HADIR DSMART ASSESMENT (KERTAS F4 LANDSCAPE RESMI)   */
        /* SESUAI GAMBAR 4 DAN GAMBAR 5                                */
        /* ============================================================ */
        <div className="space-y-8 print:space-y-0">
          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            const pageStudents = attendanceStudents.slice(
              pageIdx * studentsPerPage,
              (pageIdx + 1) * studentsPerPage
            );
            const isLastPage = pageIdx === totalPages - 1;

            return (
              <div
                key={pageIdx}
                className="dsmart-f4-page bg-white p-6 sm:p-10 border-2 border-slate-300 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 space-y-4 text-slate-900 rounded-3xl print:rounded-none"
              >
                {/* Kop Resmi (Logo Sekolah Kiri, Logo Provinsi Kanan) Persis Gambar 4 */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 gap-3">
                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                    <img
                      src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                      alt="Logo Sekolah"
                      className="max-h-16 max-w-16 object-contain"
                    />
                  </div>

                  <div className="text-center flex-1 space-y-0.5">
                    <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-wider leading-tight">
                      DAFTAR HADIR
                    </h2>
                    <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-900 tracking-wide leading-tight">
                      SIMULASI DSMART LAMPUNG
                    </h3>
                    <p className="text-xs font-bold uppercase text-slate-800">
                      {school.namaSekolah || 'SMAN 3 TUMIJAJAR'}
                    </p>
                  </div>

                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                    <img
                      src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                      alt="Logo Provinsi Lampung"
                      className="max-h-16 max-w-16 object-contain"
                    />
                  </div>
                </div>

                {/* Sub-Header Box Persis Gambar 4 */}
                <div className="border border-slate-800 text-xs">
                  {/* Baris Status: SESI | TINGKAT | KELOMPOK | HALAMAN */}
                  <div className="bg-slate-100/80 p-2 text-center font-black text-slate-950 border-b border-slate-800 text-[11px] sm:text-xs">
                    SESI: {sessionNumber} | TINGKAT: {gradeLevel} | KELOMPOK: {groupName} (Hal {pageIdx + 1} dari {totalPages})
                  </div>

                  {/* Kalimat Berita Acara Persis Gambar 4 */}
                  <div className="p-2 text-slate-900 text-[11px] font-semibold leading-relaxed">
                    Pada hari ini {examDay} tanggal {examDate} bulan {examMonth} tahun {examYear}, telah diselenggarakan Simulasi DSMART Lampung dari pukul {examTimeRange}.
                  </div>
                </div>

                {/* Tabel Presensi Siswa Landscape Persis Gambar 4 & 5 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-100 text-slate-950 font-black text-center text-[10.5px]">
                        <th className="border border-slate-800 p-2 w-12 text-center">NO</th>
                        <th className="border border-slate-800 p-2 w-48 text-center">NO PESERTA</th>
                        <th className="border border-slate-800 p-2 w-36 text-center">NISN</th>
                        <th className="border border-slate-800 p-2 text-left pl-3">NAMA SISWA</th>
                        <th className="border border-slate-800 p-2 w-52 text-center">TANDA TANGAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-slate-800 p-6 text-center text-slate-400">
                            Tidak ada siswa di rombel ini.
                          </td>
                        </tr>
                      ) : (
                        pageStudents.map((std, idx) => {
                          const globalIdx = pageIdx * studentsPerPage + idx + 1;
                          const cardInfo = dsmartMap.get(std.id);
                          const participantNumber = cardInfo?.participantNumber || `${school.npsn || '69955116'}-2026-001`;
                          const isEven = globalIdx % 2 === 0;

                          return (
                            <tr key={std.id} className="hover:bg-slate-50/50">
                              <td className="border border-slate-800 p-1.5 text-center font-bold text-[11px]">
                                {globalIdx}
                              </td>
                              <td className="border border-slate-800 p-1.5 text-center font-mono font-bold text-[11.5px] text-slate-950">
                                {participantNumber}
                              </td>
                              <td className="border border-slate-800 p-1.5 text-center font-mono text-[11px]">
                                {std.nisn || '-'}
                              </td>
                              <td className="border border-slate-800 p-1.5 font-black uppercase text-slate-950 text-[11px] pl-3">
                                {std.nama}
                              </td>
                              {/* Kolom Tanda Tangan Zig-Zag Resmi */}
                              <td className="border border-slate-800 p-1.5 relative h-9 font-mono text-[10px] text-slate-400">
                                {isEven ? (
                                  <div className="text-right pr-4 font-bold text-slate-700">
                                    {globalIdx}. ...........................
                                  </div>
                                ) : (
                                  <div className="text-left pl-3 font-bold text-slate-700">
                                    {globalIdx}. ...........................
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Lembar Terakhir: Tanda Tangan Resmi Pengawas & Proktor Persis Gambar 5 */}
                {isLastPage && (
                  <div className="pt-6 grid grid-cols-2 gap-8 text-xs font-bold text-slate-900 print:break-inside-avoid">
                    {/* Sisi Kiri: PENGAWAS */}
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-wider text-[11px]">PENGAWAS</p>
                      <div className="h-20" />
                      <p className="font-black underline uppercase text-slate-950 text-xs">
                        {pengawasName}
                      </p>
                      <p className="font-mono text-slate-600 text-[10.5px]">
                        NIP. {pengawasNip}
                      </p>
                      {pengawasId && (
                        <p className="font-mono text-amber-900 text-[10px] font-bold">
                          ID Pengawas: {pengawasId}
                        </p>
                      )}
                    </div>

                    {/* Sisi Kanan: PROKTOR dengan Titimangsa */}
                    <div className="space-y-1 text-right">
                      <p className="text-[11px] font-bold text-slate-700">
                        PROKTOR
                      </p>
                      <p className="text-[11px] font-bold text-slate-800">
                        {examLocation}, {examDate} {examMonth} {examYear}
                      </p>
                      <div className="h-14" />
                      <p className="font-black underline uppercase text-slate-950 text-xs">
                        {proktorName}
                      </p>
                      <p className="font-mono text-slate-600 text-[10.5px]">
                        NIP. {proktorNip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================================ */
        /* DAFTAR HADIR REGULER CBT (A4 PORTRAIT)                       */
        /* ============================================================ */
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 space-y-6 text-slate-900">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 gap-4">
            <img
              src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
              alt="Logo Provinsi"
              className="h-16 w-auto object-contain"
            />
            <div className="text-center flex-1 space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {school.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </p>
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-wide">
                {school.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
              </h2>
              <p className="text-[10px] text-slate-600 font-medium leading-tight">
                {school.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung'}
              </p>
            </div>
            <img
              src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
              alt="Logo Sekolah"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
              DAFTAR HADIR PESERTA UJIAN CBT
            </h3>
            <p className="text-xs font-bold text-slate-700">
              Tahun Ajaran {school.tahunAjaranAktif || '2026/2027'} &bull; Semester {school.semesterAktif || 'Ganjil'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black text-center text-[10.5px]">
                  <th className="border border-slate-400 p-2 w-10">No</th>
                  <th className="border border-slate-400 p-2 w-32">Nomor Peserta</th>
                  <th className="border border-slate-400 p-2 w-28">NISN</th>
                  <th className="border border-slate-400 p-2">Nama Lengkap Siswa</th>
                  <th className="border border-slate-400 p-2 w-44">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                {attendanceStudents.map((std, idx) => {
                  const cardInfo = dsmartMap.get(std.id);
                  const participantNumber = cardInfo?.participantNumber || `${school.npsn || '69955116'}-2026-001`;
                  const isEven = (idx + 1) % 2 === 0;

                  return (
                    <tr key={std.id}>
                      <td className="border border-slate-400 p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-400 p-2 text-center font-mono font-bold text-[11px]">{participantNumber}</td>
                      <td className="border border-slate-400 p-2 text-center font-mono text-[11px]">{std.nisn || '-'}</td>
                      <td className="border border-slate-400 p-2 font-bold uppercase">{std.nama}</td>
                      <td className="border border-slate-400 p-2 h-9 text-slate-400 font-mono text-[10px]">
                        {isEven ? (
                          <div className="text-right pr-2">{idx + 1}. ....................</div>
                        ) : (
                          <div className="text-left pl-2">{idx + 1}. ....................</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-6 grid grid-cols-2 gap-8 text-xs font-bold text-slate-900">
            <div>
              <p>Pengawas Ruang,</p>
              <div className="h-16" />
              <p className="underline font-black">{pengawasName}</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. {pengawasNip}</p>
            </div>
            <div className="text-right">
              <p>{examLocation}, {examDate} {examMonth} {examYear}</p>
              <p>Proktor Ruang,</p>
              <div className="h-14" />
              <p className="underline font-black">{proktorName}</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. {proktorNip}</p>
              </div>
            </div>
          </div>
        )}
      </>
    )}

      {/* Global DSMart Guide and Simulator Modal */}
      {isGuideModalOpen && (
        <DSMartGuideAndSimulatorModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      )}
    </div>
  );
};
