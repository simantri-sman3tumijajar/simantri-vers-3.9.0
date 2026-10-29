import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Assessment, SchoolInfo, Student, BeritaAcaraItem, Submission, SupervisiCatatan, CalendarEvent, ExamSchedule } from '../types';
import { calculateItemAnalysis } from './itemAnalysis';
import { sanitizeCapaianKompetensi, generateBloomDeepLearningCK } from './capaianKompetensi';
import { formatAcademicTitles, getKKTPKategori } from './kktpHelper';
import { getCorrectionDateFormatted, formatIndonesianDate } from './dateUtils';
import { getAssessmentClassesList, cleanCanonicalClass, getSemesterNumber } from './classHelper';
import { generateAuthenticVerificationCode, getAuthenticStatus, buildVerificationURL, formatGuruNip } from './authenticProofHelper';
import { formatClassToDSMartGroup } from './dsmartHelper';
import { getStudentCbtCredentials } from './cbtCredentialHelper';
import { processSignatureImage, getOfficialPrincipalData, DEFAULT_OFFICIAL_SIGNATURE_ASSET } from './signatureImageHelper';

// Paper Size Constants: Standar F4 / Folio Indonesia (21.59 cm x 33.02 cm / 8.5 x 13 in)
export const F4_PAPER_WIDTH_MM = 215.9;
export const F4_PAPER_HEIGHT_MM = 330.2;
export const MARGIN_LEFT_MM = 18.0; // Narrower left margin for Kop Surat & 1 page fit
export const MARGIN_RIGHT_MM = 15.0; // Narrower right margin
export const MARGIN_TOP_MM = 12.0; // Narrower top margin
export const MARGIN_BOTTOM_MM = 15.0; // Narrower bottom margin
export const PRINT_WIDTH_MM = F4_PAPER_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // 182.9 mm
export const RIGHT_EDGE_MM = F4_PAPER_WIDTH_MM - MARGIN_RIGHT_MM; // 200.9 mm
export const CENTER_X_MM = F4_PAPER_WIDTH_MM / 2; // 107.95 mm

// Helper to convert image URL to base64 for jsPDF
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = imageUrl;
  });
}

export function cleanPdfText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*([^\*\s][^\*]*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/==(.*?)==/g, '$1');
}

// 1. Draw Official SMAN 3 Tumijajar Header (KOP SURAT STANDAR KEDINASAN F4 - Dinamis Portrait & Landscape)
export async function drawOfficialKop(
  doc: jsPDF,
  schoolInfo: SchoolInfo,
  startY: number = MARGIN_TOP_MM,
  options?: {
    pageWidth?: number;
    marginLeft?: number;
    marginRight?: number;
    fontFamily?: string;
  }
): Promise<number> {
  const fontFam = options?.fontFamily || 'times';

  // Set font
  doc.setFont(fontFam, 'normal');

  // Detect dynamic page dimensions (Landscape vs Portrait)
  const pageWidth = options?.pageWidth || doc.internal.pageSize.getWidth();
  const isLandscape = pageWidth > 250;
  const marginLeft = options?.marginLeft ?? (isLandscape ? 18.0 : MARGIN_LEFT_MM);
  const marginRight = options?.marginRight ?? (isLandscape ? 18.0 : MARGIN_RIGHT_MM);
  const rightEdge = pageWidth - marginRight;
  const centerX = pageWidth / 2;
  const printWidth = pageWidth - marginLeft - marginRight;

  // Load logos
  const logoProvBase64 = await getBase64ImageFromUrl(schoolInfo.logoProvinsiUrl);
  const logoSekolahBase64 = await getBase64ImageFromUrl(schoolInfo.logoSekolahUrl);

  const logoScale = (schoolInfo.logoSekolahScale || 100) / 100;
  const logoSize = Math.min(23 * logoScale, 26);

  // Left Logo (Provinsi Lampung)
  if (logoProvBase64) {
    try {
      doc.addImage(logoProvBase64, 'PNG', marginLeft, startY, 22, 23);
    } catch (e) {
      console.warn('Failed to embed left logo', e);
    }
  }

  // Right Logo (SMAN 3 Tumijajar)
  if (logoSekolahBase64) {
    try {
      doc.addImage(
        logoSekolahBase64,
        'PNG',
        rightEdge - logoSize,
        startY,
        logoSize,
        logoSize
      );
    } catch (e) {
      console.warn('Failed to embed right logo', e);
    }
  }

  // Maximum text width centered between logos
  const textMaxWidth = printWidth - (Math.max(logoSize, 23) * 2 + 6);

  // Centered Header Text with Exact Official Typography Specifications
  let curY = startY + 5;

  // 1. PEMERINTAH PROVINSI LAMPUNG (13pt, Bold, Kapital)
  doc.setFont(fontFam, 'bold');
  doc.setFontSize(13);
  const textProv = schoolInfo.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG';
  doc.text(textProv, centerX, curY, { align: 'center', maxWidth: textMaxWidth });
  curY += 5.5;

  // 2. SMA NEGERI 3 TUMIJAJAR (16pt, Bold, Kapital)
  doc.setFontSize(16);
  const textSekolah = schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR';
  doc.text(textSekolah, centerX, curY, { align: 'center', maxWidth: textMaxWidth });
  curY += 5.2;

  // 3. NPSN - NSS - AKREDITASI (9.5pt, Regular, Kapital)
  doc.setFont(fontFam, 'normal');
  doc.setFontSize(9.5);
  const textMeta = `NPSN : ${schoolInfo.npsn || '69955116'} - NSS: ${schoolInfo.nss || '30.1.1812.02.021'} - AKREDITASI ”${schoolInfo.akreditasi || 'B'}”`;
  doc.text(textMeta, centerX, curY, { align: 'center', maxWidth: textMaxWidth });
  curY += 4.5;

  // 4. Alamat (8.5pt, Regular)
  doc.setFontSize(8.5);
  const textAlamat = schoolInfo.alamat || 'Alamat : Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794';
  doc.text(textAlamat, centerX, curY, { align: 'center', maxWidth: textMaxWidth });
  curY += 4.0;

  // 5. E-mail & Website (8.5pt, Regular)
  doc.setFontSize(8.5);
  const textWeb = `E-mail : ${schoolInfo.email || 'smantitumijajar@gmail.com'} – Website : ${schoolInfo.website || 'https://sman3tumijajar.sch.id'}`;
  doc.text(textWeb, centerX, curY, { align: 'center', maxWidth: textMaxWidth });
  curY += 3.5;

  // Double Horizontal Line (Garis Pembatas Kop: Garis tebal di atas, garis tipis di bawah)
  const lineY = curY + 1.8;
  doc.setLineWidth(1.2);
  doc.line(marginLeft, lineY, rightEdge, lineY);

  doc.setLineWidth(0.35);
  doc.line(marginLeft, lineY + 1.2, rightEdge, lineY + 1.2);

  // Return Y coordinate with generous padding below the Kop lines for body text
  return lineY + 7.5;
}

// 2. Export ASTS Lembar Soal & Lembar Jawaban (Essay) Standar Cetak Kertas F4
export async function exportASTSSoalPDF(assessment: Assessment, schoolInfo: SchoolInfo, returnBlob: boolean = false): Promise<Uint8Array | undefined> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM], // Standar F4 Folio
  });

  const afterKopY = await drawOfficialKop(doc, schoolInfo);

  // Assessment Title (12pt, Bold, Center, Kapital)
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('LEMBAR SOAL DAN LEMBAR JAWABAN', CENTER_X_MM, afterKopY + 2, {
    align: 'center',
    maxWidth: PRINT_WIDTH_MM,
  });

  const rawTitle =
    assessment.judul ||
    `ASESMEN SUMATIF TENGAH SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()} T.P ${assessment.tahunAjaran}`;
  const cleanSubTitle =
    rawTitle.replace(/^(LEMBAR\s+SOAL\s+DAN\s+LEMBAR\s+JAWABAN|LEMBAR\s+SOAL)\s*/i, '').trim() ||
    `ASESMEN SUMATIF TENGAH SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()} T.P ${assessment.tahunAjaran}`;

  const splitTitle = doc.splitTextToSize(cleanSubTitle, PRINT_WIDTH_MM);
  doc.text(splitTitle, CENTER_X_MM, afterKopY + 7, { align: 'center' });

  // Blok Identitas Siswa & Ujian (Grid 2 Kolom Sejajar, Font 11pt, Regular)
  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  const metaTop = afterKopY + 7 + splitTitle.length * 4.5 + 4;
  const colLeftX = MARGIN_LEFT_MM;
  const colRightX = MARGIN_LEFT_MM + 92; // Widened column gap
  const maxValWidthLeft = 58;
  const maxValWidthRight = RIGHT_EDGE_MM - (colRightX + 22) - 1;

  // Sisi Kiri (Row Spacing 6.8 mm for clean line separation)
  doc.text(`Mata Pelajaran`, colLeftX, metaTop);
  doc.text(`:`, colLeftX + 28, metaTop);
  doc.setFont('times', 'bold');
  doc.text(doc.splitTextToSize(assessment.mataPelajaran, maxValWidthLeft), colLeftX + 31, metaTop);
  doc.setFont('times', 'normal');

  doc.text(`Hari / Tanggal`, colLeftX, metaTop + 6.8);
  doc.text(`:`, colLeftX + 28, metaTop + 6.8);
  doc.text(doc.splitTextToSize(assessment.hariTanggal || '-', maxValWidthLeft), colLeftX + 31, metaTop + 6.8);

  doc.text(`Pukul`, colLeftX, metaTop + 13.6);
  doc.text(`:`, colLeftX + 28, metaTop + 13.6);
  doc.text(doc.splitTextToSize(assessment.pukul || '07.30 - 09.00 WIB', maxValWidthLeft), colLeftX + 31, metaTop + 13.6);

  doc.text(`Waktu`, colLeftX, metaTop + 20.4);
  doc.text(`:`, colLeftX + 28, metaTop + 20.4);
  doc.text(doc.splitTextToSize(`${assessment.waktuMenit} Menit`, maxValWidthLeft), colLeftX + 31, metaTop + 20.4);

  // Sisi Kanan
  doc.text(`Nama`, colRightX, metaTop);
  doc.text(`:`, colRightX + 18, metaTop);
  doc.text(`.....................................`, colRightX + 21, metaTop, { maxWidth: maxValWidthRight });

  doc.text(`Kelas`, colRightX, metaTop + 6.8);
  doc.text(`:`, colRightX + 18, metaTop + 6.8);
  doc.setFont('times', 'bold');
  doc.text(doc.splitTextToSize(`${assessment.kelas} (${assessment.fase})`, maxValWidthRight), colRightX + 21, metaTop + 6.8);
  doc.setFont('times', 'normal');

  doc.text(`Nomor`, colRightX, metaTop + 13.6);
  doc.text(`:`, colRightX + 18, metaTop + 13.6);
  doc.text(`.....................................`, colRightX + 21, metaTop + 13.6, { maxWidth: maxValWidthRight });

  doc.text(`Nilai`, colRightX, metaTop + 20.4);
  doc.text(`:`, colRightX + 18, metaTop + 20.4);
  doc.text(`.....................................`, colRightX + 21, metaTop + 20.4, { maxWidth: maxValWidthRight });

  // Divider Line Horizontal
  const divY = metaTop + 26.5;
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT_MM, divY, RIGHT_EDGE_MM, divY);

  // Kalimat Pengantar / Petunjuk Umum (11pt, Bold/Italic)
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(11);
  const splitPetunjuk = doc.splitTextToSize(
    assessment.petunjukUmum || 'Jawab dan jelaskan Soal berikut dengan tepat dan jelas!',
    PRINT_WIDTH_MM
  );
  doc.text(splitPetunjuk, MARGIN_LEFT_MM, divY + 6);

  // Questions List (11pt, Regular, Line Spacing 1.15x, Numbered List 1-10)
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  let currentY = divY + 6 + splitPetunjuk.length * 4.5 + 4;

  assessment.essayRubrik.forEach((item) => {
    const qPrefix = `${item.nomor}. `;
    const prefixWidth = doc.getTextWidth(qPrefix);
    const qText = cleanPdfText(item.soal);
    const splitText = doc.splitTextToSize(qText, PRINT_WIDTH_MM - prefixWidth - 1);
    const requiredHeight = splitText.length * 5.2 + 3.5;

    // Check page overflow for F4
    if (currentY + requiredHeight > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM) {
      doc.addPage();
      currentY = MARGIN_TOP_MM;
    }

    doc.text(qPrefix, MARGIN_LEFT_MM, currentY);
    doc.text(splitText, MARGIN_LEFT_MM + prefixWidth, currentY);
    currentY += requiredHeight;
  });

  // Bagian Lembar Jawaban: Teks "Jawab:" (Font 11pt, Bold) + 15 Baris Titik-titik Penuh (1.5x Spacing)
  if (currentY + 25 > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM) {
    doc.addPage();
    currentY = MARGIN_TOP_MM;
  }

  currentY += 4;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Jawab:', MARGIN_LEFT_MM, currentY);
  currentY += 5;

  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([1, 1], 0);

  const totalLines = 15;
  const lineSpacing = 7.5; // 1.5x line spacing untuk kemudahan menulis tangan siswa

  for (let i = 1; i <= totalLines; i++) {
    if (currentY > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM) {
      doc.addPage();
      currentY = MARGIN_TOP_MM + 5;
    }
    doc.line(MARGIN_LEFT_MM, currentY, RIGHT_EDGE_MM, currentY);
    currentY += lineSpacing;
  }

  doc.setLineDashPattern([], 0);

  if (returnBlob) {
    return new Uint8Array(doc.output('arraybuffer'));
  }

  doc.save(
    `LEMBAR_SOAL_ASTS_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}.pdf`
  );
}

// 3. Export ASAS Soal Pilihan Ganda Standar Cetak Kertas F4 (Template Naskah Resmi SMAN 3 Tumijajar - 2 Kolom Times New Roman)
export async function exportASASSoalPDF(assessment: Assessment, schoolInfo: SchoolInfo, returnBlob: boolean = false): Promise<Uint8Array | undefined> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM], // Standar F4 Folio
  });

  const afterKopY = await drawOfficialKop(doc, schoolInfo);

  // 1. Judul Naskah Soal (Times New Roman, Bold, Center, Kapital)
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('NASKAH SOAL', CENTER_X_MM, afterKopY + 2, { align: 'center', maxWidth: PRINT_WIDTH_MM });

  doc.setFontSize(11);
  const semesterStr = assessment.semester.toUpperCase();
  const rawClass = assessment.kelas.toUpperCase();
  const cleanClass = rawClass.startsWith('KELAS') ? rawClass : `KELAS ${rawClass}`;
  const titleLine2 = `ASESMEN SUMATIF AKHIR SEMESTER (ASAS) ${semesterStr} ${cleanClass}`;
  doc.text(titleLine2, CENTER_X_MM, afterKopY + 6.5, { align: 'center', maxWidth: PRINT_WIDTH_MM });

  const titleLine3 = `TAHUN AJARAN ${assessment.tahunAjaran}`;
  doc.text(titleLine3, CENTER_X_MM, afterKopY + 11, { align: 'center', maxWidth: PRINT_WIDTH_MM });

  // 2. Blok Metadata Identitas Ujian (2 Kolom Bersanding)
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);

  const metaTop = afterKopY + 16;
  const colLeftX = MARGIN_LEFT_MM;
  const colRightX = MARGIN_LEFT_MM + 94;
  const maxValWidth = 58;

  // Sisi Kiri
  doc.text('Mata Pelajaran', colLeftX, metaTop);
  doc.text(':', colLeftX + 26, metaTop);
  doc.setFont('times', 'bold');
  doc.text(doc.splitTextToSize(assessment.mataPelajaran, maxValWidth), colLeftX + 28.5, metaTop);
  doc.setFont('times', 'normal');

  doc.text('Kurikulum', colLeftX, metaTop + 5.5);
  doc.text(':', colLeftX + 26, metaTop + 5.5);
  doc.text('Kurikulum Merdeka', colLeftX + 28.5, metaTop + 5.5);

  doc.text('Fase/Kelas', colLeftX, metaTop + 11);
  doc.text(':', colLeftX + 26, metaTop + 11);
  doc.text(`${assessment.fase || 'F'}/${assessment.kelas}`, colLeftX + 28.5, metaTop + 11);

  // Sisi Kanan
  doc.text('Hari / Tanggal', colRightX, metaTop);
  doc.text(':', colRightX + 26, metaTop);
  doc.text(doc.splitTextToSize(assessment.hariTanggal || 'Senin, 02 Maret 2026', maxValWidth), colRightX + 28.5, metaTop);

  doc.text('Waktu', colRightX, metaTop + 5.5);
  doc.text(':', colRightX + 26, metaTop + 5.5);
  doc.text(`${assessment.waktuMenit || 120} Menit`, colRightX + 28.5, metaTop + 5.5);

  // Divider Line Horizontal
  const divMetaY = metaTop + 15.5;
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT_MM, divMetaY, RIGHT_EDGE_MM, divMetaY);

  // 3. Petunjuk Umum
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Petunjuk Umum', MARGIN_LEFT_MM, divMetaY + 4.5);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);

  const puItems = [
    '1. Tuliskan nama dan nomor tes anda pada lembar jawaban yang tersedia',
    '2. Kerjakan soal yang dianggap mudah terlebih dahulu',
    '3. Laporkan pada pengawas jika terdapat tulisan yang kurang jelas, rusak atau jumlah soal kurang',
    '4. Periksalah lembar jawaban sebelum diserahkan kepada pengawas',
  ];
  let curPuY = divMetaY + 8.5;
  puItems.forEach((pu) => {
    doc.text(pu, MARGIN_LEFT_MM, curPuY, { maxWidth: PRINT_WIDTH_MM });
    curPuY += 4.2;
  });

  // Divider Line
  doc.line(MARGIN_LEFT_MM, curPuY + 1, RIGHT_EDGE_MM, curPuY + 1);

  // 4. Petunjuk Khusus
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Petunjuk Khusus', MARGIN_LEFT_MM, curPuY + 5.5);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);

  const pkItems = [
    '1. Pilihlah salah satu jawaban yang paling tepat pada salah satu huruf A, B, C, D atau E di lembar jawaban',
    '2. Untuk membetulkan jawaban, hapuslah jawaban kemudian pilihlah jawaban yang benar.',
  ];
  let curPkY = curPuY + 9.5;
  pkItems.forEach((pk) => {
    doc.text(pk, MARGIN_LEFT_MM, curPkY, { maxWidth: PRINT_WIDTH_MM });
    curPkY += 4.2;
  });

  const afterPetunjukY = curPkY + 1.5;
  doc.line(MARGIN_LEFT_MM, afterPetunjukY, RIGHT_EDGE_MM, afterPetunjukY);

  // 5. Questions Section in 2-Column Newspaper Layout (Persis Template PDF)
  const COL_WIDTH_MM = 87;
  const COL1_X = MARGIN_LEFT_MM; // 15mm
  const DIVIDER_X = MARGIN_LEFT_MM + COL_WIDTH_MM + 4.5; // 106.5mm
  const COL2_X = MARGIN_LEFT_MM + COL_WIDTH_MM + 9; // 111mm
  const BOTTOM_LIMIT_Y = F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM; // 315.2mm

  let currentPageStartQuestionY = afterPetunjukY + 4.5;
  let currentCol: 1 | 2 = 1;
  let currentY = currentPageStartQuestionY;

  // Function to draw vertical column divider on active page
  const drawPageVerticalDivider = (topY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(DIVIDER_X, topY, DIVIDER_X, BOTTOM_LIMIT_Y);
  };

  // Draw vertical line on page 1
  drawPageVerticalDivider(afterPetunjukY);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);

  const questions = assessment.mcqQuestions || [];
  const optionsKeys = ['A', 'B', 'C', 'D', 'E'];

  questions.forEach((q) => {
    const colX = currentCol === 1 ? COL1_X : COL2_X;

    // Estimate question height
    const qPrefix = `${q.nomor}.`;
    const qStemText = cleanPdfText(q.soal);
    const stemLines = doc.splitTextToSize(qStemText, COL_WIDTH_MM - 6.5);
    let totalQHeight = stemLines.length * 4.1 + 1.5;

    const renderedOptions: { key: string; lines: string[] }[] = [];
    optionsKeys.forEach((optKey) => {
      const optVal = (q.pilihan as any)?.[optKey];
      if (optVal !== undefined && optVal !== null && String(optVal).trim().length > 0) {
        const optLines = doc.splitTextToSize(cleanPdfText(String(optVal)), COL_WIDTH_MM - 9.5);
        renderedOptions.push({ key: optKey, lines: optLines });
        totalQHeight += optLines.length * 3.9 + 1.2;
      }
    });

    totalQHeight += 3; // Bottom margin after question

    // Check if question fits in current column
    if (currentY + totalQHeight > BOTTOM_LIMIT_Y) {
      if (currentCol === 1) {
        // Switch to Column 2 on current page
        currentCol = 2;
        currentY = currentPageStartQuestionY;
      } else {
        // Add new page
        doc.addPage();
        currentPageStartQuestionY = MARGIN_TOP_MM + 4;
        drawPageVerticalDivider(MARGIN_TOP_MM + 2);
        currentCol = 1;
        currentY = currentPageStartQuestionY;
      }
    }

    const activeColX = currentCol === 1 ? COL1_X : COL2_X;

    // Render Question Number and Stem
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.text(qPrefix, activeColX, currentY);
    doc.text(stemLines, activeColX + 5.5, currentY);
    currentY += stemLines.length * 4.1 + 1.2;

    // Render Options A, B, C, D, E
    renderedOptions.forEach((opt) => {
      doc.text(`${opt.key}.`, activeColX + 5.5, currentY);
      doc.text(opt.lines, activeColX + 10, currentY);
      currentY += opt.lines.length * 3.9 + 1.2;
    });

    currentY += 2.5; // Spacing before next question
  });

  // 6. Appendix: Kunci Jawaban Resmi di Halaman Terpisah
  doc.addPage();
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('KUNCI JAWABAN RESMI ASAS', CENTER_X_MM, MARGIN_TOP_MM + 5, { align: 'center', maxWidth: PRINT_WIDTH_MM });
  doc.setFontSize(10.5);
  doc.setFont('times', 'normal');
  doc.text(`${assessment.mataPelajaran} — Kelas ${assessment.kelas} (${assessment.fase}) — T.P ${assessment.tahunAjaran}`, CENTER_X_MM, MARGIN_TOP_MM + 11, { align: 'center', maxWidth: PRINT_WIDTH_MM });

  const half = Math.ceil(questions.length / 2);
  const col1 = questions.slice(0, half);
  const col2 = questions.slice(half);

  const tableRows: any[] = [];
  for (let i = 0; i < half; i++) {
    const q1 = col1[i];
    const q2 = col2[i];
    tableRows.push([
      q1 ? q1.nomor : '',
      q1 ? q1.kunci : '',
      q2 ? q2.nomor : '',
      q2 ? q2.kunci : '',
    ]);
  }

  (doc as any).autoTable({
    startY: MARGIN_TOP_MM + 16,
    head: [['No', 'Kunci', 'No', 'Kunci']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      font: 'times',
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10,
    },
    styles: {
      font: 'times',
      fontSize: 9.5,
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 25 },
      3: { cellWidth: 35, fontStyle: 'bold' },
    },
    margin: { left: MARGIN_LEFT_MM + 30, right: MARGIN_RIGHT_MM + 30 },
  });

  if (returnBlob) {
    return new Uint8Array(doc.output('arraybuffer'));
  }

  doc.save(
    `NASKAH_SOAL_ASAS_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}.pdf`
  );
}

// 4. Export Official Nilai Raport STS / SAS PDF Standar F4 (Single/Selected Class Strict Support)
export async function exportRaportToPDF(
  assessment: Assessment,
  schoolInfo: SchoolInfo,
  allStudentsInClass: Student[],
  selectedSubClass?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const rawClasses = getAssessmentClassesList(assessment.kelas);
  
  // Strictly target only the 1 selected class to avoid multi-class leakage
  const targetClass = (selectedSubClass && selectedSubClass !== 'ALL')
    ? selectedSubClass.trim()
    : (allStudentsInClass[0]?.kelas?.trim() || rawClasses[0] || assessment.kelas || 'KELAS');

  const classesList = [targetClass];

  for (let idx = 0; idx < classesList.length; idx++) {
    const clsName = classesList[idx];
    if (idx > 0) {
      doc.addPage();
    }

    const kopEndY = await drawOfficialKop(doc, schoolInfo);

    // Filter students for this subclass/class strictly
    const classStudents = allStudentsInClass.filter(
      (s) => cleanCanonicalClass(s.kelas) === cleanCanonicalClass(clsName) || (clsName && s.kelas && s.kelas.trim().toLowerCase() === clsName.trim().toLowerCase())
    );
    const studentsToPrint = classStudents.length > 0 ? classStudents : allStudentsInClass;

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const semNum = getSemesterNumber(clsName, assessment.semester);
    const raportTitle = `NILAI RAPORT ${assessment.jenis} KELAS ${clsName} SEMESTER ${semNum} T.A ${assessment.tahunAjaran}`;
    const splitRaportTitle = doc.splitTextToSize(raportTitle, PRINT_WIDTH_MM);
    doc.text(splitRaportTitle, CENTER_X_MM, kopEndY + 2, { align: 'center' });

    const subHeaderY = kopEndY + splitRaportTitle.length * 5 + 6;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(`KELAS : ${clsName}`, MARGIN_LEFT_MM, subHeaderY);
    doc.text(`FASE ${assessment.fase.replace(/^Fase\s*/i, '').toUpperCase()}`, RIGHT_EDGE_MM - 25, subHeaderY);
    
    doc.setFont('times', 'normal');
    doc.text(`MAPEL : ${assessment.mataPelajaran}`, MARGIN_LEFT_MM, subHeaderY + 6, { maxWidth: PRINT_WIDTH_MM });

    const tableBody = studentsToPrint.map((std, sIdx) => {
      const sub = assessment.submissions.find(
        (s) => s.studentId === std.id || s.studentName === std.nama || (s.studentName && std.nama && cleanCanonicalClass(s.studentName) === cleanCanonicalClass(std.nama))
      );
      const ck = sub
        ? sanitizeCapaianKompetensi(sub.capaianKompetensi, std.nama, sub.tuntas, assessment.mataPelajaran, sub.nilaiAkhir)
        : generateBloomDeepLearningCK(0, assessment.kktp || 75, assessment.mataPelajaran);

      return [
        sIdx + 1,
        std.nama,
        sub ? sub.nilaiAkhir : 0,
        ck,
      ];
    });

    autoTable(doc, {
      startY: subHeaderY + 12,
      margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
      head: [['NO', 'NAMA', 'NILAI AKHIR', 'CAPAIAN KOMPETENSI']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 10,
        cellPadding: 2.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [230, 230, 230], // Grey header background
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { cellWidth: 52, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        3: { cellWidth: PRINT_WIDTH_MM - 90 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 14;
    let signY = finalY;
    if (finalY > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 35) {
      doc.addPage();
      signY = MARGIN_TOP_MM + 10;
    }

    const rightX = RIGHT_EDGE_MM - 68;

    const correctionDateText = getCorrectionDateFormatted(assessment.submissions);

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(
      `Tumijajar, ${correctionDateText}`,
      rightX,
      signY
    );
    doc.text('Guru Mapel,', rightX, signY + 6);
    doc.setFont('times', 'bold');
    const formattedGuru = formatAcademicTitles(assessment.guruPengampu || 'Guru Mata Pelajaran');
    doc.text(formattedGuru, rightX, signY + 28);
    const textWidth = doc.getTextWidth(formattedGuru);
    doc.line(rightX, signY + 29, rightX + textWidth, signY + 29);
  }

  const safeClass = targetClass.replace(/[\s\/\\]+/g, '_');
  const safeMapel = (assessment.mataPelajaran || 'MAPEL').replace(/[\s\/\\]+/g, '_');
  doc.save(
    `NILAI_RAPORT_${assessment.jenis}_KELAS_${safeClass}_${safeMapel}_TA_${assessment.tahunAjaran.replace(/\//g, '-')}.pdf`
  );
}

// 5. Export Item Analysis PDF Report Standar F4
export async function exportItemAnalysisPDF(
  assessment: Assessment,
  schoolInfo: SchoolInfo
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const startY = await drawOfficialKop(doc, schoolInfo);
  let y = startY;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL ANALISIS BUTIR SOAL (ITEM ANALYSIS)', CENTER_X_MM, y, {
    align: 'center',
    maxWidth: PRINT_WIDTH_MM,
  });
  y += 5.5;
  doc.setFontSize(10.5);
  doc.text('TINGKAT KESUKARAN (p) & DAYA PEMBEDA (d)', CENTER_X_MM, y, {
    align: 'center',
    maxWidth: PRINT_WIDTH_MM,
  });
  y += 8;

  const analysis = calculateItemAnalysis(assessment);

  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const leftX = MARGIN_LEFT_MM;
  const colX2 = MARGIN_LEFT_MM + 86; // 111 mm

  doc.text(`Mata Pelajaran`, leftX, y);
  doc.text(`: ${assessment.mataPelajaran}`, leftX + 26, y, { maxWidth: 58 });
  doc.text(`Tahun Ajaran / Sem`, colX2, y);
  doc.text(`: ${assessment.tahunAjaran} (${assessment.semester})`, colX2 + 30, y, { maxWidth: 54 });
  y += 5;

  doc.text(`Kelas / Fase`, leftX, y);
  doc.text(`: ${assessment.kelas} (${assessment.fase})`, leftX + 26, y, { maxWidth: 58 });
  doc.text(`Guru Pengampu`, colX2, y);
  doc.text(`: ${formatAcademicTitles(assessment.guruPengampu || '')}`, colX2 + 30, y, { maxWidth: 54 });
  y += 5;

  doc.text(`Jenis Asesmen`, leftX, y);
  doc.text(`: ${assessment.jenis} (${assessment.jenis === 'ASTS' ? 'Essay' : 'Pilihan Ganda'})`, leftX + 26, y, { maxWidth: 58 });
  doc.text(`Total LJK Siswa`, colX2, y);
  doc.text(`: ${analysis.totalSubmissions} Lembar Terkoreksi`, colX2 + 30, y, { maxWidth: 54 });
  y += 7.5;

  doc.setFillColor(245, 247, 250);
  doc.rect(leftX, y, PRINT_WIDTH_MM, 15, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(leftX, y, PRINT_WIDTH_MM, 15, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Butir : ${analysis.items.length}`, leftX + 3, y + 5.5);
  doc.text(`Soal Ideal : ${analysis.countIdeal}`, leftX + 44, y + 5.5);
  doc.text(`Perlu Revisi : ${analysis.countRevise}`, leftX + 86, y + 5.5);
  doc.text(`Dibuang : ${analysis.countDiscard}`, leftX + 130, y + 5.5);

  doc.text(`Rerata Kesukaran (p) : ${(analysis.avgDifficulty * 100).toFixed(1)}%`, leftX + 3, y + 11);
  doc.text(`Rerata Daya Pembeda (d) : ${analysis.avgDiscrimination.toFixed(2)}`, leftX + 65, y + 11);
  y += 19;

  const tableBody = analysis.items.map((item) => [
    `Soal #${item.itemNumber}`,
    item.questionType,
    `${(item.difficultyIndex * 100).toFixed(1)}%\n(${item.difficultyCategory})`,
    `${item.discriminationIndex.toFixed(2)}\n(${item.discriminationCategory})`,
    `${(item.upperGroupCorrectPct * 100).toFixed(1)}%`,
    `${(item.lowerGroupCorrectPct * 100).toFixed(1)}%`,
    item.recommendation,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
    head: [['NO. SOAL', 'TIPE', 'KESUKARAN (p)', 'PEMBEDA (d)', 'KEL. ATAS', 'KEL. BAWAH', 'REKOMENDASI ANALISIS']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [20, 20, 20],
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
      halign: 'center',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18 },
      1: { cellWidth: 16 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { fontStyle: 'bold', cellWidth: PRINT_WIDTH_MM - 126 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 30) {
    doc.addPage();
  }
  const signY = finalY > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 30 ? MARGIN_TOP_MM + 10 : finalY;
  const rightX = RIGHT_EDGE_MM - 65;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Tumijajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    rightX,
    signY
  );
  doc.text('Guru Mata Pelajaran,', rightX, signY + 5);
  doc.setFont('times', 'bold');
  const formattedGuru = formatAcademicTitles(assessment.guruPengampu || 'Guru Pengampu');
  doc.text(formattedGuru, rightX, signY + 22);
  const textWidth = doc.getTextWidth(formattedGuru);
  doc.line(rightX, signY + 23, rightX + textWidth, signY + 23);

  doc.save(
    `ANALISIS_BUTIR_SOAL_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`
  );
}

// 5. Export Berita Acara Pelaksanaan Asesmen (ASTS & ASAS) PDF Format Resmi Dinas dengan Font Arial
export async function exportBeritaAcaraPDF(
  item: BeritaAcaraItem,
  schoolInfo: SchoolInfo
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const kopEndY = await drawOfficialKop(doc, schoolInfo, MARGIN_TOP_MM, { fontFamily: 'arial' });

  doc.setFont('arial', 'bold');
  doc.setFontSize(12);
  const titleText = `BERITA ACARA PELAKSANAAN ${item.assessmentType === 'ASTS' ? 'ASESMEN SUMATIF TENGAH SEMESTER (ASTS)' : 'ASESMEN SUMATIF AKHIR SEMESTER (ASAS)'}`;
  doc.text(titleText, CENTER_X_MM, kopEndY + 6, { align: 'center' });
  const textWidth = doc.getTextWidth(titleText);
  doc.line(CENTER_X_MM - textWidth / 2, kopEndY + 7, CENTER_X_MM + textWidth / 2, kopEndY + 7);

  doc.setFont('arial', 'normal');
  doc.setFontSize(10);
  doc.text(`TAHUN PELAJARAN ${schoolInfo.tahunAjaranAktif || '2026/2027'}`, CENTER_X_MM, kopEndY + 12, { align: 'center' });

  let y = kopEndY + 20;

  doc.setFont('arial', 'normal');
  doc.setFontSize(10.5);
  doc.text(
    `Pada hari ini ${item.hariTanggal || '...'}, telah diselenggarakan ${item.assessmentType === 'ASTS' ? 'Asesmen Sumatif Tengah Semester (ASTS)' : 'Asesmen Sumatif Akhir Semester (ASAS)'} untuk mata pelajaran:`,
    MARGIN_LEFT_MM,
    y,
    { maxWidth: PRINT_WIDTH_MM }
  );

  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
    body: [
      ['1. Satuan Pendidikan', ':', item.namaSekolah || schoolInfo.namaSekolah],
      ['2. Mata Pelajaran', ':', item.mataPelajaran || '-'],
      ['3. Kelas / Ruang / Rombel', ':', item.kelasRuang || '-'],
      ['4. Waktu Pelaksanaan', ':', item.waktuPelaksanaan || '-'],
      ['5. Pengawas 1 / Penanggung Jawab', ':', item.pengawas1 + (item.nipPengawas1 ? ` (NIP. ${item.nipPengawas1})` : '')],
      ['6. Pengawas 2', ':', item.pengawas2 ? item.pengawas2 + (item.nipPengawas2 ? ` (NIP. ${item.nipPengawas2})` : '') : '-'],
    ],
    theme: 'plain',
    styles: { font: 'arial', fontSize: 10, cellPadding: 1.5, textColor: [10, 10, 10] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 6 },
      2: { cellWidth: PRINT_WIDTH_MM - 61 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('arial', 'bold');
  doc.text('I. DATA KEHADIRAN PESERTA ASESMEN', MARGIN_LEFT_MM, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
    head: [['URAIAN KEHADIRAN PESERTA', 'JUMLAH SISWA', 'KETERANGAN']],
    body: [
      ['Jumlah Peserta Seharusnya (Terdaftar)', `${item.jumlahPesertaSeharusnya} Orang`, 'Sesuai DKN / Roster'],
      ['Jumlah Peserta Hadir', `${item.jumlahPesertaHadir} Orang`, 'Mengikuti Asesmen'],
      ['Jumlah Peserta Tidak Hadir', `${item.jumlahPesertaTidakHadir} Orang`, item.jumlahPesertaTidakHadir > 0 ? 'Lihat Rincian Lampiran' : 'Nihil'],
    ],
    theme: 'grid',
    styles: { font: 'arial', fontSize: 9.5, cellPadding: 2, textColor: [20, 20, 20] },
    headStyles: { font: 'arial', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: PRINT_WIDTH_MM - 125, halign: 'center' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if (item.siswaTidakHadirDetail && item.siswaTidakHadirDetail.length > 0) {
    doc.setFont('arial', 'bold');
    doc.text('II. DAFTAR SISWA YANG TIDAK HADIR', MARGIN_LEFT_MM, y);
    y += 4;

    const absentRows = item.siswaTidakHadirDetail.map((s, idx) => [
      String(idx + 1),
      s.nama || '-',
      s.kelas || item.kelasRuang || '-',
      s.alasan || 'Tanpa Keterangan',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
      head: [['NO', 'NAMA SISWA', 'KELAS / ROMBEL', 'ALASAN / KETERANGAN']],
      body: absentRows,
      theme: 'grid',
      styles: { font: 'arial', fontSize: 9, cellPadding: 2, textColor: [20, 20, 20] },
      headStyles: { font: 'arial', fillColor: [220, 230, 242], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 80, fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: PRINT_WIDTH_MM - 132, halign: 'center' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  doc.setFont('arial', 'bold');
  doc.text('III. CATATAN / KEJADIAN KHUSUS SELAMA PELAKSANAAN UJIAN', MARGIN_LEFT_MM, y);
  y += 4;

  const catatanText = item.catatanKejadianKhusus || 'Ujian/Asesmen berlangsung dengan tertib, aman, dan lancar tanpa kendala berarti.';
  doc.setFont('arial', 'italic');
  doc.setFontSize(9.5);
  const splitCatatan = doc.splitTextToSize(catatanText, PRINT_WIDTH_MM - 6);
  doc.rect(MARGIN_LEFT_MM, y, PRINT_WIDTH_MM, Math.max(12, splitCatatan.length * 5 + 4));
  doc.text(splitCatatan, MARGIN_LEFT_MM + 3, y + 5);

  y += Math.max(12, splitCatatan.length * 5 + 4) + 6;

  // IV. DAFTAR PRESENSI PESERTA & HASIL DETEKSI TANDA TANGAN (JIKA ADA DATA RINCI)
  if (item.daftarSiswaDetail && item.daftarSiswaDetail.length > 0) {
    if (y > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 60) {
      doc.addPage();
      y = MARGIN_TOP_MM + 10;
    }

    doc.setFont('arial', 'bold');
    doc.setFontSize(10.5);
    doc.text('IV. DAFTAR PRESENSI PESERTA & HASIL DETEKSI TANDA TANGAN', MARGIN_LEFT_MM, y);
    y += 4;

    const studentRows = item.daftarSiswaDetail.map((s, idx) => [
      String(s.no || idx + 1),
      s.nama || '-',
      s.nomorPeserta || s.nisn || '-',
      s.hasSignature ? 'HADIR (Ada Tanda Tangan)' : 'TIDAK HADIR (Kosong)',
      s.keterangan || (s.hasSignature ? 'Hadir' : 'Tanpa Keterangan'),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
      head: [['NO', 'NAMA SISWA', 'NO. PESERTA', 'STATUS DETEKSI TANDA TANGAN', 'KETERANGAN']],
      body: studentRows,
      theme: 'grid',
      styles: { font: 'arial', fontSize: 8.5, cellPadding: 1.8, textColor: [20, 20, 20] },
      headStyles: { font: 'arial', fillColor: [230, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 48, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: PRINT_WIDTH_MM - 151, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw && String(data.cell.raw).includes('HADIR (Ada')) {
            data.cell.styles.textColor = [16, 124, 65]; // Emerald
          } else if (data.cell.raw && String(data.cell.raw).includes('TIDAK HADIR')) {
            data.cell.styles.textColor = [200, 30, 30]; // Red
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (y > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 45) {
    doc.addPage();
    y = MARGIN_TOP_MM + 10;
  }

  doc.setFont('arial', 'normal');
  doc.setFontSize(10);
  const tglStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Tumijajar, ${tglStr}`, RIGHT_EDGE_MM - 75, y);
  y += 5;

  const hasPengawas2 = Boolean(item.pengawas2 && item.pengawas2.trim());

  if (hasPengawas2) {
    const leftX = MARGIN_LEFT_MM + 10;
    const rightX = RIGHT_EDGE_MM - 65;

    doc.text('Pengawas 1 / Penanggung Jawab,', leftX, y);
    doc.text('Pengawas 2,', rightX, y);

    y += 20;

    doc.setFont('arial', 'bold');
    const name1 = formatAcademicTitles(item.pengawas1 || 'Pengawas 1');
    doc.text(name1, leftX, y);
    const width1 = doc.getTextWidth(name1);
    doc.line(leftX, y + 1, leftX + width1, y + 1);

    const name2 = formatAcademicTitles(item.pengawas2!);
    doc.text(name2, rightX, y);
    const width2 = doc.getTextWidth(name2);
    doc.line(rightX, y + 1, rightX + width2, y + 1);

    doc.setFont('arial', 'normal');
    doc.setFontSize(9);
    if (item.nipPengawas1) {
      doc.text(`NIP. ${item.nipPengawas1}`, leftX, y + 5);
    }
    if (item.nipPengawas2) {
      doc.text(`NIP. ${item.nipPengawas2}`, rightX, y + 5);
    }
  } else {
    // Only 1 supervisor
    const singleX = RIGHT_EDGE_MM - 75;

    doc.text('Pengawas Ujian / Penanggung Jawab,', singleX, y);

    y += 20;

    doc.setFont('arial', 'bold');
    const name1 = formatAcademicTitles(item.pengawas1 || 'Pengawas Ujian');
    doc.text(name1, singleX, y);
    const width1 = doc.getTextWidth(name1);
    doc.line(singleX, y + 1, singleX + width1, y + 1);

    if (item.nipPengawas1) {
      doc.setFont('arial', 'normal');
      doc.setFontSize(9);
      doc.text(`NIP. ${item.nipPengawas1}`, singleX, y + 5);
    }
  }

  doc.save(`BERITA_ACARA_${item.assessmentType}_${(item.mataPelajaran || 'MAPEL').replace(/\s+/g, '_')}_${(item.kelasRuang || 'KELAS').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// 6. Export Authentic Proof (Cetak Bukti Otentik) PDF Report
export async function exportAuthenticProofPDF(
  submission: Submission,
  assessment: Assessment,
  student?: Student,
  schoolInfo?: SchoolInfo
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });

  const school = schoolInfo || ({
    namaSekolah: 'SMA NEGERI 3 TUMIJAJAR',
    npsn: '69955116',
    nss: '30.1.1812.02.021',
    akreditasi: 'B',
    alamat: 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794',
    email: 'smantitumijajar@gmail.com',
    website: 'https://sman3tumijajar.sch.id',
    logoProvinsiUrl: 'https://iili.io/nl0FZGe.png',
    logoSekolahUrl: 'https://iili.io/nl02Et1.png',
  } as SchoolInfo);

  const startY = await drawOfficialKop(doc, school);
  let y = startY;

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

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('BUKTI OTENTIK PENILAIAN HASIL ASESMEN & DRAF KOREKSI', CENTER_X_MM, y, {
    align: 'center',
    maxWidth: PRINT_WIDTH_MM,
  });
  y += 5;

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Nomor Registrasi Verifikasi: ${authCode} (${authStatus.isDraft ? 'DRAF TERSIMPAN' : 'TERVERIFIKASI RESMI'})`, CENTER_X_MM, y, {
    align: 'center',
  });
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
    body: [
      [
        'Nama Peserta Didik',
        `: ${studentName}`,
        'Mata Pelajaran',
        `: ${assessment.mataPelajaran}`,
      ],
      [
        'NISN / No. Induk',
        `: ${studentNisn}`,
        'Guru Pengampu',
        `: ${formatAcademicTitles(guruName)}`,
      ],
      [
        'Kelas / Fase',
        `: ${studentClass} (${assessment.fase})`,
        'Waktu Koreksi',
        `: ${submission.waktuKoreksi || 'Tercatat di Sistem'} WIB`,
      ],
      [
        'No. Absen / Urut',
        `: ${submission.noUrut || student?.noUrut || '-'}`,
        'KKTP Minimal',
        `: ${assessment.kktp || 75} Poin`,
      ],
    ],
    theme: 'plain',
    styles: { font: 'times', fontSize: 9.5, cellPadding: 1.5, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: PRINT_WIDTH_MM - 122 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
    head: [['NILAI AKHIR RAPOR', 'NILAI MURNI SISWA', 'KETUNTASAN KKTP', 'DETEKSI INTEGRITAS AI']],
    body: [
      [
        `${submission.nilaiAkhir} / 100`,
        `${submission.nilaiMurni ?? submission.nilaiAkhir}`,
        `${kktpInfo.subLabel} (${kktpInfo.remedialInfo})`,
        submission.aiDetected ? `AI (${submission.aiPenaltyPercent || 0}% Penalti)` : '100% Tulisan Tangan (Orisinal)',
      ],
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 9, cellPadding: 2.5, halign: 'center', textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('PERNYATAAN KEABSAHAN & VALIDASI JAWABAN SISWA:', MARGIN_LEFT_MM, y);
  y += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const validityNotice = 'Jawaban siswa dinyatakan sah setelah dilakukan pengecekan dan verifikasi secara mendalam meliputi struktur huruf, kata, kalimat, serta penyesuaian yang presisi dengan kunci jawaban dan rubrik penilaian yang berlaku.';
  const splitNotice = doc.splitTextToSize(validityNotice, PRINT_WIDTH_MM);
  doc.text(splitNotice, MARGIN_LEFT_MM, y);
  y += splitNotice.length * 4 + 4;

  if (Array.isArray(submission.itemScores) && submission.itemScores.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('RINCIAN PENILAIAN BUTIR PER BUTIR SOAL:', MARGIN_LEFT_MM, y);
    y += 4.5;

    const rubricRows = submission.itemScores.map((itm, idx) => {
      const rubricItem = assessment.essayRubrik?.find((r) => r.nomor === itm.nomor);
      const maxScore = rubricItem ? rubricItem.skorMaks : 10;
      return [
        String(itm.nomor || idx + 1),
        itm.jawabanSiswa || '(Kosong)',
        itm.feedback || 'Sesuai rubrik penilaian.',
        `${itm.skor} / ${maxScore}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LEFT_MM, right: MARGIN_RIGHT_MM },
      head: [['NO', 'JAWABAN / TRANSKRIPSI SISWA', 'RUBRIK & ULASAN PEDAGOGIS', 'SKOR']],
      body: rubricRows,
      theme: 'grid',
      styles: { font: 'times', fontSize: 8.5, cellPadding: 2, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: PRINT_WIDTH_MM - 93 },
        3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  if (y > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 45) {
    doc.addPage();
    y = MARGIN_TOP_MM + 5;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('DESKRIPSI CAPAIAN KOMPETENSI (RAPOR):', MARGIN_LEFT_MM, y);
  y += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const ckText = submission.capaianKompetensi || 'Telah mengikuti asesmen dan menunjukkan pemahaman materi sesuai kriteria.';
  const splitCK = doc.splitTextToSize(ckText, PRINT_WIDTH_MM);
  doc.text(splitCK, MARGIN_LEFT_MM, y);
  y += splitCK.length * 4 + 6;

  // Generate QR Code matching the authentic payload
  const qrPayload = buildVerificationURL(submission, assessment, student, school);

  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 });
  } catch (err) {
    console.error('Failed to generate QR code for PDF:', err);
  }

  if (y > F4_PAPER_HEIGHT_MM - MARGIN_BOTTOM_MM - 45) {
    doc.addPage();
    y = MARGIN_TOP_MM + 8;
  }

  // Divider line before signature & QR verification
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(MARGIN_LEFT_MM, y, RIGHT_EDGE_MM, y);
  y += 4;

  // Left Column: QR Code Seal (width 22mm) + Text Info (width 50mm)
  const qrX = MARGIN_LEFT_MM;
  const qrSize = 22;
  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(qrX, y, qrSize, qrSize);
    } catch (e) {
      console.warn('Could not add QR image to doc:', e);
    }
  }

  const qrTextX = qrX + qrSize + 3;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('Verifikasi Sah SiMantri', qrTextX, y + 3.5);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  const verifyDesc = 'Bukti otentik penilaian berbasis kecerdasan buatan & validasi guru resmi. Pindai kode QR dengan kamera ponsel untuk memeriksa data asli apa adanya.';
  const splitVerifyDesc = doc.splitTextToSize(verifyDesc, 48);
  doc.text(splitVerifyDesc, qrTextX, y + 7.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(7);
  doc.text(`ID: ${authCode}`, qrTextX, y + 20.5);

  // Middle/Right Columns: Signatures of Kepala Sekolah & Guru Mata Pelajaran
  const tglStr = formatIndonesianDate(submission.waktuKoreksi);
  const kepsekColX = MARGIN_LEFT_MM + 86;
  const guruColX = RIGHT_EDGE_MM - 46;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Mengetahui,', kepsekColX, y + 3);
  doc.text(`Tumijajar, ${tglStr}`, guruColX, y + 3);
  y += 4;

  doc.setFont('times', 'bold');
  doc.text('Kepala Sekolah,', kepsekColX, y + 3);
  doc.text('Guru Mata Pelajaran,', guruColX, y + 3);

  y += 16;

  const kepsekName = formatAcademicTitles(school?.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.');
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(kepsekName, kepsekColX, y);
  const widthKepsek = doc.getTextWidth(kepsekName);
  doc.line(kepsekColX, y + 0.8, kepsekColX + widthKepsek, y + 0.8);

  const guruFormatted = formatAcademicTitles(guruName);
  doc.text(guruFormatted, guruColX, y);
  const widthGuru = doc.getTextWidth(guruFormatted);
  doc.line(guruColX, y + 0.8, guruColX + widthGuru, y + 0.8);

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${school?.nipKepalaSekolah || '19720512 199802 1 002'}`, kepsekColX, y + 4.5);
  doc.text(`NIP. ${formatGuruNip(assessment.guruId)}`, guruColX, y + 4.5);

  const cleanStd = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMapel = assessment.mataPelajaran.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanClass = (student?.kelas || assessment.kelas || 'KELAS').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`BUKTI_OTENTIK_KELAS_${cleanClass}_${cleanStd}_${cleanMapel}.pdf`);
}

// 7. Export Official Laporan Hasil Supervisi Akademik & Evaluasi Penilaian Kepala Sekolah (F4 Standar)
export async function exportSupervisionReportPDF(
  school: SchoolInfo,
  stats: {
    totalAssessments: number;
    passRate: number;
    attendancePercentage: number;
    totalBeritaAcara: number;
    verifiedBA: number;
    pendingBA: number;
    totalTeachers: number;
  },
  beritaAcaraList: BeritaAcaraItem[],
  teacherMatrix: Array<{
    nama: string;
    nip?: string;
    mapel: string;
    totalSoal: number;
    totalKoreksi: number;
    avgScore: number;
    passRate: number;
  }>,
  catatanList: SupervisiCatatan[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM],
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;

  // 1. Draw Official Kop Surat
  let y = await drawOfficialKop(doc, school);
  y += 4;

  // 2. Document Title
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL SUPERVISI AKADEMIK & EVALUASI PENILAIAN', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10.5);
  doc.text(
    `ASESMEN SUMATIF TENGAH & AKHIR SEMESTER (ASTS & ASAS) T.P. ${school?.tahunAjaranAktif || '2025/2026'}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Semester ${school?.semesterAktif || 'Ganjil'} • Dokumen Evaluasi Resmi Pengawasan Kepala Sekolah`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 7;

  // 3. Executive KPI Summary Box
  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    head: [['RINGKASAN EKSEKUTIF PENGAWASAN AKADEMIK KEPALA SEKOLAH', 'HASIL & STATUS']],
    body: [
      ['Total Paket Soal Asesmen (ASTS / ASAS)', `${stats.totalAssessments} Paket Ujian Terdaftar`],
      ['Tingkat Ketuntasan Belajar Sekolah (>= KKTP)', `${stats.passRate}% Siswa Memenuhi Kriteria Ketuntasan`],
      ['Persentase Kehadiran Peserta Ujian', `${stats.attendancePercentage}% (Presensi Berita Acara Ujian)`],
      ['Verifikasi Berita Acara Pelaksanaan Ujian', `${stats.verifiedBA} Disetujui / ${stats.totalBeritaAcara} Total (${stats.pendingBA} Belum Verifikasi)`],
      ['Total Guru Pengampu / Pembuat Asesmen', `${stats.totalTeachers} Guru Terdaftar`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: 'times',
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { cellWidth: 'auto' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 4. Tabel Matriks Supervisi Guru
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('I. MATRIKS SUPERVISI KINERJA GURU & HASIL PENILAIAN SISWA', marginLeft, y);
  y += 3;

  const teacherRows = teacherMatrix.map((t, idx) => [
    (idx + 1).toString(),
    formatAcademicTitles(t.nama),
    t.nip || '-',
    t.mapel || 'Semua Mapel',
    t.totalSoal.toString(),
    t.totalKoreksi.toString(),
    t.avgScore > 0 ? t.avgScore.toString() : '-',
    t.totalKoreksi > 0 ? `${t.passRate}%` : 'Belum Ujian',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    head: [['No', 'Nama Guru Pengampu', 'NIP', 'Mata Pelajaran', 'Paket Soal', 'Koreksi', 'Rerata', '% Tuntas']],
    body: teacherRows.length > 0 ? teacherRows : [['-', 'Belum ada data guru', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      font: 'times',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 46 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 38 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 17 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Check if we need page break for Berita Acara
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  // 5. Tabel Audit Berita Acara Ujian
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('II. AUDIT BERITA ACARA PELAKSANAAN UJIAN (ASTS / ASAS)', marginLeft, y);
  y += 3;

  const baRows = beritaAcaraList.slice(0, 25).map((b, idx) => {
    const isVerif = b.verifiedByKepsek || b.verifiedStatus === 'Verified';
    return [
      (idx + 1).toString(),
      b.assessmentType || 'ASTS',
      b.mataPelajaran || '-',
      b.kelasRuang || '-',
      b.hariTanggal || '-',
      b.pengawas1 || '-',
      `${b.jumlahPesertaHadir || 0}/${b.jumlahPesertaSeharusnya || 0}`,
      isVerif ? 'Disetujui' : 'Menunggu',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    head: [['No', 'Jenis', 'Mata Pelajaran', 'Kelas/Ruang', 'Hari/Tanggal', 'Pengawas 1', 'Hadir', 'Status Kepsek']],
    body: baRows.length > 0 ? baRows : [['-', '-', 'Belum ada Berita Acara terdaftar', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      font: 'times',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 14 },
      2: { cellWidth: 42 },
      3: { cellWidth: 25 },
      4: { cellWidth: 32 },
      5: { cellWidth: 32 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', cellWidth: 18 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Check if we need page break for Catatan Supervisi
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  // 6. Catatan Supervisi & Rekomendasi
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('III. CATATAN EVALUASI & REKOMENDASI TINDAK LANJUT KEPALA SEKOLAH', marginLeft, y);
  y += 4;

  if (catatanList && catatanList.length > 0) {
    const latestCatatan = catatanList.slice(0, 3);
    latestCatatan.forEach((c) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.text(`• Tanggal: ${c.tanggal} (T.P. ${c.tahunAjaran} - Semester ${c.semester})`, marginLeft + 3, y);
      y += 3.5;
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.text(`  Catatan Umum: ${c.catatanUmum}`, marginLeft + 3, y, { maxWidth: pageWidth - marginLeft - marginRight - 6 });
      y += 4;
      if (c.rekomendasi) {
        doc.text(`  Rekomendasi: ${c.rekomendasi}`, marginLeft + 3, y, { maxWidth: pageWidth - marginLeft - marginRight - 6 });
        y += 4;
      }
      if (c.pembinaanGuru) {
        doc.text(`  Pembinaan Guru: ${c.pembinaanGuru}`, marginLeft + 3, y, { maxWidth: pageWidth - marginLeft - marginRight - 6 });
        y += 4;
      }
      y += 2;
    });
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.text(
      'Seluruh pelaksanaan asesmen telah disupervisi sesuai standar operasional prosedur kurikulum merdeka SMAN 3 Tumijajar.',
      marginLeft + 3,
      y
    );
    y += 6;
  }

  // 7. Signature Section
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 20;
  } else {
    y += 6;
  }

  const signX = pageWidth - marginRight - 65;
  const tglStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Tumijajar, ${tglStr}`, signX, y);
  y += 4;
  doc.text('Kepala Sekolah,', signX, y);

  y += 18;

  doc.setFont('times', 'bold');
  const kepsekName = formatAcademicTitles(school?.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.');
  doc.text(kepsekName, signX, y);
  const widthKepsek = doc.getTextWidth(kepsekName);
  doc.line(signX, y + 0.8, signX + widthKepsek, y + 0.8);

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${school?.nipKepalaSekolah || '19750812 200212 1 001'}`, signX, y + 4.5);

  const cleanYear = (school?.tahunAjaranAktif || '2025_2026').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`LAPORAN_SUPERVISI_AKADEMIK_KEPALA_SEKOLAH_TP_${cleanYear}.pdf`);
}

// -------------------------------------------------------------
// EXPORT KALENDER PENDIDIKAN STANDAR A4 RESMI (TIMES NEW ROMAN)
// -------------------------------------------------------------
export async function exportAcademicCalendarPDF(
  school: SchoolInfo,
  events: CalendarEvent[],
  options?: {
    semester?: 'Ganjil' | 'Genap' | 'Semua';
    teacherName?: string;
    teacherNip?: string;
    includeTeacherEvents?: boolean;
    activeYear?: string;
  }
): Promise<void> {
  const activeYear = options?.activeYear || school?.tahunAjaranAktif || '2026/2027';
  const semesterFilter = options?.semester || 'Semua';
  const includeTeacherEvents = options?.includeTeacherEvents !== false;

  // Filter events
  let activeEvents = [...events];
  if (!includeTeacherEvents) {
    activeEvents = activeEvents.filter((e) => e.level !== 'guru');
  }

  // Create A4 Landscape document (297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297.0;
  const pageHeight = 210.0;
  const marginLeft = 12.0;
  const marginRight = 12.0;
  const marginTop = 8.0;
  const marginBottom = 8.0;
  const printWidth = pageWidth - marginLeft - marginRight; // 273 mm
  const centerX = pageWidth / 2;

  const semestersToRender: Array<'Ganjil' | 'Genap'> =
    semesterFilter === 'Semua' ? ['Ganjil', 'Genap'] : [semesterFilter];

  const startYear = parseInt(activeYear.split('/')[0]) || 2026;
  const nextYear = startYear + 1;

  const monthDefsGanjil = [
    { name: `JULI ${startYear}`, monthIndex: 6, year: startYear },
    { name: `AGUSTUS ${startYear}`, monthIndex: 7, year: startYear },
    { name: `SEPTEMBER ${startYear}`, monthIndex: 8, year: startYear },
    { name: `OKTOBER ${startYear}`, monthIndex: 9, year: startYear },
    { name: `NOVEMBER ${startYear}`, monthIndex: 10, year: startYear },
    { name: `DESEMBER ${startYear}`, monthIndex: 11, year: startYear },
  ];

  const monthDefsGenap = [
    { name: `JANUARI ${nextYear}`, monthIndex: 0, year: nextYear },
    { name: `FEBRUARI ${nextYear}`, monthIndex: 1, year: nextYear },
    { name: `MARET ${nextYear}`, monthIndex: 2, year: nextYear },
    { name: `APRIL ${nextYear}`, monthIndex: 3, year: nextYear },
    { name: `MEI ${nextYear}`, monthIndex: 4, year: nextYear },
    { name: `JUNI ${nextYear}`, monthIndex: 5, year: nextYear },
  ];

  // Helper date checker
  const isDateInEvent = (dateStr: string, ev: CalendarEvent) => {
    if (!dateStr || !ev.startDate) return false;
    const t = new Date(dateStr).getTime();
    const s = new Date(ev.startDate).getTime();
    const e = ev.endDate ? new Date(ev.endDate).getTime() : s;
    return t >= s && t <= e;
  };

  for (let pageIdx = 0; pageIdx < semestersToRender.length; pageIdx++) {
    const sem = semestersToRender[pageIdx];
    if (pageIdx > 0) {
      doc.addPage('a4', 'landscape');
    }

    // 1. Draw Kop Surat Resmi SMAN 3 Tumijajar (Landscape full-width)
    let curY = await drawOfficialKop(doc, school, marginTop, {
      pageWidth,
      marginLeft,
      marginRight,
    });

    // 2. Title & Document Meta in Times New Roman
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(
      `KALENDER PENDIDIKAN TAHUN PELAJARAN ${activeYear}`,
      centerX,
      curY + 2.0,
      { align: 'center' }
    );
    curY += 5.5;

    doc.setFontSize(9.5);
    doc.text(
      `SEMESTER ${sem.toUpperCase()} - SMA NEGERI 3 TUMIJAJAR`,
      centerX,
      curY,
      { align: 'center' }
    );
    curY += 4.0;

    // Line separator
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.35);
    doc.line(marginLeft, curY, pageWidth - marginRight, curY);
    curY += 3.0;

    // 3. Render 6 Months in 1 Horizontal Row (6 Columns across 273mm)
    const monthDefs = sem === 'Ganjil' ? monthDefsGanjil : monthDefsGenap;
    const colGap = 2.4;
    const monthWidth = (printWidth - colGap * 5) / 6; // ~43.5 mm
    const monthHeight = 35.0; // Compact height to fit table and signatures below in landscape

    const dayHeaders = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];
    const monthHbeList: number[] = [];

    for (let m = 0; m < 6; m++) {
      const mX = marginLeft + m * (monthWidth + colGap);
      const mY = curY;
      const mDef = monthDefs[m];

      // Calculate days
      const firstDay = new Date(mDef.year, mDef.monthIndex, 1).getDay(); // 0 = Sunday
      const totalDays = new Date(mDef.year, mDef.monthIndex + 1, 0).getDate();

      // Count HBE (Hari Belajar Efektif)
      let monthHbe = 0;
      for (let d = 1; d <= totalDays; d++) {
        const padM = String(mDef.monthIndex + 1).padStart(2, '0');
        const padD = String(d).padStart(2, '0');
        const dStr = `${mDef.year}-${padM}-${padD}`;
        const dayOfWeek = new Date(mDef.year, mDef.monthIndex, d).getDay();
        const dEvs = activeEvents.filter((ev) => isDateInEvent(dStr, ev));
        const isLibur = dayOfWeek === 0 || dEvs.some((ev) => ev.category === 'libur_nasional');
        if (!isLibur) monthHbe++;
      }
      monthHbeList.push(monthHbe);

      // Draw Month Card Border & Header
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.2);
      doc.rect(mX, mY, monthWidth, monthHeight, 'FD');

      // Month Card Title Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(mX, mY, monthWidth, 4.8, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(mDef.name, mX + 1.5, mY + 3.4);

      doc.setFont('times', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(`${monthHbe} HBE`, mX + monthWidth - 1.5, mY + 3.4, { align: 'right' });

      // Day column headers
      const dayColW = monthWidth / 7;
      const dayHeaderY = mY + 4.8;

      doc.setFont('times', 'bold');
      doc.setFontSize(5.8);
      for (let dh = 0; dh < 7; dh++) {
        if (dh === 0) {
          doc.setTextColor(220, 38, 38); // Sunday = Red
        } else if (dh === 5) {
          doc.setTextColor(16, 185, 129); // Friday = Emerald
        } else {
          doc.setTextColor(30, 41, 59);
        }
        doc.text(dayHeaders[dh], mX + dh * dayColW + dayColW / 2, dayHeaderY + 3.0, { align: 'center' });
      }

      // Calendar grid numbers
      const cellH = 4.0;
      let curCol = firstDay;
      let curRow = 0;

      for (let day = 1; day <= totalDays; day++) {
        const cX = mX + curCol * dayColW;
        const cY = dayHeaderY + 3.8 + curRow * cellH;

        const padM = String(mDef.monthIndex + 1).padStart(2, '0');
        const padD = String(day).padStart(2, '0');
        const dateStr = `${mDef.year}-${padM}-${padD}`;
        const dayEvs = activeEvents.filter((ev) => isDateInEvent(dateStr, ev));

        // Determine priority category
        const isSunday = curCol === 0;
        const hasLibur = isSunday || dayEvs.some((ev) => ev.category === 'libur_nasional');
        const hasExam = dayEvs.some((ev) => ev.category === 'asesmen_ujian');
        const hasDeadline = dayEvs.some((ev) => ev.category === 'deadline');
        const hasSchoolEv = dayEvs.some((ev) => ev.category === 'kegiatan_sekolah');
        const hasTeacherEv = dayEvs.some((ev) => ev.category === 'pribadi_guru');

        if (hasLibur && !isSunday) {
          // Red background
          doc.setFillColor(254, 226, 226);
          doc.rect(cX + 0.2, cY + 0.1, dayColW - 0.4, cellH - 0.2, 'F');
          doc.setTextColor(220, 38, 38);
          doc.setFont('times', 'bold');
        } else if (hasExam) {
          // Blue background
          doc.setFillColor(219, 234, 254);
          doc.rect(cX + 0.2, cY + 0.1, dayColW - 0.4, cellH - 0.2, 'F');
          doc.setTextColor(29, 78, 216);
          doc.setFont('times', 'bold');
        } else if (hasDeadline) {
          // Orange background
          doc.setFillColor(255, 237, 213);
          doc.rect(cX + 0.2, cY + 0.1, dayColW - 0.4, cellH - 0.2, 'F');
          doc.setTextColor(194, 65, 12);
          doc.setFont('times', 'bold');
        } else if (hasSchoolEv) {
          // Green background
          doc.setFillColor(220, 252, 231);
          doc.rect(cX + 0.2, cY + 0.1, dayColW - 0.4, cellH - 0.2, 'F');
          doc.setTextColor(21, 128, 61);
          doc.setFont('times', 'bold');
        } else if (hasTeacherEv) {
          // Purple background
          doc.setFillColor(243, 232, 255);
          doc.rect(cX + 0.2, cY + 0.1, dayColW - 0.4, cellH - 0.2, 'F');
          doc.setTextColor(126, 34, 206);
          doc.setFont('times', 'bold');
        } else if (isSunday) {
          doc.setTextColor(220, 38, 38);
          doc.setFont('times', 'normal');
        } else {
          doc.setTextColor(30, 41, 59);
          doc.setFont('times', 'normal');
        }

        doc.setFontSize(6.0);
        doc.text(String(day), cX + dayColW / 2, cY + 2.8, { align: 'center' });

        curCol++;
        if (curCol > 6) {
          curCol = 0;
          curRow++;
        }
      }
    }

    curY += monthHeight + 2.5;

    // 4. Color Legend (Keterangan Warna)
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Keterangan Warna:', marginLeft, curY + 2.5);

    const legendItems = [
      { label: 'Libur Nasional & Akhir Semester', bg: [254, 226, 226], text: [220, 38, 38] },
      { label: 'Ujian & Asesmen (ASTS / ASAS / ASAJ)', bg: [219, 234, 254], text: [29, 78, 216] },
      { label: 'Deadline Guru / Batas Nilai', bg: [255, 237, 213], text: [194, 65, 12] },
      { label: 'Kegiatan Resmi / MPLS / Rapor', bg: [220, 252, 231], text: [21, 128, 61] },
      { label: 'Agenda Mandiri Guru', bg: [243, 232, 255], text: [126, 34, 206] },
    ];

    let legX = marginLeft + 28;
    legendItems.forEach((item) => {
      doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
      doc.rect(legX, curY, 3.2, 3.2, 'F');
      doc.setDrawColor(148, 163, 184);
      doc.rect(legX, curY, 3.2, 3.2, 'D');

      doc.setFont('times', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.label, legX + 4.2, curY + 2.5);
      legX += doc.getTextWidth(item.label) + 8;
    });

    curY += 5.0;

    // 5. Table of Key Dates, Exams & Deadlines for this Semester
    const semEvents = activeEvents
      .filter((e) => e.semester === sem || e.semester === 'Semua')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const tableRows = semEvents.map((ev, idx) => {
      let tglStr = ev.startDate;
      if (ev.endDate && ev.endDate !== ev.startDate) {
        tglStr = `${ev.startDate} s.d. ${ev.endDate}`;
      }

      let katStr = 'Kegiatan Sekolah';
      if (ev.category === 'asesmen_ujian') katStr = 'Asesmen & Ujian';
      else if (ev.category === 'deadline') katStr = 'Tenggat Waktu';
      else if (ev.category === 'libur_nasional') katStr = 'Hari Libur';
      else if (ev.category === 'pribadi_guru') katStr = `Agenda Guru (${ev.createdByName || 'Pribadi'})`;

      return [
        String(idx + 1),
        tglStr,
        ev.title,
        katStr,
        ev.description || '-',
      ];
    });

    autoTable(doc, {
      startY: curY,
      margin: { left: marginLeft, right: marginRight },
      head: [['No', 'Tanggal / Waktu', 'Uraian Agenda / Kegiatan Pokok', 'Kategori', 'Keterangan / Sasaran']],
      body: tableRows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 7,
        cellPadding: 1.1,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 36, fontStyle: 'bold' },
        2: { cellWidth: 95 },
        3: { cellWidth: 38 },
        4: { cellWidth: 'auto' },
      },
      didDrawPage: () => {
        // Optional page footer
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || curY + 20;

    // 6. Signatures (Mengetahui Kepala Sekolah & Guru / Waka Kurikulum)
    let signY = finalY + 4;
    if (signY > pageHeight - 32) {
      doc.addPage('a4', 'landscape');
      signY = 20;
    }

    const tglResmi = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const totalSemesterHbe = monthHbeList.reduce((acc, h) => acc + h, 0);

    // Left info block: Rekapitulasi HBE
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`* Total Hari Belajar Efektif (HBE) Semester ${sem}: ${totalSemesterHbe} Hari`, marginLeft, signY + 2);

    const colRightX = pageWidth - marginRight - 75;
    const colLeftX = marginLeft + 10;

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text(`Tumijajar, ${tglResmi}`, colRightX, signY);
    doc.text('Mengetahui,', colLeftX, signY + 3.5);
    doc.text('Guru Mata Pelajaran / Pendidik,', colLeftX, signY + 7);

    doc.text('Kepala SMA Negeri 3 Tumijajar,', colRightX, signY + 3.5);

    signY += 19;

    // Signer Names
    doc.setFont('times', 'bold');
    doc.setFontSize(9);

    const teacherName = options?.teacherName || 'Guru Pengampu Mata Pelajaran';
    doc.text(teacherName, colLeftX, signY);
    const wT = doc.getTextWidth(teacherName);
    doc.line(colLeftX, signY + 0.6, colLeftX + wT, signY + 0.6);

    const kepsekName = formatAcademicTitles(school?.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.');
    doc.text(kepsekName, colRightX, signY);
    const wK = doc.getTextWidth(kepsekName);
    doc.line(colRightX, signY + 0.6, colRightX + wK, signY + 0.6);

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(`NIP. ${options?.teacherNip || '-'}`, colLeftX, signY + 3.8);
    doc.text(`NIP. ${school?.nipKepalaSekolah || '19750812 200212 1 001'}`, colRightX, signY + 3.8);
  }

  const cleanYear = activeYear.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`KALENDER_PENDIDIKAN_A4_LANDSCAPE_SMAN3_TUMIJAJAR_TP_${cleanYear}.pdf`);
}

// Helper to detect student grade level (X, XI, or XII)
export function getStudentGradeLevel(kelas: string): 'X' | 'XI' | 'XII' {
  const k = (kelas || '').toUpperCase().trim();
  if (k.startsWith('XII') || k.includes('XII.') || k.includes('XII-') || k.includes('XII ')) return 'XII';
  if (k.startsWith('XI') || k.includes('XI.') || k.includes('XI-') || k.includes('XI ')) return 'XI';
  return 'X';
}

// Helper to filter/generate dynamic schedule table based on student grade level
export function getSchedulesForStudentGrade(
  allSchedules: ExamSchedule[] | undefined,
  grade: 'X' | 'XI' | 'XII',
  studentClass: string
): Array<{ no: number; hariTanggal: string; waktu: string; mapel: string }> {
  if (Array.isArray(allSchedules) && allSchedules.length > 0) {
    const matched = allSchedules.filter((s) => {
      if (!s) return false;
      if (Array.isArray(s.targetClasses) && s.targetClasses.length > 0) {
        if (s.targetClasses.includes(studentClass) || s.targetClasses.includes('ALL')) return true;
        return s.targetClasses.some((tc) => getStudentGradeLevel(tc) === grade);
      }
      const titleUpper = (s.title || '').toUpperCase();
      if (grade === 'X' && (titleUpper.includes('FASE E') || titleUpper.includes('KELAS X') || titleUpper.includes('X.'))) return true;
      if (grade === 'XI' && (titleUpper.includes('FASE F') || titleUpper.includes('KELAS XI') || titleUpper.includes('XI.'))) return true;
      if (grade === 'XII' && (titleUpper.includes('KELAS XII') || titleUpper.includes('XII.') || titleUpper.includes('XII-'))) return true;
      return true;
    });

    if (matched.length > 0) {
      return matched.slice(0, 5).map((m, idx) => ({
        no: idx + 1,
        hariTanggal: m.date ? formatIndonesianDate(m.date) : 'Senin, 01 Des 2026',
        waktu: `${m.startTime || '07:30'} - ${m.endTime || '09:00'}`,
        mapel: m.subjectName || m.title,
      }));
    }
  }

  // Sensible default formal school schedule for SMAN 3 Tumijajar based on grade level
  if (grade === 'XII') {
    return [
      { no: 1, hariTanggal: 'Senin, 01 Des 2026', waktu: '07:30 - 09:30', mapel: 'Bahasa Indonesia' },
      { no: 2, hariTanggal: 'Senin, 01 Des 2026', waktu: '10:00 - 11:30', mapel: 'Pend. Agama & BP' },
      { no: 3, hariTanggal: 'Selasa, 02 Des 2026', waktu: '07:30 - 09:30', mapel: 'Matematika Tingkat Lanjut' },
      { no: 4, hariTanggal: 'Rabu, 03 Des 2026', waktu: '07:30 - 09:30', mapel: 'Fisika / Geografi' },
      { no: 5, hariTanggal: 'Kamis, 04 Des 2026', waktu: '07:30 - 09:30', mapel: 'Kimia / Sosiologi' },
    ];
  } else if (grade === 'XI') {
    return [
      { no: 1, hariTanggal: 'Senin, 01 Des 2026', waktu: '07:30 - 09:30', mapel: 'Bahasa Indonesia' },
      { no: 2, hariTanggal: 'Senin, 01 Des 2026', waktu: '10:00 - 11:30', mapel: 'Pend. Agama & BP' },
      { no: 3, hariTanggal: 'Selasa, 02 Des 2026', waktu: '07:30 - 09:30', mapel: 'Matematika' },
      { no: 4, hariTanggal: 'Rabu, 03 Des 2026', waktu: '07:30 - 09:30', mapel: 'Biologi / Ekonomi' },
      { no: 5, hariTanggal: 'Kamis, 04 Des 2026', waktu: '07:30 - 09:30', mapel: 'Pendidikan Pancasila' },
    ];
  } else {
    // Grade X (Fase E)
    return [
      { no: 1, hariTanggal: 'Senin, 01 Des 2026', waktu: '07:30 - 09:30', mapel: 'Bahasa Indonesia' },
      { no: 2, hariTanggal: 'Senin, 01 Des 2026', waktu: '10:00 - 11:30', mapel: 'Pend. Agama & BP' },
      { no: 3, hariTanggal: 'Selasa, 02 Des 2026', waktu: '07:30 - 09:30', mapel: 'Matematika' },
      { no: 4, hariTanggal: 'Rabu, 03 Des 2026', waktu: '07:30 - 09:30', mapel: 'IPA Terpadu (Fisika-Kimia-Bio)' },
      { no: 5, hariTanggal: 'Kamis, 04 Des 2026', waktu: '07:30 - 09:30', mapel: 'IPS Terpadu (Sejarah-Geo-Eko)' },
    ];
  }
}

export interface ScheduleDayGroupItem {
  no: number;
  waktu: string;
  mapel: string;
  kelas?: string;
}

export interface ScheduleDayGroup {
  hariTanggal: string;
  items: ScheduleDayGroupItem[];
}

export function groupSchedulesByDay(
  schedules: Array<{ no: number; hariTanggal: string; waktu: string; mapel: string; kelas?: string }>,
  defaultKelas: string = ''
): ScheduleDayGroup[] {
  const groups: Record<string, ScheduleDayGroup> = {};
  const order: string[] = [];

  schedules.forEach((sch) => {
    if (!groups[sch.hariTanggal]) {
      groups[sch.hariTanggal] = {
        hariTanggal: sch.hariTanggal,
        items: [],
      };
      order.push(sch.hariTanggal);
    }
    groups[sch.hariTanggal].items.push({
      no: sch.no,
      waktu: sch.waktu,
      mapel: sch.mapel,
      kelas: sch.kelas || defaultKelas,
    });
  });

  return order.map((key) => groups[key]);
}

// 12. Export Kartu Peserta Ujian (CBT Formal & DSMART) PDF dengan Desain Standar Kedinasan
// 12. Export Kartu Peserta Ujian (CBT Formal & DSMART) PDF dengan Desain Standar Kedinasan A4
export async function exportExamCardsPDF(
  students: Student[],
  schoolInfo: SchoolInfo,
  cardFormat: 'DSMART' | 'REGULAR' | 'ASAJ',
  dsmartMapOrSession: any,
  classFilterOrMap?: any,
  optionsOrClassFilter?: any,
  possibleOptions?: any
): Promise<void> {
  // Resilient argument resolution
  let dsmartMap: Map<string, { participantNumber: string; groupName: string }>;
  let classFilter: string = 'ALL';
  let options: { schedules?: ExamSchedule[]; examTitle?: string; roomName?: string } | undefined;

  if (dsmartMapOrSession instanceof Map) {
    dsmartMap = dsmartMapOrSession;
    classFilter = typeof classFilterOrMap === 'string' ? classFilterOrMap : 'ALL';
    options = optionsOrClassFilter || possibleOptions;
  } else {
    dsmartMap = classFilterOrMap instanceof Map ? classFilterOrMap : new Map();
    classFilter = typeof optionsOrClassFilter === 'string' ? optionsOrClassFilter : 'ALL';
    options = possibleOptions;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // A4: 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  // Standard A4 Layout: 10mm margins, 10mm gap between 2 columns -> cardWidth exactly 90mm
  const marginLeft = 10;
  const marginTop = 10;
  const colGap = 10;
  const rowGap = 8;
  const cols = 2;
  const rows = 2; // 4 cards per page (2 columns x 2 rows)
  const cardWidth = 90; // (210 - 20 - 10) / 2 = 90mm (prevents horizontal overflow on A4)
  const cardHeight = 112; // Compact height hugging content with padding, eliminating giant empty whitespace

  const logoSekolahBase64 = await getBase64ImageFromUrl(schoolInfo.logoSekolahUrl || 'https://iili.io/n1vlf2t.png');
  const logoProvBase64 = await getBase64ImageFromUrl(schoolInfo.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png');
  const rawSignatureUrl = schoolInfo.tandaTanganKepsekUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET;
  const signatureBase64 = await processSignatureImage(rawSignatureUrl);
  const principalData = getOfficialPrincipalData(schoolInfo);

  const defaultQrUrl = '/assets/aistudio/qrcode_418827645_7ba7937bdf054b28b6338ffef90d2af0_6687b52d.png';
  const qrCodeUrl = schoolInfo.qrCodeKartuUrl || defaultQrUrl;
  const qrCodeBase64 = qrCodeUrl.startsWith('data:image/')
    ? qrCodeUrl
    : await getBase64ImageFromUrl(qrCodeUrl);

  if (students.length === 0) return;

  const examTitleUpper = (options?.examTitle || 'PENILAIAN AKHIR SEMESTER').toUpperCase();
  const roomNameDefault = options?.roomName || 'Ruang CBT 01';

  students.forEach((std, index) => {
    if (index > 0 && index % (cols * rows) === 0) {
      doc.addPage();
    }

    const posInPage = index % (cols * rows);
    const colIdx = posInPage % cols;
    const rowIdx = Math.floor(posInPage / cols);

    const x = marginLeft + colIdx * (cardWidth + colGap);
    const y = marginTop + rowIdx * (cardHeight + rowGap);

    const cardInfo = dsmartMap.get(std.id);
    const participantNumber = cardInfo?.participantNumber || `${schoolInfo.npsn || '69955116'}-2026-001`;
    const kelompok = formatClassToDSMartGroup(std.kelas);
    const creds = getStudentCbtCredentials(std);
    const username = std.examUsername && std.examUsername.trim().length === 8 ? std.examUsername.trim() : creds.username;
    const password = std.examPassword && std.examPassword.trim().length >= 4 ? std.examPassword.trim() : creds.password;
    const gradeLevel = getStudentGradeLevel(std.kelas);

    if (cardFormat === 'DSMART') {
      // Outer card border
      doc.setDrawColor(30, 41, 59); // slate-800
      doc.setLineWidth(0.4);
      doc.rect(x, y, cardWidth, cardHeight);

      // Kop Header Box
      const kopH = 20;
      doc.rect(x, y, cardWidth, kopH);

      // Left Logo (Sekolah)
      if (logoSekolahBase64) {
        try {
          doc.addImage(logoSekolahBase64, 'PNG', x + 2, y + 2, 14, 15);
        } catch (e) {}
      }

      // Right Logo (Provinsi)
      if (logoProvBase64) {
        try {
          doc.addImage(logoProvBase64, 'PNG', x + cardWidth - 16, y + 2, 14, 15);
        } catch (e) {}
      }

      // Kop Text - Arial Font
      doc.setFont('arial', 'bold');
      doc.setFontSize(8.5);
      doc.text("KARTU PESERTA", x + cardWidth / 2, y + 5.5, { align: 'center' });

      doc.setFontSize(7.5);
      doc.text("SIMULASI DSMART LAMPUNG", x + cardWidth / 2, y + 10, { align: 'center' });
      doc.text((schoolInfo.namaSekolah || 'SMAN 3 TUMIJAJAR').toUpperCase(), x + cardWidth / 2, y + 14, { align: 'center' });

      // Body Details
      let curY = y + kopH + 4.5;
      const labelX = x + 3.5;
      const colonX = x + 25;
      const valX = x + 27;

      doc.setFont('arial', 'normal');
      doc.setFontSize(7);

      // Row 1: Nomor Peserta
      doc.text("Nomor Peserta", labelX, curY);
      doc.text(":", colonX, curY);
      doc.setFont('arial', 'bold');
      doc.setFontSize(7.5);
      doc.text(participantNumber, valX, curY);

      // Row 2: Kelompok
      curY += 4.2;
      doc.setFont('arial', 'normal');
      doc.setFontSize(7);
      doc.text("Kelompok", labelX, curY);
      doc.text(":", colonX, curY);
      doc.setFont('arial', 'bold');
      doc.text(kelompok, valX, curY);

      // Row 3: Nama Peserta
      curY += 4.2;
      doc.setFont('arial', 'normal');
      doc.text("Nama Peserta", labelX, curY);
      doc.text(":", colonX, curY);
      doc.setFont('arial', 'bold');
      doc.text((std.nama || '').toUpperCase(), valX, curY, { maxWidth: cardWidth - 30 });

      // Row 4: Sekolah
      curY += 4.2;
      doc.setFont('arial', 'normal');
      doc.text("Sekolah", labelX, curY);
      doc.text(":", colonX, curY);
      doc.setFont('arial', 'bold');
      doc.text((schoolInfo.namaSekolah || 'SMAN 3 TUMIJAJAR').toUpperCase(), valX, curY, { maxWidth: cardWidth - 30 });

      // Row 5: Server Tes
      curY += 4.2;
      doc.setFont('arial', 'normal');
      doc.text("Server Tes", labelX, curY);
      doc.text(":", colonX, curY);
      doc.text("Tanya proktor sekolah masing-masing", valX, curY, { maxWidth: cardWidth - 30 });

      // Bottom Table: Kelas | Username | Password
      const tblY = y + cardHeight - 20;
      const colW = cardWidth / 3;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(x, tblY, cardWidth, 5.5, 'F');
      doc.setLineWidth(0.3);
      doc.rect(x, tblY, cardWidth, 5.5);
      doc.line(x + colW, tblY, x + colW, tblY + 5.5);
      doc.line(x + colW * 2, tblY, x + colW * 2, tblY + 5.5);

      doc.setFont('arial', 'bold');
      doc.setFontSize(7);
      doc.text("Kelas", x + colW / 2, tblY + 3.8, { align: 'center' });
      doc.text("Username", x + colW * 1.5, tblY + 3.8, { align: 'center' });
      doc.text("Password", x + colW * 2.5, tblY + 3.8, { align: 'center' });

      // Table Row
      doc.rect(x, tblY + 5.5, cardWidth, 7.5);
      doc.line(x + colW, tblY + 5.5, x + colW, tblY + 13);
      doc.line(x + colW * 2, tblY + 5.5, x + colW * 2, tblY + 13);

      doc.setFont('arial', 'bold');
      doc.setFontSize(7.5);
      doc.text(std.kelas, x + colW / 2, tblY + 10.5, { align: 'center' });
      doc.text(username, x + colW * 1.5, tblY + 10.5, { align: 'center' });
      doc.text(password, x + colW * 2.5, tblY + 10.5, { align: 'center' });

      // Note Footnote
      doc.setFont('arial', 'italic');
      doc.setFontSize(5.5);
      doc.text("Catatan: Kartu ini digunakan untuk login ke aplikasi DSMART.", x + 3, y + cardHeight - 2);

    } else {
      // =======================================================================
      // MODEL FORMAL KARTU PESERTA CBT RESMI (DENGAN JADWAL & TANDA TANGAN KEPSEK)
      // Standard Serif / Times New Roman typography, 1px solid outer border
      // =======================================================================
      
      // 1. Bingkai Luar (Outer Border 1px solid #333)
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.35);
      doc.rect(x, y, cardWidth, cardHeight);

      // 2. Header / Kop Kartu Ujian Dinamis
      const maxTextW = cardWidth - 26; // Jarak antar logo kiri dan kanan
      const cardTitleText = (schoolInfo.judulKartuUjian || `KARTU PESERTA CBT ${examTitleUpper}`).toUpperCase();

      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      const titleLines = doc.splitTextToSize(cardTitleText, maxTextW);

      let curKopY = y + 4;
      titleLines.forEach((tLine: string) => {
        doc.text(tLine, x + cardWidth / 2, curKopY, { align: 'center' });
        curKopY += 3.2;
      });

      doc.setFontSize(8);
      const schoolLines = doc.splitTextToSize((schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR').toUpperCase(), maxTextW);
      schoolLines.forEach((sLine: string) => {
        doc.text(sLine, x + cardWidth / 2, curKopY, { align: 'center' });
        curKopY += 3.4;
      });

      doc.setFontSize(6.5);
      doc.text(`TAHUN PELAJARAN ${schoolInfo.tahunAjaranAktif || '2026/2027'}`.toUpperCase(), x + cardWidth / 2, curKopY, { align: 'center' });
      curKopY += 2;

      const kopH = Math.max(20, curKopY - y);
      doc.setLineWidth(0.35);
      doc.line(x, y + kopH, x + cardWidth, y + kopH);

      // Logo Kiri (Provinsi Lampung)
      if (logoProvBase64) {
        try {
          doc.addImage(logoProvBase64, 'PNG', x + 2.5, y + 2, 10.5, 12.5);
        } catch (e) {}
      }

      // Logo Kanan (Sekolah SMAN 3 Tumijajar)
      if (logoSekolahBase64) {
        try {
          doc.addImage(logoSekolahBase64, 'PNG', x + cardWidth - 13, y + 2, 10.5, 12.5);
        } catch (e) {}
      }

      // 3. Bagian Identitas Peserta & QR Code Resmi
      const bodyStartY = y + kopH + 2;
      const qrW = 16;
      const qrH = 16;
      const qrX = x + 3;
      const qrY = bodyStartY + 0.5;

      // Bingkai Tipis QR Code
      doc.setDrawColor(140, 140, 140);
      doc.setLineWidth(0.25);
      doc.rect(qrX, qrY, qrW, qrH);

      // Render Gambar QR Code
      if (qrCodeBase64) {
        try {
          doc.addImage(qrCodeBase64, 'PNG', qrX + 0.6, qrY + 0.6, qrW - 1.2, qrH - 1.2);
        } catch (e) {}
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(90, 90, 90);
      doc.text("SCAN QR LOGIN", qrX + qrW / 2, qrY + qrH + 2.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Detail Identitas Peserta di Kolom Kanan
      const labelX = x + 22;
      const colonX = x + 40;
      const valX = x + 42;
      let fieldY = bodyStartY + 2.4;
      const lineStep = 3.3;

      doc.setFont('times', 'normal');
      doc.setFontSize(6.5);

      // Row 1: No Peserta
      doc.text("No Peserta", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.setFont('times', 'bold');
      doc.text(participantNumber, valX, fieldY);

      // Row 2: Nama Lengkap
      fieldY += lineStep;
      doc.setFont('times', 'normal');
      doc.text("Nama", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.setFont('times', 'bold');
      doc.text((std.nama || '').toUpperCase(), valX, fieldY, { maxWidth: cardWidth - 44 });

      // Row 3: Kelas
      fieldY += lineStep;
      doc.setFont('times', 'normal');
      doc.text("Kelas", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.setFont('times', 'bold');
      doc.text(std.kelas, valX, fieldY);

      // Row 4: Username (Bold)
      fieldY += lineStep;
      doc.setFont('times', 'normal');
      doc.text("Username", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.setFont('times', 'bold');
      doc.text(username, valX, fieldY);

      // Row 5: Password (Bold)
      fieldY += lineStep;
      doc.setFont('times', 'normal');
      doc.text("Password", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.setFont('times', 'bold');
      doc.text(password, valX, fieldY);

      // Row 6: Ruang Ujian
      fieldY += lineStep;
      doc.setFont('times', 'normal');
      doc.text("Ruang", labelX, fieldY);
      doc.text(":", colonX, fieldY);
      doc.text(roomNameDefault, valX, fieldY);

      // 4. Tabel Jadwal Ujian Dinamis (Sesuai Tingkat Kelas X, XI, atau XII)
      const schedStartY = Math.max(qrY + qrH + 4, fieldY + 3.2);
      const schedWidth = cardWidth - 5;
      const schedX = x + 2.5;

      const gradeSchedules = getSchedulesForStudentGrade(options?.schedules, gradeLevel, std.kelas);

      // Proporsi Lebar Kolom Sesuai Juknis:
      // Hari / Tanggal: 28% | Kelas: 16% | Mata Pelajaran: 34% | Waktu: 22%
      const colDateW = schedWidth * 0.28;
      const colClassW = schedWidth * 0.16;
      const colMapelW = schedWidth * 0.34;
      const colTimeW = schedWidth * 0.22;

      const xDate = schedX;
      const xClass = schedX + colDateW;
      const xMapel = xClass + colClassW;
      const xTime = xMapel + colMapelW;

      // Render Header Tabel Jadwal dengan Garis Pembatas Vertikal Tegas pada setiap sel th
      const thH = 4.0;
      doc.setFillColor(241, 245, 249);
      doc.rect(schedX, schedStartY, schedWidth, thH, 'F');
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.25);
      doc.rect(schedX, schedStartY, schedWidth, thH);

      // Garis Pembatas Vertikal Header Sejajar Lurus
      doc.line(xClass, schedStartY, xClass, schedStartY + thH);
      doc.line(xMapel, schedStartY, xMapel, schedStartY + thH);
      doc.line(xTime, schedStartY, xTime, schedStartY + thH);

      doc.setFont('times', 'bold');
      doc.setFontSize(5.5);
      doc.text("Hari / Tanggal", xDate + colDateW / 2, schedStartY + 2.7, { align: 'center' });
      doc.text("Kelas", xClass + colClassW / 2, schedStartY + 2.7, { align: 'center' });
      doc.text("Mata Pelajaran", xMapel + 2, schedStartY + 2.7, { align: 'left' });
      doc.text("Waktu", xTime + colTimeW / 2, schedStartY + 2.7, { align: 'center' });

      // Render Baris Jadwal dengan Pengelompokan Hari (Rowspan Murni Bebas Garis Tabrak)
      const dayGroups = groupSchedulesByDay(gradeSchedules.slice(0, 5), std.kelas);
      let curRowY = schedStartY + thH;
      const trH = 3.6;

      dayGroups.forEach((group) => {
        const groupH = group.items.length * trH;

        // 1. Kotak Kolom Hari/Tanggal (Utuh 1 sel tanpa garis melintas di tengah tanggal)
        doc.setFillColor(255, 255, 255);
        doc.rect(xDate, curRowY, colDateW, groupH, 'F');
        doc.rect(xDate, curRowY, colDateW, groupH);

        doc.setFont('times', 'normal');
        doc.setFontSize(5.0);
        // Teks tanggal diposisikan tepat di tengah secara vertikal (vertical-align middle)
        doc.text(group.hariTanggal, xDate + colDateW / 2, curRowY + groupH / 2 + 0.8, { align: 'center', maxWidth: colDateW - 2 });

        // 2. Baris-baris Mata Pelajaran dalam Hari Tersebut (Garis horizontal HANYA di kolom Kelas, Mapel & Waktu)
        group.items.forEach((item, itIdx) => {
          const itemY = curRowY + itIdx * trH;

          // Background selang-seling halus
          doc.setFillColor(itIdx % 2 === 0 ? 255 : 252, itIdx % 2 === 0 ? 255 : 252, itIdx % 2 === 0 ? 255 : 252);
          doc.rect(xClass, itemY, colClassW + colMapelW + colTimeW, trH, 'F');
          doc.rect(xClass, itemY, colClassW + colMapelW + colTimeW, trH);

          // Garis pemisah kolom Kelas, Mapel, dan Waktu
          doc.line(xMapel, itemY, xMapel, itemY + trH);
          doc.line(xTime, itemY, xTime, itemY + trH);

          // Teks Kelas
          doc.setFont('times', 'normal');
          doc.setFontSize(5.2);
          doc.text(std.kelas, xClass + colClassW / 2, itemY + 2.6, { align: 'center' });

          // Teks Mata Pelajaran (Rata Kiri dengan margin, Bold)
          doc.setFont('times', 'bold');
          doc.text(item.mapel, xMapel + 1.8, itemY + 2.6, { maxWidth: colMapelW - 3 });

          // Teks Waktu (Rata Tengah)
          doc.setFont('times', 'normal');
          doc.text(item.waktu, xTime + colTimeW / 2, itemY + 2.6, { align: 'center' });
        });

        curRowY += groupH;
      });

      // 5. Bagian Pengesahan / Tanda Tangan Kepala Sekolah (Legal Endorsement Block Sesuai Kaidah Tata Naskah Dinas)
      // Urutan hierarki:
      // Baris 1: Tumijajar, [Tanggal Pelaksanaan/Cetak]
      // Baris 2: Kepala SMA Negeri 3 Tumijajar,
      // Baris 3: Area tanda tangan & stempel ungu (menjorok ke kiri dan menimpa jabatan & nama resmi)
      // Baris 4: Erlita Yuani Putri, M.Pd. (bold, underline)
      // Baris 5: NIP. [Data NIP]
      const sigBlockX = x + cardWidth - 38;
      const sigSectionY = y + cardHeight - 21.5;

      // Baris 1: Tempat & Tanggal
      doc.setFont('times', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`Tumijajar, ${formatIndonesianDate(new Date())}`, sigBlockX, sigSectionY);

      // Baris 2: Jabatan
      doc.setFont('times', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(15, 23, 42);
      doc.text(principalData.jabatan || "Kepala SMA Negeri 3 Tumijajar,", sigBlockX, sigSectionY + 2.8);

      // Baris 3: Gambar Stempel & Tanda Tangan (Overlapping Resmi Naskah Dinas)
      // Stempel ungu di sisi kiri sedikit menjorok ke kiri (-5.5mm) menimpa teks jabatan dan menyentuh sisi kiri nama
      if (signatureBase64) {
        try {
          const imgW = 32; // 32mm width
          const imgH = 18; // 18mm height
          const imgX = sigBlockX - 5.5; // Stempel ungu menjorok ke kiri
          const imgY = sigSectionY + 0.6; // Menimpa sedikit bagian bawah jabatan dan turun ke area nama
          doc.addImage(signatureBase64, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
        } catch (e) {
          // Fallback if image fails to render
        }
      }

      // Baris 4: Nama Kepala Sekolah (Tebal & Garis Bawah / Bold & Underline, z-order di atas gambar)
      const nameY = sigSectionY + 12.0;
      doc.setFont('times', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      const kepsekName = principalData.nama || 'Erlita Yuani Putri, M.Pd.';
      doc.text(kepsekName, sigBlockX, nameY);
      const nameWidth = doc.getTextWidth(kepsekName);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(sigBlockX, nameY + 0.35, sigBlockX + nameWidth, nameY + 0.35);

      // Baris 5: NIP Kepala Sekolah (Rapat tanpa jarak berlebih)
      doc.setFont('times', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(30, 30, 30);
      doc.text(`NIP. ${principalData.nip || '19850202 200804 2 003'}`, sigBlockX, nameY + 2.6);

      // Catatan kecil di kiri bawah
      doc.setFont('times', 'italic');
      doc.setFontSize(4.8);
      doc.setTextColor(100, 100, 100);
      doc.text("* Kartu wajib dibawa selama asesmen berlangsung.", x + 3, y + cardHeight - 4.5);
      doc.text("* Terverifikasi SiMantri SMAN 3 Tumijajar", x + 3, y + cardHeight - 2.2);
      doc.setTextColor(0, 0, 0);
    }
  });

  const safeClass = classFilter.replace(/[\s\/\\]+/g, '_');
  doc.save(`KARTU_PESERTA_${cardFormat}_${safeClass}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 13. Export Daftar Hadir Ujian (DSMART A4 Landscape & CBT A4 Portrait) PDF dengan Font Arial
export async function exportExamAttendancePDF(
  students: Student[],
  schoolInfo: SchoolInfo,
  formatMode: 'DSMART_F4' | 'REGULAR_A4',
  params: {
    selectedClass: string;
    sessionNumber: string;
    examTimeRange: string;
    examDay: string;
    examDate: string;
    examMonth: string;
    examYear: string;
    examLocation: string;
    pengawasName: string;
    pengawasNip: string;
    proktorName: string;
    proktorNip: string;
  },
  dsmartMap: Map<string, { participantNumber: string; groupName: string }>
): Promise<void> {
  const isDSMart = formatMode.startsWith('DSMART');

  // Both formats use standard A4 paper (DSMART = A4 Landscape 297x210mm, CBT = A4 Portrait 210x297mm)
  const doc = new jsPDF({
    orientation: isDSMart ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Explicitly set Arial font
  doc.setFont('arial', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 12;
  const marginRight = 12;
  const marginTop = 10;
  const marginBottom = 12;
  const printWidth = pageWidth - marginLeft - marginRight;
  const centerX = pageWidth / 2;

  const logoSekolahBase64 = await getBase64ImageFromUrl(schoolInfo.logoSekolahUrl || 'https://iili.io/n1vlf2t.png');
  const logoProvBase64 = await getBase64ImageFromUrl(schoolInfo.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png');

  // Calculate grade level and group name
  let gradeLevel = 'X / XI / XII';
  if (params.selectedClass !== 'ALL') {
    gradeLevel = formatClassToDSMartGroup(params.selectedClass);
  }

  const groupName = params.selectedClass === 'ALL'
    ? 'Semua Kelas'
    : formatClassToDSMartGroup(params.selectedClass);

  if (isDSMart) {
    // =========================================================================
    // DSMART A4 LANDSCAPE FORMAT - Arial Font & Precision Auto-Paging
    // =========================================================================
    const tableBody = students.map((std, idx) => {
      const globalIdx = idx + 1;
      const cardInfo = dsmartMap.get(std.id);
      const participantNumber = cardInfo?.participantNumber || `${schoolInfo.npsn || '69955116'}-2026-001`;
      const isEven = globalIdx % 2 === 0;

      const signatureText = isEven
        ? `                                            ${globalIdx}. ...........................`
        : `${globalIdx}. ...........................`;

      return [
        globalIdx,
        participantNumber,
        std.nisn || '-',
        (std.nama || '').toUpperCase(),
        signatureText,
      ];
    });

    const drawDSMartKopAndSubHeader = (docInstance: any) => {
      let y = marginTop;

      // Kop Logos
      if (logoSekolahBase64) {
        try { docInstance.addImage(logoSekolahBase64, 'PNG', marginLeft, y, 16, 16); } catch (e) {}
      }
      if (logoProvBase64) {
        try { docInstance.addImage(logoProvBase64, 'PNG', pageWidth - marginRight - 16, y, 16, 16); } catch (e) {}
      }

      // Title Text
      docInstance.setFont('arial', 'bold');
      docInstance.setFontSize(12);
      docInstance.text("DAFTAR HADIR", centerX, y + 4.5, { align: 'center' });

      docInstance.setFontSize(10);
      docInstance.text("SIMULASI DSMART LAMPUNG", centerX, y + 9, { align: 'center' });
      docInstance.text((schoolInfo.namaSekolah || 'SMAN 3 TUMIJAJAR').toUpperCase(), centerX, y + 13.5, { align: 'center' });

      // Double Line Separator
      y += 17;
      docInstance.setLineWidth(0.8);
      docInstance.line(marginLeft, y, pageWidth - marginRight, y);
      docInstance.setLineWidth(0.2);
      docInstance.line(marginLeft, y + 0.8, pageWidth - marginRight, y + 0.8);

      y += 3.5;

      // Sub-Header Info Box
      const subBoxH = 15;
      docInstance.rect(marginLeft, y, printWidth, subBoxH);
      docInstance.setFillColor(241, 245, 249);
      docInstance.rect(marginLeft, y, printWidth, 6, 'F');
      docInstance.line(marginLeft, y + 6, pageWidth - marginRight, y + 6);

      docInstance.setFont('arial', 'bold');
      docInstance.setFontSize(8.5);
      docInstance.text(
        `SESI: ${params.sessionNumber} | TINGKAT: ${gradeLevel} | KELOMPOK: ${groupName}`,
        marginLeft + 4,
        y + 4.2
      );

      docInstance.setFont('arial', 'normal');
      docInstance.setFontSize(8);
      docInstance.text(
        `Pada hari ini ${params.examDay} tanggal ${params.examDate} bulan ${params.examMonth} tahun ${params.examYear}, telah diselenggarakan Simulasi DSMART Lampung dari pukul ${params.examTimeRange}.`,
        marginLeft + 3,
        y + 11
      );
    };

    // AutoTable streaming across A4 landscape pages
    autoTable(doc, {
      startY: 49,
      margin: { top: 49, left: marginLeft, right: marginRight, bottom: marginBottom },
      head: [['NO', 'NO PESERTA', 'NISN', 'NAMA SISWA', 'TANDA TANGAN']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'arial',
        fontSize: 8.5,
        cellPadding: 2,
        textColor: [0, 0, 0],
        lineColor: [30, 41, 59],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 35 },
        3: { cellWidth: 100, fontStyle: 'bold' },
        4: { cellWidth: printWidth - 197 },
      },
      didDrawPage: () => {
        drawDSMartKopAndSubHeader(doc);
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Check if signature block fits on current page
    if (finalY + 30 > pageHeight - marginBottom) {
      doc.addPage();
      drawDSMartKopAndSubHeader(doc);
      finalY = 52;
    }

    // Render Signatures
    doc.setFont('arial', 'bold');
    doc.setFontSize(9);

    // Left: PENGAWAS
    const leftX = marginLeft + 10;
    doc.text("PENGAWAS", leftX, finalY);
    doc.setFont('arial', 'bold');
    doc.text((params.pengawasName || 'PENGAWAS RUANG').toUpperCase(), leftX, finalY + 18);
    doc.line(leftX, finalY + 19, leftX + 65, finalY + 19);
    doc.setFont('arial', 'normal');
    doc.setFontSize(8);
    doc.text("NIP. " + (params.pengawasNip || '-'), leftX, finalY + 23);

    // Right: PROKTOR
    const rightX = pageWidth - marginRight - 75;
    doc.setFont('arial', 'bold');
    doc.setFontSize(9);
    doc.text("PROKTOR", rightX, finalY);
    doc.setFont('arial', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${params.examLocation}, ${params.examDate} ${params.examMonth} ${params.examYear}`, rightX, finalY + 4);

    doc.setFont('arial', 'bold');
    doc.setFontSize(9);
    doc.text((params.proktorName || 'PROKTOR RUANG').toUpperCase(), rightX, finalY + 18);
    doc.line(rightX, finalY + 19, rightX + 65, finalY + 19);
    doc.setFont('arial', 'normal');
    doc.setFontSize(8);
    doc.text("NIP. " + (params.proktorNip || '-'), rightX, finalY + 23);

    // Dynamic Page Numbering in Sub-Header
    const totalPages = (doc as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('arial', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`(Hal ${p} dari ${totalPages})`, pageWidth - marginRight - 4, 34.2, { align: 'right' });
    }

  } else {
    // =========================================================================
    // REGULAR CBT A4 PORTRAIT FORMAT - Arial Font & Precision Auto-Paging
    // =========================================================================
    const tableBody = students.map((std, idx) => {
      const globalIdx = idx + 1;
      const cardInfo = dsmartMap.get(std.id);
      const participantNumber = cardInfo?.participantNumber || `${schoolInfo.npsn || '69955116'}-2026-001`;
      const isEven = globalIdx % 2 === 0;

      const signatureText = isEven
        ? `                                ${globalIdx}. ....................`
        : `${globalIdx}. ....................`;

      return [
        globalIdx,
        participantNumber,
        std.nisn || '-',
        (std.nama || '').toUpperCase(),
        signatureText,
      ];
    });

    const drawRegularKopAndSubHeader = (docInstance: any) => {
      let y = marginTop;

      if (logoProvBase64) {
        try { docInstance.addImage(logoProvBase64, 'PNG', marginLeft, y, 16, 16); } catch (e) {}
      }
      if (logoSekolahBase64) {
        try { docInstance.addImage(logoSekolahBase64, 'PNG', pageWidth - marginRight - 16, y, 16, 16); } catch (e) {}
      }

      docInstance.setFont('arial', 'bold');
      docInstance.setFontSize(9.5);
      docInstance.text((schoolInfo.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG').toUpperCase(), centerX, y + 4, { align: 'center' });
      docInstance.setFontSize(11.5);
      docInstance.text((schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR').toUpperCase(), centerX, y + 8.5, { align: 'center' });
      docInstance.setFont('arial', 'bold');
      docInstance.setFontSize(10);
      docInstance.text("DAFTAR HADIR PESERTA UJIAN CBT", centerX, y + 13, { align: 'center' });
      docInstance.setFont('arial', 'normal');
      docInstance.setFontSize(8);
      docInstance.text(`Tahun Ajaran ${schoolInfo.tahunAjaranAktif || '2026/2027'} • Semester ${schoolInfo.semesterAktif || 'Ganjil'}`, centerX, y + 17, { align: 'center' });

      y += 20;
      docInstance.setLineWidth(0.6);
      docInstance.line(marginLeft, y, pageWidth - marginRight, y);

      y += 4;
      // Sub-Header Box
      docInstance.setFillColor(241, 245, 249);
      docInstance.rect(marginLeft, y, printWidth, 8, 'F');
      docInstance.setLineWidth(0.2);
      docInstance.rect(marginLeft, y, printWidth, 8, 'S');

      docInstance.setFont('arial', 'bold');
      docInstance.setFontSize(8.5);
      docInstance.text(`KELAS / ROMBEL: ${params.selectedClass} | SESI: ${params.sessionNumber} (${params.examTimeRange})`, marginLeft + 3, y + 5.2);
    };

    autoTable(doc, {
      startY: 46,
      margin: { top: 46, left: marginLeft, right: marginRight, bottom: marginBottom },
      head: [['NO', 'NOMOR PESERTA', 'NISN', 'NAMA LENGKAP SISWA', 'TANDA TANGAN']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'arial',
        fontSize: 8.5,
        cellPadding: 2,
        textColor: [0, 0, 0],
        lineColor: [100, 100, 100],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 42, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 32 },
        3: { cellWidth: 52, fontStyle: 'bold' },
        4: { cellWidth: printWidth - 138 },
      },
      didDrawPage: () => {
        drawRegularKopAndSubHeader(doc);
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    if (finalY + 30 > pageHeight - marginBottom) {
      doc.addPage();
      drawRegularKopAndSubHeader(doc);
      finalY = 48;
    }

    // Signatures
    doc.setFont('arial', 'normal');
    doc.setFontSize(9);
    doc.text("Pengawas Ruang,", marginLeft + 8, finalY);
    doc.setFont('arial', 'bold');
    doc.text(params.pengawasName || 'PENGAWAS RUANG', marginLeft + 8, finalY + 16);
    doc.setFont('arial', 'normal');
    doc.setFontSize(8);
    doc.text("NIP. " + (params.pengawasNip || '-'), marginLeft + 8, finalY + 20);

    const rightX = pageWidth - marginRight - 65;
    doc.setFont('arial', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${params.examLocation}, ${params.examDate} ${params.examMonth} ${params.examYear}`, rightX, finalY);
    doc.setFont('arial', 'normal');
    doc.setFontSize(9);
    doc.text("Proktor Ruang,", rightX, finalY + 4);
    doc.setFont('arial', 'bold');
    doc.text(params.proktorName || 'PROKTOR RUANG', rightX, finalY + 16);
    doc.setFont('arial', 'normal');
    doc.setFontSize(8);
    doc.text("NIP. " + (params.proktorNip || '-'), rightX, finalY + 20);

    // Dynamic Page Numbering
    const totalPages = (doc as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('arial', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`(Hal ${p} dari ${totalPages})`, pageWidth - marginRight - 3, 39.2, { align: 'right' });
    }
  }

  const safeClass = params.selectedClass.replace(/[\s\/\\]+/g, '_');
  doc.save(`DAFTAR_HADIR_${formatMode}_${safeClass}_${new Date().toISOString().slice(0, 10)}.pdf`);
}




