import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolInfo, SubjectGradeRecapSheet, StudentGradeRecord, HistoricalLegerImportRecord } from '../types';
import { drawOfficialKop, F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM, MARGIN_LEFT_MM } from './pdfExport';
import { formatAcademicTitles, getKKTPKategori } from './kktpHelper';
import { formatMataPelajaran } from './subjectNormalization';

// Helper to calculate Nilai Akhir Rapor (NAR)
export const calculateNAR = (
  record: StudentGradeRecord,
  weightTP: number = 50,
  weightSemester: number = 50
): number | null => {
  const tpScores = record.tpScores || {};
  const tpValues = Object.values(tpScores).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const nrsTP = tpValues.length > 0 ? tpValues.reduce((a, b) => a + b, 0) / tpValues.length : null;

  let semValues: number[] = [];
  if (typeof record.ptsScore === 'number' && !isNaN(record.ptsScore)) semValues.push(record.ptsScore);
  if (typeof record.pasScore === 'number' && !isNaN(record.pasScore)) semValues.push(record.pasScore);
  const nrsSemester = semValues.length > 0 ? semValues.reduce((a, b) => a + b, 0) / semValues.length : null;

  if (nrsTP === null && nrsSemester === null) return null;
  if (nrsTP !== null && nrsSemester === null) return Math.round(nrsTP);
  if (nrsTP === null && nrsSemester !== null) return Math.round(nrsSemester);

  const na = (nrsTP! * (weightTP / 100)) + (nrsSemester! * (weightSemester / 100));
  return Math.round(na);
};

// Helper to compute average TP
export const calculateRataTP = (record: StudentGradeRecord): number | null => {
  const tpScores = record.tpScores || {};
  const tpValues = Object.values(tpScores).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (tpValues.length === 0) return null;
  return Math.round(tpValues.reduce((a, b) => a + b, 0) / tpValues.length);
};

// Helper for Predicate & Category
export const getPredikatKeterangan = (nilai: number | null, kktp: number = 75) => {
  if (nilai === null || isNaN(nilai)) return { predikat: '-', keterangan: 'Belum Dinilai', tuntas: false };
  const info = getKKTPKategori(nilai);
  return {
    predikat: info.predikat,
    keterangan: info.kategori,
    tuntas: nilai >= kktp,
  };
};

/**
 * 1. TAB 1: REKAP NILAI RAPORT (SUMATIF & AKHIR)
 */
export async function generateTab1NilaiRaportPDF(
  sheet: SubjectGradeRecapSheet,
  school: SchoolInfo
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10);

  // Document Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DAFTAR REKAPITULASI NILAI RAPOR PESERTA DIDIK', F4_PAPER_WIDTH_MM / 2, startY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `TAHUN PELAJARAN ${sheet.tahunAjaran} - SEMESTER ${sheet.semester.toUpperCase()} (${sheet.fase.toUpperCase()})`,
    F4_PAPER_WIDTH_MM / 2,
    startY + 8.5,
    { align: 'center' }
  );

  // Metadata Subheader
  doc.setFontSize(8.5);
  const leftX = MARGIN_LEFT_MM;
  const rightX = F4_PAPER_WIDTH_MM / 2 + 5;
  const metaY = startY + 13;

  doc.text(`Mata Pelajaran : ${formatMataPelajaran(sheet.mataPelajaran)}`, leftX, metaY);
  doc.text(`Kelas / Rombel : ${sheet.kelas}`, leftX, metaY + 4.5);
  doc.text(`Kriteria KKTP   : ${sheet.kktp}`, leftX, metaY + 9);

  doc.text(`Guru Pengampu : ${formatAcademicTitles(sheet.guruName)}`, rightX, metaY);
  doc.text(`NIP Guru      : ${sheet.guruNip || '-'}`, rightX, metaY + 4.5);
  doc.text(
    `Bobot Nilai   : TP (${sheet.weightTPPercent}%) | PTS (${sheet.weightPTSPercent || 50}%) | PAS (${sheet.weightPASPercent || 50}%)`,
    rightX,
    metaY + 9
  );

  // Status Lock Stamp if locked
  if (sheet.isFinalLocked) {
    doc.setFont('times', 'bold');
    doc.setTextColor(180, 20, 20);
    doc.text('[ STATUS: DOKUMEN RESMI TERSIMPAN PERMANEN (FINAL) ]', F4_PAPER_WIDTH_MM / 2, metaY + 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Table Columns
  const head = [
    ['NO', 'NISN', 'NAMA LENGKAP SISWA', 'RATA TP', 'PTS/ASTS', 'PAS/ASAS', 'NILAI AKHIR', 'PRED', 'KET KETERCAPAIAN']
  ];

  const body = sheet.studentRecords.map((r, idx) => {
    const rTp = calculateRataTP(r);
    const nar = calculateNAR(r, sheet.weightTPPercent, sheet.weightSemesterPercent);
    const predInfo = getPredikatKeterangan(nar, sheet.kktp);

    return [
      idx + 1,
      r.nisn || '-',
      r.studentName,
      rTp !== null ? rTp : '-',
      r.ptsScore !== null && !isNaN(r.ptsScore) ? r.ptsScore : '-',
      r.pasScore !== null && !isNaN(r.pasScore) ? r.pasScore : '-',
      nar !== null ? nar : '-',
      predInfo.predikat,
      predInfo.keterangan,
    ];
  });

  autoTable(doc, {
    startY: sheet.isFinalLocked ? metaY + 17 : metaY + 14,
    head: head,
    body: body,
    styles: { font: 'times', fontSize: 8, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 56, halign: 'left' },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 18, fontStyle: 'bold' },
      7: { cellWidth: 12 },
      8: { cellWidth: 26 },
    },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Halaman ${pageNumber} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
        MARGIN_LEFT_MM,
        F4_PAPER_HEIGHT_MM - 8
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 120;
  const sigY = finalY > F4_PAPER_HEIGHT_MM - 60 ? 25 : finalY + 8;
  if (finalY > F4_PAPER_HEIGHT_MM - 60) {
    doc.addPage();
  }

  // Signature Block
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', MARGIN_LEFT_MM + 6, sigY);
  doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 6, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 6, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 6, sigY + 26);

  const rightSigX = F4_PAPER_WIDTH_MM - 75;
  doc.text(`Tumijajar, ${sheet.tanggalCetak || 'Desember 2026'}`, rightSigX, sigY);
  doc.text('Guru Mata Pelajaran,', rightSigX, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(sheet.guruName), rightSigX, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${sheet.guruNip || '-'}`, rightSigX, sigY + 26);

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}

/**
 * 2. TAB 2: PENILAIAN PENGETAHUAN & CAPAIAN KOMPETENSI
 */
export async function generateTab2PengetahuanCompetencyPDF(
  sheet: SubjectGradeRecapSheet,
  school: SchoolInfo
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10);

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DESKRIPSI CAPAIAN KOMPETENSI PEMBELAJARAN (RAPOR)', F4_PAPER_WIDTH_MM / 2, startY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `KURIKULUM MERDEKA & PEMBELAJARAN MENDALAM (DEEP LEARNING) - ${sheet.tahunAjaran}`,
    F4_PAPER_WIDTH_MM / 2,
    startY + 8.5,
    { align: 'center' }
  );

  doc.setFontSize(8.5);
  const leftX = MARGIN_LEFT_MM;
  const rightX = F4_PAPER_WIDTH_MM / 2 + 5;
  const metaY = startY + 13;

  doc.text(`Mata Pelajaran : ${formatMataPelajaran(sheet.mataPelajaran)}`, leftX, metaY);
  doc.text(`Kelas / Fase   : ${sheet.kelas} (${sheet.fase})`, leftX, metaY + 4.5);
  doc.text(`Guru Pengampu  : ${formatAcademicTitles(sheet.guruName)}`, rightX, metaY);
  doc.text(`KKTP / Kriteria: ${sheet.kktp} (Skala 0-100)`, rightX, metaY + 4.5);

  const head = [
    ['NO', 'NAMA SISWA', 'NAR', 'DESKRIPSI CAPAIAN KOMPETENSI (TERTINGGI & PERLU PENINGKATAN)']
  ];

  const body = sheet.studentRecords.map((r, idx) => {
    const nar = calculateNAR(r, sheet.weightTPPercent, sheet.weightSemesterPercent);
    // Determine competency text
    let desc = r.manualCompetencyDesc;
    if (!desc) {
      const narVal = typeof nar === 'number' ? nar : 75;
      if (narVal >= 88) {
        desc = `Menunjukkan penguasaan sangat baik dalam memahami esensi materi ${sheet.mataPelajaran}, mampu bernalar kritis dan merefleksikan konsep secara mandiri dan kontekstual.`;
      } else if (narVal >= sheet.kktp) {
        desc = `Menunjukkan pemahaman yang baik dalam menganalisis konsep ${sheet.mataPelajaran}. Perlu pendalaman lebih lanjut pada penerapan sintesis dan penalaran tingkat tinggi.`;
      } else {
        desc = `Perlu bimbingan intensif dan penguatan pemahaman konsep esensial pada mata pelajaran ${sheet.mataPelajaran} agar mencapai target KKTP secara optimal.`;
      }
    }

    return [
      idx + 1,
      r.studentName,
      nar !== null ? nar : '-',
      desc,
    ];
  });

  autoTable(doc, {
    startY: metaY + 9,
    head: head,
    body: body,
    styles: { font: 'times', fontSize: 7.5, cellPadding: 2.2, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 45, halign: 'left' },
      2: { cellWidth: 14, fontStyle: 'bold' },
      3: { cellWidth: 125, halign: 'left' },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Halaman ${data.pageNumber} | Capaian Kompetensi Kurikulum Merdeka`,
        MARGIN_LEFT_MM,
        F4_PAPER_HEIGHT_MM - 8
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 120;
  const sigY = finalY > F4_PAPER_HEIGHT_MM - 60 ? 25 : finalY + 8;
  if (finalY > F4_PAPER_HEIGHT_MM - 60) {
    doc.addPage();
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', MARGIN_LEFT_MM + 6, sigY);
  doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 6, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 6, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 6, sigY + 26);

  const rightSigX = F4_PAPER_WIDTH_MM - 75;
  doc.text(`Tumijajar, ${sheet.tanggalCetak || 'Desember 2026'}`, rightSigX, sigY);
  doc.text('Guru Mata Pelajaran,', rightSigX, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(sheet.guruName), rightSigX, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${sheet.guruNip || '-'}`, rightSigX, sigY + 26);

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}

/**
 * 3. TAB 3: ASESMEN HARIAN (TP 1 - TP 6)
 */
export async function generateTab3FormatifTPPDF(
  sheet: SubjectGradeRecapSheet,
  school: SchoolInfo
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10, { pageWidth: F4_PAPER_HEIGHT_MM });

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('REKAPITULASI NILAI ASESMEN HARIAN (TUJUAN PEMBELAJARAN TP 1 - TP 6)', F4_PAPER_HEIGHT_MM / 2, startY + 5, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `KELAS ${sheet.kelas} - MAPEL: ${formatMataPelajaran(sheet.mataPelajaran).toUpperCase()} - TP. ${sheet.tahunAjaran}`,
    F4_PAPER_HEIGHT_MM / 2,
    startY + 9,
    { align: 'center' }
  );

  const activeTPCount = sheet.activeTPCount || 6;
  const tpHeaders = Array.from({ length: activeTPCount }, (_, i) => `TP-${i + 1}`);

  const head = [
    ['NO', 'NISN', 'NAMA SISWA', ...tpHeaders, 'RATA TP', 'STATUS KKTP']
  ];

  const body = sheet.studentRecords.map((r, idx) => {
    const scores = tpHeaders.map((tpKey) => {
      const v = r.tpScores ? r.tpScores[tpKey] : null;
      return typeof v === 'number' && !isNaN(v) ? v : '-';
    });
    const rTp = calculateRataTP(r);
    const isTuntas = rTp !== null && rTp >= sheet.kktp;

    return [
      idx + 1,
      r.nisn || '-',
      r.studentName,
      ...scores,
      rTp !== null ? rTp : '-',
      rTp !== null ? (isTuntas ? 'Tuntas' : 'Perlu Remedial') : '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 13,
    head: head,
    body: body,
    styles: { font: 'times', fontSize: 7.5, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 65, halign: 'left' },
      [activeTPCount + 3]: { cellWidth: 20, fontStyle: 'bold' },
      [activeTPCount + 4]: { cellWidth: 28 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Rekap Asesmen Harian TP | Halaman ${data.pageNumber}`,
        MARGIN_LEFT_MM,
        F4_PAPER_WIDTH_MM - 8
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 120;
  const sigY = finalY > F4_PAPER_WIDTH_MM - 50 ? 25 : finalY + 8;
  if (finalY > F4_PAPER_WIDTH_MM - 50) {
    doc.addPage();
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', MARGIN_LEFT_MM + 10, sigY);
  doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 10, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 10, sigY + 20);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 10, sigY + 24);

  const rightSigX = F4_PAPER_HEIGHT_MM - 75;
  doc.text(`Tumijajar, ${sheet.tanggalCetak || 'Desember 2026'}`, rightSigX, sigY);
  doc.text('Guru Mata Pelajaran,', rightSigX, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(sheet.guruName), rightSigX, sigY + 20);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${sheet.guruNip || '-'}`, rightSigX, sigY + 24);

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}

/**
 * 4. TAB e-RAPOR: VALIDASI & PREVIEW e-RAPOR SMA
 */
export async function generateTabERaporValidasiPDF(
  sheet: SubjectGradeRecapSheet,
  school: SchoolInfo
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10);

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('LEMBAR VALIDASI & REKAPITULASI FORMAT e-RAPOR SMA', F4_PAPER_WIDTH_MM / 2, startY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `DIREKTORAT SMA KEMENDIKBUDRISTEK - TP ${sheet.tahunAjaran} SEMESTER ${sheet.semester.toUpperCase()}`,
    F4_PAPER_WIDTH_MM / 2,
    startY + 8.5,
    { align: 'center' }
  );

  doc.setFontSize(8.5);
  const leftX = MARGIN_LEFT_MM;
  const rightX = F4_PAPER_WIDTH_MM / 2 + 5;
  const metaY = startY + 13;

  doc.text(`Mata Pelajaran : ${formatMataPelajaran(sheet.mataPelajaran)}`, leftX, metaY);
  doc.text(`Kelas / Fase   : ${sheet.kelas} (${sheet.fase})`, leftX, metaY + 4.5);
  doc.text(`Guru Pengampu  : ${formatAcademicTitles(sheet.guruName)}`, rightX, metaY);
  doc.text(`Status Template: ${sheet.eraporMetadata ? '✓ Tersinkron UUID Resmi' : 'Template Standar Sistem'}`, rightX, metaY + 4.5);

  const head = [
    ['NO', 'NISN', 'NAMA SISWA', 'NAR', 'TP OPTIMAL', 'TP PERLU TINGKAT', 'STATUS e-RAPOR']
  ];

  const body = sheet.studentRecords.map((r, idx) => {
    const nar = calculateNAR(r, sheet.weightTPPercent, sheet.weightSemesterPercent);
    const achs = r.tpAchievements || {};
    let optCount = 0;
    let perCount = 0;
    Object.values(achs).forEach((v) => {
      if (v === 'T') optCount++;
      if (v === 'R') perCount++;
    });

    const isSuccess = optCount >= 1 && (nar === 100 || perCount >= 1);

    return [
      idx + 1,
      r.nisn || '-',
      r.studentName,
      nar !== null ? nar : '-',
      `${optCount} TP`,
      `${perCount} TP`,
      isSuccess ? '✓ Valid Sesuai Juknis' : 'Perlu Penyesuaian',
    ];
  });

  autoTable(doc, {
    startY: metaY + 9,
    head: head,
    body: body,
    styles: { font: 'times', fontSize: 8, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 65, halign: 'left' },
      3: { cellWidth: 16, fontStyle: 'bold' },
      4: { cellWidth: 24 },
      5: { cellWidth: 26 },
      6: { cellWidth: 28 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Lembar Validasi e-Rapor SMA | Halaman ${data.pageNumber}`,
        MARGIN_LEFT_MM,
        F4_PAPER_HEIGHT_MM - 8
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 120;
  const sigY = finalY > F4_PAPER_HEIGHT_MM - 60 ? 25 : finalY + 8;
  if (finalY > F4_PAPER_HEIGHT_MM - 60) {
    doc.addPage();
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', MARGIN_LEFT_MM + 6, sigY);
  doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 6, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 6, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 6, sigY + 26);

  const rightSigX = F4_PAPER_WIDTH_MM - 75;
  doc.text(`Tumijajar, ${sheet.tanggalCetak || 'Desember 2026'}`, rightSigX, sigY);
  doc.text('Guru Mata Pelajaran,', rightSigX, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(sheet.guruName), rightSigX, sigY + 22);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${sheet.guruNip || '-'}`, rightSigX, sigY + 26);

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}

/**
 * 5. TAB 4: LEGER NILAI KELAS (KOMPILASI SELURUH MAPEL)
 */
export async function generateTab4LegerKelasPDF(
  legerData: {
    classSubjects: string[];
    studentLeger: Array<{
      student: any;
      subjectScores: Record<string, number | null>;
      total: number;
      avg: number;
      rank: number;
    }>;
  },
  school: SchoolInfo,
  selectedClass: string,
  tahunAjaran: string,
  semester: string,
  fase: string,
  waliKelasName?: string
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10, { pageWidth: F4_PAPER_HEIGHT_MM });

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(`LEGER REKAPITULASI NILAI AKADEMIK SISWA KELAS ${selectedClass}`, F4_PAPER_HEIGHT_MM / 2, startY + 5, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `SEMESTER ${semester.toUpperCase()} TAHUN AJARAN ${tahunAjaran} - ${fase.toUpperCase()}`,
    F4_PAPER_HEIGHT_MM / 2,
    startY + 9,
    { align: 'center' }
  );

  const headRow = [
    'NO',
    'NISN',
    'NAMA SISWA',
    'L/P',
    ...legerData.classSubjects.map((s) => (s.length > 8 ? `${s.substring(0, 6)}..` : s)),
    'TOTAL',
    'RATA',
    'RANK',
  ];

  const bodyRows = legerData.studentLeger.map((item, idx) => [
    idx + 1,
    item.student?.nisn || '-',
    item.student?.nama || '-',
    item.student?.jenisKelamin || '-',
    ...legerData.classSubjects.map((s) => item.subjectScores[s] ?? '-'),
    item.total,
    item.avg > 0 ? item.avg.toFixed(1) : '-',
    `#${item.rank}`,
  ]);

  autoTable(doc, {
    startY: startY + 13,
    head: [headRow],
    body: bodyRows,
    styles: { font: 'times', fontSize: 7, cellPadding: 1.5, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 20 },
      2: { cellWidth: 42, halign: 'left' },
      3: { cellWidth: 8 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Leger Nilai Kelas ${selectedClass} | Halaman ${data.pageNumber}`,
        MARGIN_LEFT_MM,
        F4_PAPER_WIDTH_MM - 8
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 80;
  const sigY = finalY > F4_PAPER_WIDTH_MM - 50 ? 25 : finalY + 8;
  if (finalY > F4_PAPER_WIDTH_MM - 50) {
    doc.addPage();
  }

  doc.setFontSize(8);
  doc.text('Mengetahui,', MARGIN_LEFT_MM + 10, sigY);
  doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 10, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 10, sigY + 20);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 10, sigY + 24);

  const rightSigX = F4_PAPER_HEIGHT_MM - 75;
  doc.text(`Tumijajar, Desember 2026`, rightSigX, sigY);
  doc.text(`Wali Kelas ${selectedClass}`, rightSigX, sigY + 4);
  doc.setFont('times', 'bold');
  doc.text(formatAcademicTitles(waliKelasName || 'Wali Kelas'), rightSigX, sigY + 20);
  doc.setFont('times', 'normal');
  doc.text('NIP. -', rightSigX, sigY + 24);

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}

/**
 * 6. LEGER HISTORIS SISWA DARI TAHUN / KELAS SEBELUMNYA
 */
export async function generateHistoricalLegerPDF(
  record: HistoricalLegerImportRecord,
  school: SchoolInfo
): Promise<{ doc: jsPDF; blobUrl: string }> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM],
  });

  const startY = await drawOfficialKop(doc, school, 10, { pageWidth: F4_PAPER_HEIGHT_MM });

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(`LEGER RIWAYAT AKADEMIK SISWA (HISTORIS KELAS SEBELUMNYA)`, F4_PAPER_HEIGHT_MM / 2, startY + 5, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(
    `ASAL: KELAS ${record.kelasAsal} (TP. ${record.tahunAjaranAsal} - SEMESTER ${record.semesterAsal.toUpperCase()}) | TARGET: ${record.targetKelas || 'SELURUH SISWA SISTEM'}`,
    F4_PAPER_HEIGHT_MM / 2,
    startY + 9,
    { align: 'center' }
  );

  const headRow = [
    'NO',
    'NISN',
    'NAMA SISWA',
    'STATUS MAPPING',
    ...record.subjectsDetected.map((s) => (s.length > 8 ? `${s.substring(0, 6)}..` : s)),
    'TOTAL',
    'RATA',
    'RANK',
  ];

  const bodyRows = record.records.map((r, idx) => {
    return [
      idx + 1,
      r.nisn || '-',
      r.nama,
      r.studentId ? `✓ Cocok (${r.kelasSekarang || 'Aktif'})` : 'Belum Terhubung',
      ...record.subjectsDetected.map((s) => r.scores[s] ?? '-'),
      r.totalScore ?? '-',
      r.averageScore ? r.averageScore.toFixed(1) : '-',
      r.rank ? `#${r.rank}` : '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 13,
    head: [headRow],
    body: bodyRows,
    styles: { font: 'times', fontSize: 7, cellPadding: 1.5, halign: 'center' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 20 },
      2: { cellWidth: 42, halign: 'left' },
      3: { cellWidth: 26 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.text(
        `SiMantri Academic System - Leger Riwayat Historis | File: ${record.sourceFileName} | Halaman ${data.pageNumber}`,
        MARGIN_LEFT_MM,
        F4_PAPER_WIDTH_MM - 8
      );
    },
  });

  const blobUrl = String(doc.output('bloburl'));
  return { doc, blobUrl };
}
