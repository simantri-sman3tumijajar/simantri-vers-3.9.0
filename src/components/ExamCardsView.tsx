import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer,
  Search,
  Filter,
  Users,
  Sparkles,
  Download,
  Key,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Laptop,
  AlertCircle,
  Eye,
  Info,
  FileText,
} from 'lucide-react';
import {
  generateDSMartParticipantMap,
  formatClassToDSMartGroup,
  DEFAULT_DSMART_SAMPLE_RESULT,
} from '../utils/dsmartHelper';
import { getStudentCbtCredentials } from '../utils/cbtCredentialHelper';
import { DSMartGuideAndSimulatorModal } from './DSMartGuideAndSimulatorModal';
import { exportExamCardsPDF, getStudentGradeLevel, getSchedulesForStudentGrade, groupSchedulesByDay } from '../utils/pdfExport';
import { formatIndonesianDate } from '../utils/dateUtils';
import { generateParticipantNumber } from '../utils/examRoomAndNumberHelper';
import {
  processSignatureImage,
  getOfficialPrincipalData,
  DEFAULT_OFFICIAL_SIGNATURE_ASSET,
} from '../utils/signatureImageHelper';

export const ExamCardsView: React.FC = () => {
  const { state, showToast } = useApp();

  const school = state.schoolInfo;
  const students = state.students || [];
  const classes = state.classes || [];

  // Card Format: 'DSMART' (default per user prompt) or 'REGULAR'
  const [cardFormat, setCardFormat] = useState<'DSMART' | 'REGULAR' | 'ASAJ'>('DSMART');
  const [showSessionOnCard, setShowSessionOnCard] = useState<boolean>(false);
  const [showRoomOnCard, setShowRoomOnCard] = useState<boolean>(false);
  const [deviceNoticeOnCard, setDeviceNoticeOnCard] = useState<string>('HP Android (BYOD) / Chromebook');
  const [isGrade12Only, setIsGrade12Only] = useState<boolean>(false);
  const [printClassFilter, setPrintClassFilter] = useState('ALL');
  const [searchStudent, setSearchStudent] = useState('');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Official Principal Data & Signature URL Pre-processing (Anti-Black Background Fix)
  const principalData = useMemo(() => getOfficialPrincipalData(school), [school]);
  const [processedSignatureUrl, setProcessedSignatureUrl] = useState<string>(
    school.tandaTanganKepsekUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET
  );

  useEffect(() => {
    let isMounted = true;
    const runProcess = async () => {
      try {
        const cleanPng = await processSignatureImage(school.tandaTanganKepsekUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET);
        if (isMounted) {
          setProcessedSignatureUrl(cleanPng);
        }
      } catch (err) {
        console.warn('Failed to pre-process signature for ExamCardsView:', err);
      }
    };
    runProcess();
    return () => {
      isMounted = false;
    };
  }, [school.tandaTanganKepsekUrl]);

  // Compute DSMART continuous participant numbers map:
  // Class 1 (X.1): 001 - 036, Class 2 (X.2): 037 - ... rolls continuously across all classes
  const dsmartMap = useMemo(() => {
    return generateDSMartParticipantMap(
      students,
      classes,
      school.npsn || '69955116',
      '2026'
    );
  }, [students, classes, school.npsn]);

  // Exam Room & Smart Participant Number Allocation Map (Fitur 1 & 2 integration)
  const examRoomAllocMap = useMemo(() => {
    const map = new Map<string, { participantNumber: string; roomName: string; roomCode: string; seatNumber?: string; sessionNumber?: number }>();
    const rooms = state.examManagement?.examRooms || [];
    rooms.forEach((r) => {
      r.students.forEach((s) => {
        map.set(s.studentId, {
          participantNumber: s.participantNumber,
          roomName: r.roomName || `Ruang ${r.roomCode}`,
          roomCode: r.roomCode,
          seatNumber: s.seatNumber,
          sessionNumber: s.sessionNumber || 1,
        });
      });
    });
    return map;
  }, [state.examManagement?.examRooms]);

  // Filtered students for cards
  const printableStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = printClassFilter === 'ALL' || s.kelas === printClassFilter;
      const rawClassUpper = (s.kelas || '').trim().toUpperCase();
      const isG12 = rawClassUpper.startsWith('XII') || rawClassUpper.includes('12');
      const matchG12 = !isGrade12Only || isG12;
      const matchSearch =
        (s.nama || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
        (s.nisn || '').includes(searchStudent) ||
        (s.examUsername || '').includes(searchStudent);
      return matchClass && matchG12 && matchSearch;
    });
  }, [students, printClassFilter, searchStudent, isGrade12Only]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (printableStudents.length === 0) {
      showToast('Data Kosong', 'Tidak ada data siswa untuk diunduh sebagai PDF.', 'warning');
      return;
    }

    try {
      setIsExportingPDF(true);
      await exportExamCardsPDF(
        printableStudents,
        school,
        cardFormat,
        dsmartMap,
        printClassFilter,
        {
          schedules: state.examManagement?.schedules,
          examTitle: state.examManagement?.activeExamName || 'PENILAIAN AKHIR SEMESTER',
          roomName: 'Ruang CBT 01',
        }
      );
      showToast('PDF Berhasil Diunduh', `Kartu Ujian PDF (${cardFormat}) model resmi berhasil dibuat.`, 'success');
    } catch (err: any) {
      console.error('Error generating Exam Cards PDF:', err);
      showToast('Gagal Membuat PDF', err?.message || 'Terjadi kesalahan saat membuat file PDF.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-emerald-600 selection:text-white">
      {/* Top Header - Screen Only */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                Administrasi Peserta &bull; {cardFormat === 'DSMART' ? "Juknis Resmi D'SMART Lampung" : 'Format Cetak A4'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {cardFormat === 'DSMART'
                  ? "Cetak Kartu Peserta Simulasi D'SMART Lampung"
                  : 'Pendaftaran & Cetak Kartu Peserta Ujian CBT'}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            {cardFormat === 'DSMART'
              ? "Format resmi Simulasi D'SMART Lampung. Logo sekolah di kiri, logo provinsi di kanan, nomor peserta berurutan per rombel (NPSN-Tahun-NoUrut) dan Kredensial 8-digit acak."
              : 'Cetak kartu tanda peserta ujian resmi siswa dengan kop sekolah, pas foto siswa, NISN, QR code, serta Username & Password 8-digit angka acak.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Open Guide Modal */}
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Panduan Keamanan &amp; Hasil Akhir</span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Unduh Kartu Ujian PDF dengan Font Arial"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExportingPDF ? 'Proses PDF...' : 'Unduh PDF (A4)'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-lg shadow-slate-900/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Kartu ({cardFormat === 'DSMART' ? "D'SMART" : 'CBT'})</span>
          </button>
        </div>
      </div>

      {/* Filter & Controls Bar - Screen Only */}
      <div className="print:hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
        {/* Toggle Format: DSMART vs REGULAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-700">Pilihan Format Kartu:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCardFormat('DSMART')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'DSMART'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>KARTU PESERTA DSMART (Resmi Lampung)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardFormat('REGULAR');
                  setIsGrade12Only(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'REGULAR'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Kartu Ujian Reguler CBT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardFormat('ASAJ');
                  setIsGrade12Only(true);
                }}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'ASAJ'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>KARTU PESERTA ASAJ (Khusus Kelas XII)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary filters: Rombel & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Pilih Kelas:</span>
              <select
                value={printClassFilter}
                onChange={(e) => setPrintClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama} ({students.filter((s) => s.kelas === c.nama).length} Siswa)
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] font-bold text-slate-500">
              Ditemukan: <strong className="text-emerald-700">{printableStudents.length}</strong> Kartu Peserta
            </span>
          </div>
        </div>

        
        {/* Panel Konfigurasi Khusus Kartu Ujian ASAJ Kelas XII */}
        {cardFormat === 'ASAJ' && (
          <div className="p-4 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-300 inline-block">
                  PENGATURAN TATA LETAK ASAJ (KELAS XII)
                </span>
                <h4 className="font-extrabold text-xs text-indigo-950">
                  Konfigurasi Kartu: Mode Sesi vs Tanpa Sesi (Serentak BYOD)
                </h4>
              </div>

              {/* Toggle Sesi Switch */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">Tampilan Sesi pada Kartu:</span>
                <button
                  type="button"
                  onClick={() => setShowSessionOnCard(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    !showSessionOnCard
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Sembunyikan Sesi (Hanya mencantumkan Identitas & Kelas untuk Ujian Serentak)"
                >
                  Sembunyikan Sesi (Mode Serentak)
                </button>
                <button
                  type="button"
                  onClick={() => setShowSessionOnCard(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    showSessionOnCard
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Tampilkan Nomor Sesi dan Jam Ujian"
                >
                  Tampilkan Sesi &amp; Ruang
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-[11px]">Kebijakan Perangkat:</span>
                <select
                  value={deviceNoticeOnCard}
                  onChange={(e) => setDeviceNoticeOnCard(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg font-bold text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HP Android Siswa (BYOD)">HP Android Siswa (BYOD)</option>
                  <option value="Chromebook / Laptop Lab">Chromebook / Laptop Lab</option>
                  <option value="HP Android (BYOD) / Chromebook">HP Android / Chromebook (Hibrida)</option>
                  <option value="Perangkat Terdaftar SiMantri">Perangkat Terdaftar SiMantri</option>
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGrade12Only(!isGrade12Only)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isGrade12Only
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kunci Filter: Khusus Kelas XII {isGrade12Only ? '(Aktif)' : '(Non-aktif)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Informative Callout for DSMART Continuous Numbering */}
        {cardFormat === 'DSMART' && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-950 text-xs">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Penomoran Peserta D&apos;SMART Otomatis Kontinu Antarkelas:
              </p>
              <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                Nomor peserta dihitung berurutan dari kelas X.1 (001 s/d 036), berlanjut otomatis ke kelas X.2 (mulai 037 s/d jumlah siswa kelas tersebut), lalu X.3 dan seterusnya. Mengikuti format resmi: <strong className="font-mono text-emerald-950">{school.npsn || '69955116'}-2026-XXXX</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Informative Callout for CBT Umum vs LitNum Separation */}
        <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-2.5 text-indigo-950 text-xs">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-indigo-950 text-xs">
              Kartu Peserta Resmi Ujian CBT Umum (Kecuali LitNum):
            </p>
            <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
              Kartu ini dicetak khusus untuk sesi <strong>Ujian CBT Umum (ASTS, ASAS, Simulasi CBT, &amp; Sumatif Sekolah)</strong> yang menggunakan Username &amp; Password resmi tersimpan permanen. Untuk asesmen rutin <strong>CBT LitNum</strong> (Literasi &amp; Numerasi), siswa langsung masuk bebas sandi melalui daftar kelas tanpa memerlukan kartu ini.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINTABLE CARDS CONTAINER */}
      {/* ============================================================== */}
      {cardFormat === 'ASAJ' ? (
        /* ============================================================ */
        /* FORMAT KARTU PESERTA ASAJ KELAS XII (RESMI TAHUN 2025/2026)  */
        /* ============================================================ */
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 print-cards-grid print:grid-cols-2 print:gap-[10mm] print:p-[10mm] print:w-full print:box-border print:m-0"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {printableStudents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Tidak ada siswa Kelas XII yang ditemukan untuk kelas atau pencarian ini.
            </div>
          ) : (
            printableStudents.map((std, idx) => {
              const regCreds = getStudentCbtCredentials(std);
              const cardInfo = dsmartMap.get(std.id);
              const participantNumber = std.examParticipantNumber || cardInfo?.participantNumber || `${school.npsn || '69955116'}-2026-${String(idx + 1).padStart(4, '0')}`;
              const username = std.examUsername && std.examUsername.trim().length === 8 ? std.examUsername.trim() : regCreds.username;
              const password = std.examPassword && std.examPassword.trim().length >= 4 ? std.examPassword.trim() : regCreds.password;

              // Automatic session estimation if multi-session is displayed
              const rawClass = (std.kelas || '').toUpperCase();
              let sessionLabel = 'Sesi 1 (07.30 - 09.30 WIB)';
              if (rawClass.includes('2') || rawClass.includes('B')) {
                sessionLabel = 'Sesi 2 (10.00 - 12.00 WIB)';
              } else if (rawClass.includes('3') || rawClass.includes('C')) {
                sessionLabel = 'Sesi 3 (13.00 - 15.00 WIB)';
              }

              return (
                <div
                  key={std.id}
                  className="p-3.5 bg-white border-2 border-slate-800 shadow-sm space-y-2.5 relative font-serif text-slate-900 print-card-item print:shadow-none print:break-inside-avoid print:page-break-inside-avoid flex flex-col justify-between"
                  style={{
                    height: 'auto',
                    paddingBottom: '12px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Header / Kop Resmi Kartu ASAJ */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                    <img
                      src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                      alt="Logo Prov"
                      className="h-9 w-9 object-contain shrink-0"
                    />
                    <div className="flex-1 text-center px-1">
                      <p className="text-[9px] font-bold uppercase tracking-tight leading-tight text-slate-700">
                        PEMERINTAH PROVINSI LAMPUNG &bull; DINAS PENDIDIKAN
                      </p>
                      <p className="text-[11px] font-black uppercase tracking-tight leading-tight text-slate-950">
                        {school.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900 leading-tight mt-0.5">
                        KARTU PESERTA ASAJ (ASESMEN SUMATIF AKHIR JENJANG)
                      </p>
                      <p className="text-[8.5px] font-bold uppercase tracking-tight text-slate-600 leading-tight">
                        TAHUN PELAJARAN {school.tahunAjaranAktif || '2025/2026'} &bull; KHUSUS KELAS XII
                      </p>
                    </div>
                    <img
                      src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                      alt="Logo Sekolah"
                      className="h-9 w-9 object-contain shrink-0"
                    />
                  </div>

                  {/* Body Kartu: Data Siswa & QR Code Login */}
                  <div className="grid grid-cols-12 gap-2 text-[10.5px] items-center pt-0.5">
                    {/* QR Code Siswa 55px x 55px */}
                    <div className="col-span-3 flex flex-col items-center justify-center">
                      <div className="w-[56px] h-[56px] border border-slate-300 bg-white p-1 overflow-hidden flex items-center justify-center shadow-2xs">
                        <img
                          src={school.qrCodeKartuUrl || '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png'}
                          alt="QR Code Resmi"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[7.5px] font-sans font-black text-indigo-700 mt-1 uppercase text-center">
                        Scan QR CBT
                      </span>
                    </div>

                    {/* Data Peserta - Rata Titik Dua Sejajar */}
                    <div className="col-span-9 space-y-0.5 text-[10.5px]">
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">No Peserta</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-bold text-slate-950">
                          {participantNumber}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">NISN</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <span className="col-span-7 font-mono font-bold text-slate-900">
                          {std.nisn || '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Nama Siswa</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 uppercase truncate text-slate-950">
                          {std.nama}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Kelas / Rombel</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-bold text-indigo-900">
                          {std.kelas}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Username CBT</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-black text-indigo-950">
                          {username}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Password CBT</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-black text-indigo-950">
                          {password}
                        </strong>
                      </div>

                      {/* Mode Sesi & Ruang: Dirender jika showSessionOnCard aktif atau siswa telah dialokasikan ke ruang ujian */}
                      {(showSessionOnCard || Boolean(std.examRoom)) && (
                        <>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-700">Sesi Ujian</span>
                            <span className="col-span-1 text-center font-bold">:</span>
                            <span className="col-span-7 font-bold text-slate-900">{sessionLabel}</span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-700">Ruang Ujian</span>
                            <span className="col-span-1 text-center font-bold">:</span>
                            <span className="col-span-7 font-bold text-slate-950">
                              {std.examRoom || 'Ruang Lab Komputer'}
                              {std.examSeatNumber ? ` (Kursi ${std.examSeatNumber})` : ''}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Catatan Perangkat Diizinkan */}
                      <div className="grid grid-cols-12 gap-1 pt-0.5">
                        <span className="col-span-4 text-slate-700">Perangkat</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <span className="col-span-7 font-sans font-bold text-[9.5px] text-slate-800">
                          {deviceNoticeOnCard}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Garis Pembatas Halus */}
                  <div className="border-t border-slate-300 pt-1.5 flex items-end justify-between gap-2">
                    <div className="space-y-0.5 text-slate-500 italic text-[7.5px] leading-tight pb-0.5">
                      <p>* Kartu wajib dibawa selama ASAJ berlangsung.</p>
                      <p>* Dilarang bertukar perangkat antar-peserta.</p>
                      <p>* Terverifikasi Sistem CBT SiMantri SMAN 3 Tumijajar</p>
                    </div>

                    {/* Pengesahan Kepala Sekolah */}
                    <div className="relative text-left min-w-[145px] max-w-[165px] select-none text-[8.5px] leading-tight shrink-0">
                      <p className="text-slate-800 font-normal">
                        Tumijajar, {formatIndonesianDate(new Date())}
                      </p>
                      <p className="text-slate-900 font-normal">
                        {principalData.jabatan || 'Kepala SMA Negeri 3 Tumijajar,'}
                      </p>
                      <div className="relative h-11 my-0.5 flex items-center">
                        <img
                          src={processedSignatureUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET}
                          alt="Stempel & Tanda Tangan Kepala Sekolah"
                          className="absolute -left-5 -top-2.5 w-32 h-14 object-contain pointer-events-none z-10 select-none mix-blend-multiply"
                          style={{ pointerEvents: 'none' }}
                        />
                      </div>
                      <p className="font-bold underline text-[9.5px] text-slate-950 leading-none relative z-20">
                        {principalData.nama}
                      </p>
                      <p className="text-[8px] text-slate-700 leading-tight relative z-20 mt-0.5">
                        NIP. {principalData.nip}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : cardFormat === 'DSMART' ? (
        /* ============================================================ */
        /* FORMAT KARTU PESERTA DSMART (SESUAI GAMBAR 2 RESMI LAMPUNG) */
        /* ============================================================ */
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 print-cards-grid print:grid-cols-2 print:gap-[10mm] print:p-[10mm] print:w-full print:box-border print:m-0"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {printableStudents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Tidak ada siswa yang ditemukan untuk kelas atau pencarian ini.
            </div>
          ) : (
            printableStudents.map((std) => {
              const cardInfo = dsmartMap.get(std.id);
              const participantNumber = cardInfo?.participantNumber || `${school.npsn || '69955116'}-2026-001`;
              const kelompok = formatClassToDSMartGroup(std.kelas);
              const creds = getStudentCbtCredentials(std);
              const username = std.examUsername && std.examUsername.trim().length === 8 ? std.examUsername.trim() : creds.username;
              const password = std.examPassword && std.examPassword.trim().length >= 4 ? std.examPassword.trim() : creds.password;

              return (
                <div
                  key={std.id}
                  className="bg-white rounded-none border-2 border-slate-800 shadow-sm relative print-card-item print:border-slate-800 print:shadow-none print:break-inside-avoid print:page-break-inside-avoid overflow-hidden flex flex-col justify-between"
                  style={{ height: 'auto', paddingBottom: '12px', pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {/* Top Kop Resmi D'SMART (Logo Sekolah di KIRI, Logo Provinsi di KANAN) */}
                  <div className="p-3 border-b-2 border-slate-800 flex items-center justify-between gap-2 bg-white">
                    {/* Logo Sekolah di KIRI */}
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img
                        src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                        alt="Logo Sekolah"
                        className="max-h-11 max-w-11 object-contain"
                      />
                    </div>

                    {/* Teks Kop Tengah */}
                    <div className="flex-1 text-center px-1">
                      <h3 className="font-black text-xs sm:text-sm text-slate-950 uppercase tracking-wide leading-tight">
                        KARTU PESERTA
                      </h3>
                      <h4 className="font-bold text-[10px] sm:text-[11px] text-slate-900 uppercase tracking-tight leading-tight mt-0.5">
                        SIMULASI DSMART LAMPUNG
                      </h4>
                      <h4 className="font-bold text-[10px] sm:text-[11px] text-slate-900 uppercase tracking-tight leading-tight">
                        {school.namaSekolah || 'SMAN 3 TUMIJAJAR'}
                      </h4>
                    </div>

                    {/* Logo Provinsi di KANAN */}
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img
                        src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                        alt="Logo Provinsi Lampung"
                        className="max-h-11 max-w-11 object-contain"
                      />
                    </div>
                  </div>

                  {/* Body Identitas Peserta (Sesuai Layout Gambar 2) */}
                  <div className="p-3.5 space-y-1.5 text-xs text-slate-900">
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 sm:col-span-3 text-slate-700 font-semibold text-[11px]">Nomor Peserta</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 sm:col-span-8 font-black font-mono text-[12px] text-slate-950">
                        {participantNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 sm:col-span-3 text-slate-700 font-semibold text-[11px]">Kelompok</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 sm:col-span-8 font-bold text-slate-900 text-[11.5px]">
                        {kelompok}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 sm:col-span-3 text-slate-700 font-semibold text-[11px]">Nama Peserta</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 sm:col-span-8 font-black text-slate-950 uppercase text-[11.5px] truncate">
                        {std.nama}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 sm:col-span-3 text-slate-700 font-semibold text-[11px]">Sekolah</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 sm:col-span-8 font-bold text-slate-950 uppercase text-[11.5px]">
                        {school.namaSekolah || 'SMAN 3 TUMIJAJAR'}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 sm:col-span-3 text-slate-700 font-semibold text-[11px]">Server Tes</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 sm:col-span-8 text-slate-800 text-[11px]">
                        Tanya proktor sekolah masing-masing
                      </span>
                    </div>
                  </div>

                  {/* Tabel Bawah: Kelas | Username | Password */}
                  <div className="p-3 pt-0">
                    <table className="w-full border-collapse border-2 border-slate-800 text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-950 font-black text-[11px]">
                          <th className="border-2 border-slate-800 py-1 px-2 w-1/3">Kelas</th>
                          <th className="border-2 border-slate-800 py-1 px-2 w-1/3">Username</th>
                          <th className="border-2 border-slate-800 py-1 px-2 w-1/3">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-bold text-slate-950 text-[11.5px]">
                          <td className="border-2 border-slate-800 py-1.5 px-2 font-mono font-bold">{std.kelas}</td>
                          <td className="border-2 border-slate-800 py-1.5 px-2 font-mono font-bold">{username}</td>
                          <td className="border-2 border-slate-800 py-1.5 px-2 font-mono font-black">{password}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Catatan Kaki Resmi */}
                    <p className="mt-1.5 text-[9.5px] italic text-slate-600 font-medium">
                      Catatan: Kartu ini digunakan untuk login ke aplikasi DSMART.
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ============================================================ */
        /* FORMAT KARTU REGULER / CBT UMUM */
        /* ============================================================ */
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 print-cards-grid print:grid-cols-2 print:gap-[10mm] print:p-[10mm] print:w-full print:box-border print:m-0"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {printableStudents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Tidak ada siswa yang ditemukan untuk kelas atau pencarian ini.
            </div>
          ) : (
            printableStudents.map((std, idx) => {
              const regCreds = getStudentCbtCredentials(std);
              const cardInfo = dsmartMap.get(std.id);
              const roomAlloc = examRoomAllocMap.get(std.id);
              const currentYearCode = new Date().getFullYear().toString().slice(-2);
              const participantNumber =
                roomAlloc?.participantNumber ||
                std.examParticipantNumber ||
                cardInfo?.participantNumber ||
                generateParticipantNumber('12', currentYearCode, '01', idx + 1);
              const roomDisplay = roomAlloc?.roomName || std.examRoom || 'Ruang 01';
              const seatDisplay = roomAlloc?.seatNumber || std.examSeatNumber;
              const gradeLevel = getStudentGradeLevel(std.kelas);
              const gradeSchedules = getSchedulesForStudentGrade(state.examManagement?.schedules, gradeLevel, std.kelas);
              const activeExamTitle = (state.examManagement?.activeExamName || 'PENILAIAN AKHIR SEMESTER (ASAS)').toUpperCase();
              const username = std.examUsername && std.examUsername.trim().length === 8 ? std.examUsername.trim() : regCreds.username;
              const password = std.examPassword && std.examPassword.trim().length >= 4 ? std.examPassword.trim() : regCreds.password;

              return (
                <div
                  key={std.id}
                  className="p-3 bg-white border border-slate-800 shadow-sm space-y-2 relative font-serif text-slate-900 print-card-item print:shadow-none print:break-inside-avoid print:page-break-inside-avoid flex flex-col justify-between"
                  style={{
                    height: 'auto',
                    paddingBottom: '12px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Header / Kop Kartu Ujian Resmi */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <img
                      src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                      alt="Logo Prov"
                      className="h-8 w-8 object-contain shrink-0"
                    />
                    <div className="flex-1 text-center px-1">
                      <p className="text-[9.5px] font-bold uppercase tracking-tight leading-tight">
                        {school.judulKartuUjian || `KARTU PESERTA CBT ${activeExamTitle}`}
                      </p>
                      <p className="text-[11px] font-black uppercase tracking-tight leading-tight">
                        {school.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                      </p>
                      <p className="text-[8.5px] font-bold uppercase tracking-tight leading-tight">
                        TAHUN PELAJARAN {school.tahunAjaranAktif || '2026/2027'}
                      </p>
                    </div>
                    <img
                      src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                      alt="Logo Sekolah"
                      className="h-8 w-8 object-contain shrink-0"
                    />
                  </div>

                  {/* Body Kartu: Data Siswa & QR Code Resmi */}
                  <div className="grid grid-cols-12 gap-2 text-[10.5px] items-center pt-1">
                    {/* QR Code Siswa 55px x 55px */}
                    <div className="col-span-3 flex flex-col items-center justify-center">
                      <div className="w-[55px] h-[55px] border border-slate-300 bg-white p-1 overflow-hidden flex items-center justify-center shadow-2xs">
                        <img
                          src={school.qrCodeKartuUrl || '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png'}
                          alt="QR Code Resmi"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[7.5px] font-sans font-bold text-slate-500 mt-1 uppercase text-center">
                        Scan QR Login
                      </span>
                    </div>

                    {/* Data Peserta - Rata Titik Dua Sejajar */}
                    <div className="col-span-9 space-y-0.5 text-[10.5px]">
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">No Peserta</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-bold text-slate-950">
                          {participantNumber}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Nama</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 uppercase truncate text-slate-950">
                          {std.nama}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Kelas</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-bold text-slate-950">
                          {std.kelas}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Username</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-black text-indigo-950">
                          {username}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Password</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <strong className="col-span-7 font-mono font-black text-indigo-950">
                          {password}
                        </strong>
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-700">Ruang Ujian</span>
                        <span className="col-span-1 text-center font-bold">:</span>
                        <span className="col-span-7 font-bold text-slate-900">
                          {roomDisplay}
                          {seatDisplay ? ` (Kursi ${seatDisplay})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Jadwal Ujian Dinamis (Sesuai Tingkat Kelas) dengan RowSpan Murni & Border Header Tegas */}
                  <div className="pt-1">
                    {(() => {
                      const dayGroups = groupSchedulesByDay(gradeSchedules.slice(0, 5), std.kelas);
                      return (
                        <table
                          className="w-full border-collapse border border-slate-700 text-[9.5px]"
                          style={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                          }}
                        >
                          <thead>
                            <tr className="bg-slate-100 font-bold text-slate-900">
                              <th
                                className="border border-slate-700 py-1 px-1 text-center font-bold"
                                style={{ width: '28%', textAlign: 'center', border: '1px solid #334155' }}
                              >
                                Hari / Tanggal
                              </th>
                              <th
                                className="border border-slate-700 py-1 px-1 text-center font-bold"
                                style={{ width: '16%', textAlign: 'center', border: '1px solid #334155' }}
                              >
                                Kelas
                              </th>
                              <th
                                className="border border-slate-700 py-1 px-2 text-left font-bold"
                                style={{ width: '34%', textAlign: 'left', paddingLeft: '8px', border: '1px solid #334155' }}
                              >
                                Mata Pelajaran
                              </th>
                              <th
                                className="border border-slate-700 py-1 px-1 text-center font-bold"
                                style={{ width: '22%', textAlign: 'center', border: '1px solid #334155' }}
                              >
                                Waktu
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayGroups.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="border border-slate-700 py-1.5 text-center text-slate-400 italic">
                                  Belum ada jadwal ujian
                                </td>
                              </tr>
                            ) : (
                              dayGroups.map((group, gIdx) =>
                                group.items.map((sch, iIdx) => (
                                  <tr key={`${gIdx}-${iIdx}`} className="bg-white">
                                    {iIdx === 0 && (
                                      <td
                                        rowSpan={group.items.length}
                                        className="border border-slate-700 py-1 px-1 text-center font-medium"
                                        style={{
                                          verticalAlign: 'middle',
                                          textAlign: 'center',
                                          backgroundColor: '#ffffff',
                                          width: '28%',
                                          border: '1px solid #334155',
                                        }}
                                      >
                                        {group.hariTanggal}
                                      </td>
                                    )}
                                    <td
                                      className="border border-slate-700 py-0.5 px-1 text-center font-bold"
                                      style={{ width: '16%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #334155' }}
                                    >
                                      {sch.kelas || std.kelas}
                                    </td>
                                    <td
                                      className="border border-slate-700 py-0.5 px-2 text-left font-bold"
                                      style={{ width: '34%', textAlign: 'left', paddingLeft: '8px', verticalAlign: 'middle', border: '1px solid #334155' }}
                                    >
                                      {sch.mapel}
                                    </td>
                                    <td
                                      className="border border-slate-700 py-0.5 px-1 text-center font-mono text-[9px]"
                                      style={{ width: '22%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #334155' }}
                                    >
                                      {sch.waktu}
                                    </td>
                                  </tr>
                                ))
                              )
                            )}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  {/* Bagian Pengesahan / Tanda Tangan Kepala Sekolah (Legal Endorsement Block Sesuai Kaidah Tata Naskah Dinas) */}
                  <div className="flex items-end justify-between pt-1.5 border-t border-slate-300 text-[9px] relative mt-auto">
                    {/* Catatan Kiri Bawah */}
                    <div className="space-y-0.5 text-slate-500 italic text-[7.5px] leading-tight pb-0.5">
                      <p>* Kartu wajib dibawa selama asesmen berlangsung.</p>
                      <p>* Terverifikasi SiMantri SMAN 3 Tumijajar</p>
                    </div>

                    {/* Blok Pengesahan Kanan Bawah Sesuai Kaidah Tata Naskah Dinas */}
                    <div className="relative text-left min-w-[145px] max-w-[165px] select-none text-[8.5px] leading-tight shrink-0">
                      {/* Baris 1: Tempat & Tanggal */}
                      <p className="text-slate-800 font-normal">
                        Tumijajar, {formatIndonesianDate(new Date())}
                      </p>

                      {/* Baris 2: Jabatan */}
                      <p className="text-slate-900 font-normal">
                        {principalData.jabatan || 'Kepala SMA Negeri 3 Tumijajar,'}
                      </p>

                      {/* Baris 3: Area Tanda Tangan & Stempel Ungu Dinas (Overlapping Resmi) */}
                      <div className="relative h-11 my-0.5 flex items-center">
                        <img
                          src={processedSignatureUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET}
                          alt="Stempel & Tanda Tangan Kepala Sekolah"
                          className="absolute -left-5 -top-2.5 w-32 h-14 object-contain pointer-events-none z-10 select-none mix-blend-multiply"
                          style={{ pointerEvents: 'none' }}
                        />
                      </div>

                      {/* Baris 4: Nama Pejabat (Tebal & Garis Bawah) */}
                      <p className="font-bold underline text-[9.5px] text-slate-950 leading-none relative z-20">
                        {principalData.nama}
                      </p>

                      {/* Baris 5: NIP Pejabat */}
                      <p className="text-[8px] text-slate-700 leading-tight relative z-20 mt-0.5">
                        NIP. {principalData.nip}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
