import ExcelJS from 'exceljs';
import { SubjectGradeRecapSheet, Student, TPConfig } from '../types';

/**
 * Helper to convert 1-based column number to Excel column letters (1 -> A, 8 -> H, 14 -> N, etc.)
 */
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

export interface ERaporExportOptions {
  mode: 'standard' | 'blank_template' | 'visual_check';
  studentsInSchool?: Student[];
}

export interface ParsedERaporTemplateResult {
  kelas?: string;
  mataPelajaran?: string;
  rombelPembelajaranId?: string;
  kodeMapel?: string;
  tpConfigs: TPConfig[];
  studentRows: Array<{
    no: number;
    anggotaRombelId?: string;
    pembelajaranId?: string;
    tingkatKode?: string;
    nisn?: string;
    nama: string;
    nilaiRapor?: number | null;
    tpAchievements?: Record<string, 'T' | 'R' | null>;
  }>;
}

/**
 * Export official e-Rapor SMA Excel file with 100% exact styling, formulas,
 * merged cells, hidden rows/columns, and data validation rules using ExcelJS.
 */
export async function exportERaporSMAExcel(
  sheet: SubjectGradeRecapSheet,
  options: ERaporExportOptions
): Promise<void> {
  const { mode = 'standard', studentsInSchool = [] } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SiMantri SMAN 3 Tumijajar - e-Rapor Official Engine';
  workbook.lastModifiedBy = 'SiMantri SMAN 3 Tumijajar';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Wajib Sheet Name: "Worksheet"
  const ws = workbook.addWorksheet('Worksheet', {
    views: [{ showGridLines: true }],
  });

  const activeTPCount = Math.max(1, Math.min(6, sheet.activeTPCount || sheet.tpConfigs?.length || 4));
  const JML_TP = activeTPCount;
  const JML_SISWA = sheet.studentRecords.length;
  const LAST_SISWA_ROW = 6 + JML_SISWA;

  // Dynamic Column Indices
  const colTR = 8 + JML_TP;
  const colOP = 9 + JML_TP;
  const colNILAI = 10 + JML_TP;
  const TOTAL_COLUMNS = 10 + JML_TP;

  const letterTPAwal = 'H'; // Column 8
  const letterTPAkhir = getColumnLetter(7 + JML_TP);
  const letterTR = getColumnLetter(colTR);
  const letterOP = getColumnLetter(colOP);
  const letterNILAI = getColumnLetter(colNILAI);

  // Quick lookup for student NISN from global database
  const studentNisnMap = new Map<string, string>();
  studentsInSchool.forEach((st) => {
    if (st.nisn) {
      studentNisnMap.set(st.id, st.nisn);
      studentNisnMap.set(st.nama.toLowerCase().trim(), st.nisn);
    }
  });

  // 1. Column Widths & Hidden Columns Definition (Exact e-Rapor SMA Specifications)
  const columnsDef: Partial<ExcelJS.Column>[] = [
    { key: 'no', width: 5, hidden: false }, // Col A (1)
    { key: 'id_anggota', width: 0, hidden: true }, // Col B (2 - NILRPT)
    { key: 'id_pembelajaran', width: 0, hidden: true }, // Col C (3 - NILRPT)
    { key: 'tingkat', width: 0, hidden: true }, // Col D (4 - NILRPT)
    { key: 'nisn', width: 13, hidden: false }, // Col E (5 - NISN)
    { key: 'nama', width: 29.43, hidden: false }, // Col F (6 - NAMA SISWA)
    { key: 'nilai_rapor', width: 17.71, hidden: false }, // Col G (7 - NILAI RAPOR)
  ];

  // TP Columns (Col H onwards)
  for (let i = 0; i < JML_TP; i++) {
    columnsDef.push({
      key: `tp_${i + 1}`,
      width: i === 0 ? 10 : 13,
      hidden: false,
    });
  }

  // Hidden Validation Helper Columns & Visible NILAI / Status Column
  columnsDef.push({ key: 'tr', width: 0, hidden: true }); // Col TR
  columnsDef.push({ key: 'op', width: 0, hidden: true }); // Col OP
  columnsDef.push({ key: 'nilai_status', width: 15, hidden: false }); // Col NILAI

  ws.columns = columnsDef;

  // Explicitly ensure hidden column flags are set on worksheet columns
  ws.getColumn(2).hidden = true;
  ws.getColumn(3).hidden = true;
  ws.getColumn(4).hidden = true;
  ws.getColumn(colTR).hidden = true;
  ws.getColumn(colOP).hidden = true;

  // Universal Thin Border & Header Fill Color
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const blueHeaderFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' }, // Solid Biru Resmi e-Rapor SMA (#4F81BD)
  };

  // ===========================================================================
  // BARIS 1: Header Dokumen & Jumlah Kolom
  // ===========================================================================
  const r1 = ws.getRow(1);
  r1.height = 18.75;
  r1.hidden = false;
  r1.getCell(1).value = `FORMAT IMPORT NILAI RAPOR ${sheet.mataPelajaran.toUpperCase()}, KELAS  ${sheet.kelas}`;
  r1.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
  r1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  r1.getCell(2).value = TOTAL_COLUMNS; // Angka total kolom tabel (e.g. 14 jika 4 TP)
  r1.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };

  // ===========================================================================
  // BARIS 2: Baris Akhir Siswa & UUID Pembelajaran / Kode Mapel
  // ===========================================================================
  const r2 = ws.getRow(2);
  r2.height = 15;
  r2.hidden = false;
  r2.getCell(2).value = LAST_SISWA_ROW; // Angka nomor baris terakhir siswa (e.g. 33 jika 27 siswa)
  r2.getCell(3).value = sheet.eraporMetadata?.rombelPembelajaranId || '';
  r2.getCell(4).value = sheet.eraporMetadata?.kodeMapel || '';

  // ===========================================================================
  // BARIS 3 - 6: Header Tabel Berwarna Biru (#4F81BD) & Hidden Rows
  // ===========================================================================
  const r3 = ws.getRow(3);
  r3.height = 24.95;
  r3.hidden = false;

  const r4 = ws.getRow(4);
  r4.height = 0;
  r4.hidden = true; // WAJIB HIDDEN - UUID TP

  const r5 = ws.getRow(5);
  r5.height = 0;
  r5.hidden = true; // WAJIB HIDDEN - Deskripsi TP Max 100 Karakter

  const r6 = ws.getRow(6);
  r6.height = 15;
  r6.hidden = false;

  // Apply Styling to all header cells (Col 1 to TOTAL_COLUMNS, Rows 3 to 6)
  for (let rowNum = 3; rowNum <= 6; rowNum++) {
    const row = ws.getRow(rowNum);
    for (let c = 1; c <= TOTAL_COLUMNS; c++) {
      const cell = row.getCell(c);
      cell.fill = blueHeaderFill;
      cell.border = thinBorder;
      cell.font = {
        name: 'Calibri',
        size: rowNum === 3 ? 12 : 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { horizontal: 'center', vertical: rowNum === 3 ? 'middle' : 'top', wrapText: true };
    }
  }

  // Merge Cells Headers (Baris 3 s.d. 6)
  ws.mergeCells('A3:A6');
  ws.getCell('A3').value = 'NO';

  ws.mergeCells('B3:B6');
  ws.getCell('B3').value = 'NILRPT';

  ws.mergeCells('C3:C6');
  ws.getCell('C3').value = 'NILRPT';

  ws.mergeCells('D3:D6');
  ws.getCell('D3').value = 'NILRPT';

  ws.mergeCells('E3:E6');
  ws.getCell('E3').value = 'NISN';

  ws.mergeCells('F3:F6');
  ws.getCell('F3').value = 'NAMA SISWA';

  ws.mergeCells('G3:G6');
  ws.getCell('G3').value = 'NILAI RAPOR';

  ws.mergeCells(`${letterTPAwal}3:${letterTPAkhir}3`);
  ws.getCell(`${letterTPAwal}3`).value = 'TINGKAT KETERCAPAIAN TP';

  ws.mergeCells(`${letterTR}3:${letterNILAI}3`);
  ws.getCell(`${letterTR}3`).value = 'VALIDASI';

  // Isi Baris 4 (Hidden - id_tp UUID)
  for (let i = 0; i < JML_TP; i++) {
    const tpConfig = sheet.tpConfigs?.[i];
    const cell = r4.getCell(8 + i);
    cell.value = tpConfig?.id_tp || '';
    cell.protection = { locked: false };
  }

  // Isi Baris 5 (Hidden - Deskripsi TP Max 100 Karakter)
  for (let i = 0; i < JML_TP; i++) {
    const tpConfig = sheet.tpConfigs?.[i];
    const cell = r5.getCell(8 + i);
    // Batas karakter resmi e-Rapor SMA: maksimal 100 karakter
    const rawDesc = tpConfig?.description || '';
    const cleanDesc = rawDesc.length > 100 ? rawDesc.substring(0, 100) : rawDesc;
    cell.value = cleanDesc;
    cell.protection = { locked: false };
  }

  // Isi Baris 6 (Kode TP, TR, OP, NILAI)
  for (let i = 0; i < JML_TP; i++) {
    const tpConfig = sheet.tpConfigs?.[i];
    const cell = r6.getCell(8 + i);
    cell.value = tpConfig?.officialCode || `TP.${1111 + i}`;
    cell.protection = { locked: false };
  }
  r6.getCell(colTR).value = 'TR';
  r6.getCell(colOP).value = 'OP';
  r6.getCell(colNILAI).value = 'NILAI';

  // ===========================================================================
  // BARIS 7 s.d. LAST_SISWA_ROW: Data Siswa & Rumus Formula e-Rapor
  // ===========================================================================
  for (let idx = 0; idx < JML_SISWA; idx++) {
    const rIdx = 7 + idx;
    const row = ws.getRow(rIdx);
    row.height = 20.1;
    row.hidden = false;

    const studentRecord = sheet.studentRecords[idx];
    const studentNisn =
      studentRecord.nisn ||
      studentNisnMap.get(studentRecord.studentId) ||
      studentNisnMap.get(studentRecord.studentName.toLowerCase().trim()) ||
      '';

    // Nilai Rapor calculation fallback (bulat)
    let calculatedNar: number | null = null;
    const tpVals = Object.values(studentRecord.tpScores).filter(
      (v): v is number => typeof v === 'number' && !isNaN(v)
    );
    const avgTP = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : null;
    const pas = studentRecord.pasScore;
    const pts = studentRecord.ptsScore;
    if (avgTP !== null && (pas !== null || pts !== null)) {
      const semScore = pas ?? pts!;
      calculatedNar = Math.round((avgTP * 0.5) + (semScore * 0.5));
    } else if (avgTP !== null) {
      calculatedNar = Math.round(avgTP);
    } else if (pas !== null) {
      calculatedNar = Math.round(pas);
    }

    // Col A: NO
    const cellA = row.getCell(1);
    cellA.value = idx + 1;
    cellA.alignment = { horizontal: 'center', vertical: 'top' };

    // Col B, C, D: NILRPT UUIDs & Semester Code
    const cellB = row.getCell(2);
    cellB.value = studentRecord.anggotaRombelId || '';
    cellB.alignment = { horizontal: 'center', vertical: 'top' };

    const cellC = row.getCell(3);
    cellC.value = studentRecord.pembelajaranId || '';
    cellC.alignment = { horizontal: 'center', vertical: 'top' };

    const cellD = row.getCell(4);
    cellD.value = studentRecord.tingkatKode || '16';
    cellD.alignment = { horizontal: 'center', vertical: 'top' };

    // Col E: NISN
    const cellE = row.getCell(5);
    cellE.value = studentNisn;
    cellE.alignment = { horizontal: 'center', vertical: 'top' };

    // Col F: NAMA SISWA
    const cellF = row.getCell(6);
    cellF.value = studentRecord.studentName;
    cellF.alignment = { horizontal: 'left', vertical: 'top' };

    // Col G: NILAI RAPOR (Unlocked, Kosong jika blank_template)
    const cellG = row.getCell(7);
    if (mode === 'blank_template') {
      cellG.value = null;
    } else {
      cellG.value = calculatedNar !== null ? calculatedNar : null;
    }
    cellG.alignment = { horizontal: 'center', vertical: 'top' };
    cellG.protection = { locked: false };

    // Col H s.d. Kolom TP Terakhir: Ketercapaian TP (Unlocked, Kosong jika blank_template)
    for (let i = 0; i < JML_TP; i++) {
      const tpKey = `TP-${i + 1}`;
      const cellTP = row.getCell(8 + i);
      const ach = studentRecord.tpAchievements?.[tpKey] || null;

      if (mode === 'blank_template') {
        cellTP.value = null;
      } else if (mode === 'visual_check') {
        cellTP.value = ach === 'T' || ach === 'R' ? '✓' : null;
      } else {
        // Mode Standar Mesin e-Rapor: "T" atau "R"
        cellTP.value = ach === 'T' ? 'T' : ach === 'R' ? 'R' : null;
      }

      cellTP.alignment = { horizontal: 'center', vertical: 'top' };
      cellTP.protection = { locked: false };
    }

    // Col TR: Formula =COUNTIF(H{r}:K{r},"R")
    const cellTR = row.getCell(colTR);
    const targetSymbolTR = mode === 'visual_check' ? '✓' : 'R';
    cellTR.value = {
      formula: `COUNTIF(${letterTPAwal}${rIdx}:${letterTPAkhir}${rIdx},"${targetSymbolTR}")`,
    };
    cellTR.alignment = { horizontal: 'center', vertical: 'top' };

    // Col OP: Formula =COUNTIF(H{r}:K{r},"T")
    const cellOP = row.getCell(colOP);
    const targetSymbolOP = mode === 'visual_check' ? '✓' : 'T';
    cellOP.value = {
      formula: `COUNTIF(${letterTPAwal}${rIdx}:${letterTPAkhir}${rIdx},"${targetSymbolOP}")`,
    };
    cellOP.alignment = { horizontal: 'center', vertical: 'top' };

    // Col NILAI / Status Validasi: Formula resmi e-Rapor SMA
    const cellNILAI = row.getCell(colNILAI);
    cellNILAI.value = {
      formula: `IF(G${rIdx}="","",IF(G${rIdx}=100,IF(${letterTR}${rIdx}>0,"Tidak Valid",IF((${letterTR}${rIdx}+${letterOP}${rIdx})>0,"Valid","Tidak Valid")),IF(${letterTR}${rIdx}=0,"Tidak Valid",IF((${letterTR}${rIdx}+${letterOP}${rIdx})>0,"Valid","Tidak Valid"))))`,
    };
    cellNILAI.alignment = { horizontal: 'center', vertical: 'top' };

    // Set Default Fonts & Borders for all student row cells
    for (let c = 1; c <= TOTAL_COLUMNS; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
    }
  }

  // ===========================================================================
  // DATA VALIDATION (WAJIB DITERAPKAN PADA RANGE SISWA)
  // ===========================================================================
  // 1. Validasi Kolom Nilai Rapor (G7:G{LAST_SISWA_ROW}): Angka Bulat 1-100
  (ws as any).dataValidations?.add(`G7:G${LAST_SISWA_ROW}`, {
    type: 'whole',
    operator: 'between',
    formulae: [1, 100],
    allowBlank: false,
    showInputMessage: true,
    promptTitle: 'Input Angka',
    prompt: 'Masukkan angka antara 1 dan 100.',
    showErrorMessage: true,
    errorTitle: 'Input Salah',
    error: 'Hanya boleh memasukkan angka antara 1 dan 100.',
  });

  // 2. Validasi Kolom Capaian TP (H7:{letterTPAkhir}{LAST_SISWA_ROW}): List Dropdown "T,R" / "✓"
  const tpValidationListFormula = mode === 'visual_check' ? '"✓"' : '"T,R"';
  (ws as any).dataValidations?.add(`${letterTPAwal}7:${letterTPAkhir}${LAST_SISWA_ROW}`, {
    type: 'list',
    formulae: [tpValidationListFormula],
    allowBlank: false,
    showInputMessage: true,
    promptTitle: 'Ketercapaian TP ',
    prompt: 'T = TP dicapai dengan Sangat Optimal, R = TP masih Perlu Peningkatan',
    showErrorMessage: true,
    errorTitle: 'Input Error',
    error: 'Data tidak sesuai list, Silahkan isi dengan T untuk Pencapaian Sangat Optimal atau R untuk Pencapaian yang Perlu Peningkatan',
  });

  // ===========================================================================
  // BAGIAN FOOTER / KETERANGAN RESMI E-RAPOR SMA
  // ===========================================================================
  let footerRowIndex = LAST_SISWA_ROW + 1; // Baris spasi kosong

  footerRowIndex++; // Baris LAST_SISWA_ROW + 2: KETERANGAN :
  const rKeterangan = ws.getRow(footerRowIndex);
  rKeterangan.getCell(1).value = 'KETERANGAN :';
  rKeterangan.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };

  // Daftar TP di Kolom A
  for (let i = 0; i < JML_TP; i++) {
    footerRowIndex++;
    const rowTP = ws.getRow(footerRowIndex);
    const tpConfig = sheet.tpConfigs?.[i];
    const tpCode = tpConfig?.officialCode || `TP.${1111 + i}`;
    const rawDesc = tpConfig?.description || '';
    const cleanDesc = rawDesc.length > 100 ? rawDesc.substring(0, 100) : rawDesc;

    rowTP.getCell(1).value = ` > ${tpCode} : ${cleanDesc}`;
    rowTP.getCell(1).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
  }

  // Catatan Validasi
  footerRowIndex++;
  const rCatatan = ws.getRow(footerRowIndex);
  rCatatan.getCell(1).value = 'Catatan Validasi:';
  rCatatan.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

  const validasiRules = [
    ' > Jika Nilai Rapor Siswa kurang dari 100, silahkah dipilih Tujuan Pembelajaran mana saja yang masih perlu peningkatan (minimal 1)',
    ' > Selain memilih Tujuan Pembelajaran yang masih perlu peningkatan, pilih juga Tujuan Pembelajaran yang mana saja sudah dicapai dengan sangat optimal (minimal 1)',
    ' > Tidak mesti semua Tujuan Pembelajaran yarus dipilih, minimal pilih satu yang paling optimal dan satu yang paling minimal',
    ' > Pahami Konsep Pembelajaran dan Asesmen sebagaimana telah dimuat pada Buku Panduan PPA agar tidak keliru dalam memahami format nilai rapor ini.',
  ];

  validasiRules.forEach((ruleText) => {
    footerRowIndex++;
    const rRule = ws.getRow(footerRowIndex);
    rRule.getCell(1).value = ruleText;
    rRule.getCell(1).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
  });

  // ===========================================================================
  // PROTEKSI SHEET RESMI (Sesuai Standar e-Rapor SMA)
  // ===========================================================================
  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    formatColumns: true,
    formatRows: true,
  });

  // ===========================================================================
  // PENULISAN BUFFER & PENGUNDUHAN OTOMATIS
  // ===========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Format Nama File Resmi: f_nilai_ [NAMA_KELAS] _[NAMA_MAPEL].xlsx
  const safeKelas = sheet.kelas.trim();
  const safeMapel = sheet.mataPelajaran.trim();
  const downloadFileName = `f_nilai_ ${safeKelas} _${safeMapel}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse an official e-Rapor SMA Excel file uploaded by a teacher to extract
 * authentic UUIDs, TP descriptions, student NISNs, and student records.
 */
export async function parseERaporSMATemplate(file: File): Promise<ParsedERaporTemplateResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.getWorksheet('Worksheet') || workbook.worksheets[0];
  if (!ws) {
    throw new Error('Sheet "Worksheet" tidak ditemukan dalam file Excel e-Rapor.');
  }

  // Row 1: Title & Total Columns
  const r1A = ws.getRow(1).getCell(1).value?.toString() || '';
  let parsedMapel = '';
  let parsedKelas = '';

  const titleMatch = r1A.match(/FORMAT IMPORT NILAI RAPOR\s+(.+?),\s*KELAS\s+(.+)$/i);
  if (titleMatch) {
    parsedMapel = titleMatch[1].trim();
    parsedKelas = titleMatch[2].trim();
  }

  // Row 2: Last Student Row & UUIDs
  const lastRowVal = ws.getRow(2).getCell(2).value;
  const lastStudentRow = typeof lastRowVal === 'number' ? lastRowVal : parseInt(String(lastRowVal || 0), 10);
  const rombelPembelajaranId = ws.getRow(2).getCell(3).value?.toString()?.trim() || '';
  const kodeMapel = ws.getRow(2).getCell(4).value?.toString()?.trim() || '';

  // Determine TP columns between Col H (8) and col with header "TR"
  let trColIndex = 0;
  const row6 = ws.getRow(6);
  for (let c = 8; c <= 30; c++) {
    const val = row6.getCell(c).value?.toString()?.trim().toUpperCase();
    if (val === 'TR') {
      trColIndex = c;
      break;
    }
  }

  const endTPCol = trColIndex > 8 ? trColIndex - 1 : 11; // default to 4 TPs if not found
  const tpConfigs: TPConfig[] = [];

  const row4 = ws.getRow(4);
  const row5 = ws.getRow(5);

  let tpIdx = 1;
  for (let c = 8; c <= endTPCol; c++) {
    const tpId = row4.getCell(c).value?.toString()?.trim() || '';
    const rawDesc = row5.getCell(c).value?.toString()?.trim() || '';
    // Enforce 100 char limit
    const cleanDesc = rawDesc.length > 100 ? rawDesc.substring(0, 100) : rawDesc;
    const officialCode = row6.getCell(c).value?.toString()?.trim() || `TP.${1110 + tpIdx}`;

    tpConfigs.push({
      code: `TP-${tpIdx}`,
      description: cleanDesc || `Tujuan Pembelajaran ${tpIdx}`,
      id_tp: tpId,
      officialCode,
    });
    tpIdx++;
  }

  // Student rows (starting from Row 7)
  const actualLastRow = lastStudentRow >= 7 ? lastStudentRow : ws.rowCount;
  const studentRows: ParsedERaporTemplateResult['studentRows'] = [];

  for (let r = 7; r <= actualLastRow; r++) {
    const row = ws.getRow(r);
    const noVal = row.getCell(1).value;
    const namaVal = row.getCell(6).value?.toString()?.trim();

    if (!namaVal && !noVal) continue; // blank row

    const anggotaRombelId = row.getCell(2).value?.toString()?.trim();
    const pembelajaranId = row.getCell(3).value?.toString()?.trim();
    const tingkatKode = row.getCell(4).value?.toString()?.trim();
    const nisn = row.getCell(5).value?.toString()?.trim();

    const rawNilai = row.getCell(7).value;
    let nilaiRapor: number | null = null;
    if (typeof rawNilai === 'number') {
      nilaiRapor = rawNilai;
    } else if (typeof rawNilai === 'string' && rawNilai.trim() !== '') {
      const parsed = parseFloat(rawNilai);
      if (!isNaN(parsed)) nilaiRapor = Math.round(parsed);
    }

    // Extract TP achievements
    const tpAchievements: Record<string, 'T' | 'R' | null> = {};
    for (let i = 0; i < tpConfigs.length; i++) {
      const col = 8 + i;
      const rawVal = row.getCell(col).value?.toString()?.trim().toUpperCase();
      const tpKey = `TP-${i + 1}`;
      if (rawVal === 'T' || rawVal === 'OPTIMAL') {
        tpAchievements[tpKey] = 'T';
      } else if (rawVal === 'R' || rawVal === 'PERLU PENINGKATAN') {
        tpAchievements[tpKey] = 'R';
      } else {
        tpAchievements[tpKey] = null;
      }
    }

    studentRows.push({
      no: typeof noVal === 'number' ? noVal : parseInt(String(noVal || studentRows.length + 1), 10),
      anggotaRombelId,
      pembelajaranId,
      tingkatKode,
      nisn,
      nama: namaVal || `Siswa ${r - 6}`,
      nilaiRapor,
      tpAchievements,
    });
  }

  return {
    kelas: parsedKelas,
    mataPelajaran: parsedMapel,
    rombelPembelajaranId,
    kodeMapel,
    tpConfigs,
    studentRows,
  };
}
