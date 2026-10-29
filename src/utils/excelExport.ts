import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Assessment, SchoolInfo, Student, SubjectItem } from '../types';
import { sanitizeCapaianKompetensi, generateBloomDeepLearningCK } from './capaianKompetensi';
import { formatAcademicTitles } from './kktpHelper';
import { getCorrectionDateFormatted } from './dateUtils';
import { getAssessmentClassesList, cleanCanonicalClass, getSemesterNumber } from './classHelper';

// Helper to build a styled ExcelJS workbook for Raport STS / SAS
async function createStyledRaportWorkbook(
  assessment: Assessment,
  schoolInfo: SchoolInfo,
  allStudentsInClass: Student[],
  selectedSubClass?: string
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolInfo.namaSekolah || 'SMA Negeri 3 Tumijajar';
  workbook.lastModifiedBy = schoolInfo.namaSekolah || 'SMA Negeri 3 Tumijajar';
  workbook.created = new Date();

  const rawClasses = getAssessmentClassesList(assessment.kelas);
  let classesList: string[] = [];

  if (selectedSubClass && selectedSubClass !== 'ALL') {
    classesList = [selectedSubClass.trim()];
  } else if (allStudentsInClass.length > 0) {
    const presentClasses = Array.from(
      new Set(allStudentsInClass.map((s) => s.kelas.trim()).filter(Boolean))
    );
    if (presentClasses.length > 0) {
      classesList = presentClasses;
    } else {
      classesList = rawClasses.length > 0 ? rawClasses : [assessment.kelas];
    }
  } else {
    classesList = rawClasses.length > 0 ? rawClasses : [assessment.kelas];
  }

  const FONT_NAME = 'Times New Roman';

  for (const clsName of classesList) {
    // Filter students for this subclass/class only
    const classStudents = allStudentsInClass.filter(
      (s) => cleanCanonicalClass(s.kelas) === cleanCanonicalClass(clsName)
    );
    const studentsToRender = classStudents.length > 0 ? classStudents : (classesList.length === 1 ? allStudentsInClass : []);
    if (studentsToRender.length === 0) continue;

    const sheetName = `Raport_${assessment.jenis}_${clsName}`.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 30);
    const ws = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'portrait' }, // A4/F4
    });

    // Explicit Column Widths matching Gambar 2
    ws.columns = [
      { key: 'no', width: 8 },
      { key: 'nama', width: 38 },
      { key: 'nilai', width: 16 },
      { key: 'ck', width: 92 },
    ];

    const semNum = getSemesterNumber(clsName, assessment.semester);

    // Row 1: Document Title Header
    const r1 = ws.addRow([`LAPORAN HASIL ASESMEN FORMATIF DAN SUMATIF (RAPOR STS)`]);
    ws.mergeCells('A1:D1');
    r1.height = 22;
    r1.getCell(1).font = { name: FONT_NAME, size: 13, bold: true };
    r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: School Name
    const r2 = ws.addRow([schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR']);
    ws.mergeCells('A2:D2');
    r2.height = 20;
    r2.getCell(1).font = { name: FONT_NAME, size: 12, bold: true };
    r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Assessment Jenis, Kelas, Semester & Academic Year
    const r3 = ws.addRow([`NILAI RAPORT ${assessment.jenis} KELAS ${clsName} SEMESTER ${semNum} T.A ${assessment.tahunAjaran}`]);
    ws.mergeCells('A3:D3');
    r3.height = 20;
    r3.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 4: Blank
    ws.addRow([]);

    // Row 5: Metadata line 1 (Merged A5:B5 left-aligned so KELAS text is fully visible)
    const r5 = ws.addRow([
      `KELAS : ${clsName}`,
      '',
      `FASE : ${assessment.fase.replace(/^Fase\s*/i, '').toUpperCase()}`,
      `SEMESTER : ${semNum} (${assessment.semester})`,
    ]);
    ws.mergeCells('A5:B5');
    r5.height = 20;

    r5.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    r5.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    r5.getCell(3).font = { name: FONT_NAME, size: 11, bold: true };
    r5.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    r5.getCell(4).font = { name: FONT_NAME, size: 11, bold: true };
    r5.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 6: Metadata line 2 (Merged A6:B6 for MAPEL and C6:D6 for GURU MAPEL left-aligned)
    const r6 = ws.addRow([
      `MAPEL : ${assessment.mataPelajaran}`,
      '',
      `GURU MAPEL : ${formatAcademicTitles(assessment.guruPengampu || 'Guru Mata Pelajaran')}`,
      '',
    ]);
    ws.mergeCells('A6:B6');
    ws.mergeCells('C6:D6');
    r6.height = 20;

    r6.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    r6.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    r6.getCell(3).font = { name: FONT_NAME, size: 11, bold: false };
    r6.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 7: Blank
    ws.addRow([]);

    // Row 8: Table Header (Styled matching Gambar 2)
    const headerRow = ws.addRow(['NO', 'NAMA SISWA', 'NILAI AKHIR', 'CAPAIAN KOMPETENSI']);
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Cyan / Blue header tint
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Data Rows with clean thin borders & Times New Roman font
    studentsToRender.forEach((std, idx) => {
      const sub = assessment.submissions.find((s) => s.studentId === std.id || s.studentName === std.nama);
      const ck = sub
        ? sanitizeCapaianKompetensi(sub.capaianKompetensi, std.nama, sub.tuntas, assessment.mataPelajaran, sub.nilaiAkhir)
        : generateBloomDeepLearningCK(0, assessment.kktp || 75, assessment.mataPelajaran);

      const dRow = ws.addRow([idx + 1, std.nama, sub ? sub.nilaiAkhir : 0, ck]);
      const approxLines = Math.ceil(ck.length / 75) || 1;
      dRow.height = Math.max(26, approxLines * 18);

      // Cell 1: NO
      const c1 = dRow.getCell(1);
      c1.font = { name: FONT_NAME, size: 11 };
      c1.alignment = { horizontal: 'center', vertical: 'middle' };

      // Cell 2: NAMA SISWA
      const c2 = dRow.getCell(2);
      c2.font = { name: FONT_NAME, size: 11, bold: true };
      c2.alignment = { horizontal: 'left', vertical: 'middle' };

      // Cell 3: NILAI AKHIR
      const c3 = dRow.getCell(3);
      c3.font = { name: FONT_NAME, size: 11, bold: true };
      c3.alignment = { horizontal: 'center', vertical: 'middle' };

      // Cell 4: CAPAIAN KOMPETENSI
      const c4 = dRow.getCell(4);
      c4.font = { name: FONT_NAME, size: 11 };
      c4.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Border styling for all cells
      [c1, c2, c3, c4].forEach((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    });

    // Blank row
    ws.addRow([]);

    // Signature Block
    const corrDate = getCorrectionDateFormatted(assessment.submissions);
    const sigRow1 = ws.addRow(['', '', '', `Tumijajar, ${corrDate}`]);
    sigRow1.getCell(4).font = { name: FONT_NAME, size: 11 };
    sigRow1.getCell(4).alignment = { horizontal: 'center' };

    const sigRow2 = ws.addRow(['', '', '', 'Guru Mata Pelajaran,']);
    sigRow2.getCell(4).font = { name: FONT_NAME, size: 11 };
    sigRow2.getCell(4).alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow([]);

    const sigRow5 = ws.addRow(['', '', '', formatAcademicTitles(assessment.guruPengampu || 'Guru Mata Pelajaran')]);
    sigRow5.getCell(4).font = { name: FONT_NAME, size: 11, bold: true, underline: true };
    sigRow5.getCell(4).alignment = { horizontal: 'center' };
  }

  // Fallback sheet if empty
  if (workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet('Raport_Kosong');
    ws.addRow(['Belum ada data siswa untuk rombel ini']);
  }

  return workbook;
}

// 1. Export Nilai Raport STS / SAS to Excel (ExcelJS with Times New Roman & exact formatting)
export async function exportRaportToExcel(
  assessment: Assessment,
  schoolInfo: SchoolInfo,
  allStudentsInClass: Student[],
  selectedSubClass?: string
) {
  const workbook = await createStyledRaportWorkbook(assessment, schoolInfo, allStudentsInClass, selectedSubClass);
  const targetClass = (selectedSubClass && selectedSubClass !== 'ALL')
    ? selectedSubClass
    : (allStudentsInClass[0]?.kelas || assessment.kelas);
  const safeClass = targetClass.replace(/[\s\/\\]+/g, '_');
  const safeMapel = (assessment.mataPelajaran || 'MAPEL').replace(/[\s\/\\]+/g, '_');
  const fileName = `NILAI_RAPORT_${assessment.jenis}_KELAS_${safeClass}_${safeMapel}_TA_${assessment.tahunAjaran.replace(/\//g, '-')}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1b. Export Nilai Raport to Excel as Raw Binary Uint8Array Buffer
export async function exportRaportToExcelBuffer(
  assessment: Assessment,
  schoolInfo: SchoolInfo,
  allStudentsInClass: Student[],
  selectedSubClass?: string
): Promise<Uint8Array> {
  const workbook = await createStyledRaportWorkbook(assessment, schoolInfo, allStudentsInClass, selectedSubClass);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}


// 2. Export All Students Template
export function downloadStudentTemplateExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['NO', 'NISN', 'NAMA_LENGKAP', 'JENIS_KELAMIN', 'KELAS'];
  const sampleData = [
    [1, '008741201', 'ALFI FEBRI ANGGRAINI', 'P', 'X.1'],
    [2, '008741202', 'ALIN DWI ANTARI NADA', 'P', 'X.1'],
    [3, '008741203', 'ANTON AMARTA', 'L', 'X.1'],
    [4, '008741204', 'ARDI YANSYAH', 'L', 'X.1'],
    [5, '008741205', 'ATMAJA RIZAL MAARIF', 'L', 'X.1'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 35 }, { wch: 15 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_SISWA_SMANTRI.xlsx');
}

// 3. Export ASAS MCQ Question Template
export function downloadMCQTemplateExcel(count: number = 40) {
  const wb = XLSX.utils.book_new();
  const headers = ['NO', 'SOAL', 'OPSI_A', 'OPSI_B', 'OPSI_C', 'OPSI_D', 'OPSI_E', 'KUNCI_JAWABAN', 'SKOR'];
  const rows: any[] = [];

  for (let i = 1; i <= count; i++) {
    rows.push([
      i,
      `Contoh butir pertanyaan nomor ${i}...`,
      'Pilihan A',
      'Pilihan B',
      'Pilihan C',
      'Pilihan D',
      'Pilihan E',
      ['A', 'B', 'C', 'D', 'E'][(i - 1) % 5],
      Math.round(100 / count),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 50 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 16 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template_ASAS_PG');
  XLSX.writeFile(wb, `TEMPLATE_SOAL_ASAS_PG_${count}_SOAL_SMANTRI.xlsx`);
}

// 4. Export ASTS Essay Question Template
export function downloadEssayTemplateExcel(count: number = 10) {
  const wb = XLSX.utils.book_new();
  const headers = ['NO', 'SOAL_URAIAN', 'KUNCI_JAWABAN_RUBRIK', 'SKOR_MAKSIMAL', 'DIMENSI_PEMBELAJARAN_MENDALAM'];
  const rows: any[] = [];

  const defaultDimensions = [
    'Penalaran Kritis, Berkesadaran',
    'Keimanan dan Ketakwaan, Kewargaan',
    'Kemandirian, Memahami',
    'Kreativitas, Mengaplikasi',
    'Kolaborasi, Komunikasi',
    'Penalaran Kritis, Merefleksi',
    'Kewargaan, Berkesadaran',
    'Kesehatan, Kolaborasi',
    'Kemandirian, Penalaran Kritis',
    'Merefleksi, Pemanfaatan Digital',
  ];

  for (let i = 1; i <= count; i++) {
    rows.push([
      i,
      `Soal uraian essay nomor ${i}...`,
      `Rubrik dan pedoman penskoran nomor ${i}...`,
      Math.round(100 / count),
      defaultDimensions[(i - 1) % defaultDimensions.length],
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 50 },
    { wch: 50 },
    { wch: 16 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template_ASTS_Essay');
  XLSX.writeFile(wb, `TEMPLATE_SOAL_ASTS_ESSAY_${count}_SOAL_SMANTRI.xlsx`);
}

// 5. Export Teacher Accounts Import Template
export function downloadTeacherTemplateExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['NO', 'NIP', 'NAMA_LENGKAP', 'USERNAME', 'PASSWORD', 'MATA_PELAJARAN', 'ROLE'];
  const sampleData = [
    [1, '19850412 201001 1 005', 'DRA. SRI SUHARTINI', 'sri_suhartini', '123456', 'Pendidikan Antikorupsi', 'guru'],
    [2, '19880215 201201 2 008', 'BAMBANG HERMANTO, S.PD.', 'bambang_h', '123456', 'Matematika, Fisika', 'guru'],
    [3, '19920105 201802 1 003', 'RINA ANGGRAINY, M.PD.', 'rina_a', '123456', 'Bahasa Indonesia', 'guru'],
    [4, '', 'EKO PRASETYO, S.KOM.', 'eko_p', '123456', 'Informatika', 'admin'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 35 },
    { wch: 20 },
    { wch: 16 },
    { wch: 35 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template_Guru');
  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_DATA_GURU_SMANTRI.xlsx');
}

// 6. Export Subject Data Import Template
export function downloadSubjectTemplateExcel() {
  const wb = XLSX.utils.book_new();
  const headers = [
    'NO',
    'KODE',
    'MATA_PELAJARAN',
    'GURU_PENGAMPU',
    'KELAS_AJAR',
    'KKTP_KELAS_X',
    'KKTP_KELAS_XI',
    'KKTP_KELAS_XII',
  ];
  const sampleData = [
    [1, 'GEOTL', 'Geografi Tingkat Lanjut', 'Drs. Hendra Setiawan', 'XI.1, XI.2, XII.1', 75, 75, 77],
    [2, 'PAI', 'Pendidikan Agama Islam dan Budi Pekerti', 'Ahmad Fauzi, S.Pd.I.', 'Semua', 75, 75, 75],
    [3, 'BIND', 'Bahasa Indonesia', 'Rina Anggrainy, M.Pd.', 'Semua', 75, 76, 78],
    [4, 'BDL', 'Bahasa Daerah Lampung', 'Siti Rahmawati, S.Pd.', 'Semua', 75, 76, 78],
    [5, 'PKWU', 'Prakarya dan Kewirausahaan', 'Bambang Hermanto, S.Pd.', 'Semua', 75, 78, 80],
    [6, 'KKA', 'Koding dan Kecerdasan Artifisial', 'Eko Prasetyo, S.Kom.', 'Semua', 75, 76, 78],
    [7, 'SJR', 'Sejarah', 'Dra. Sri Suhartini', 'Semua', 75, 76, 78],
    [8, 'SJRTL', 'Sejarah Tingkat Lanjut', 'Dra. Sri Suhartini', 'XI.1, XII.1', 75, 76, 78],
    [9, 'PPKN', 'Pendidikan Pancasila', 'Wahyudi, S.Pd.', 'Semua', 75, 75, 77],
    [10, 'BK', 'Bimbingan dan Konseling (BK)', 'Dewi Lestari, S.Psi.', 'Semua', 75, 75, 75],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 42 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template_Mapel');
  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_MATA_PELAJARAN_SMANTRI.xlsx');
}

// 7. Export ASAS Answer Key Template Excel
export function downloadASASAnswerKeyTemplateExcel(
  mcqQuestions: Array<{ nomor: number; kunci: string; skor?: number }>,
  mataPelajaran: string,
  kelas: string
) {
  const wb = XLSX.utils.book_new();

  const titleRow = [`FORMAT KUNCI JAWABAN ASAS PILIHAN GANDA`];
  const metaRow = [`MAPEL: ${mataPelajaran || 'Mata Pelajaran'}`, `KELAS: ${kelas || 'X'}`];
  const noteRow = [`PETUNJUK: Isikan kolom 'KUNCI JAWABAN' dengan huruf A, B, C, D, atau E.`];
  const blankRow: any[] = [];
  const headers = ['NO', 'KUNCI JAWABAN (A/B/C/D/E)', 'MATA PELAJARAN', 'SKOR'];

  // Default to 40 questions if mcqQuestions is empty
  const items = mcqQuestions && mcqQuestions.length > 0
    ? mcqQuestions
    : Array.from({ length: 40 }, (_, i) => ({ nomor: i + 1, kunci: 'A', skor: 2 }));

  const dataRows = items.map((q) => [
    q.nomor,
    q.kunci ? q.kunci.toUpperCase() : 'A',
    mataPelajaran || 'Umum',
    q.skor || 2,
  ]);

  const wsData = [
    titleRow,
    metaRow,
    noteRow,
    blankRow,
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 8 },  // NO
    { wch: 28 }, // KUNCI JAWABAN
    { wch: 35 }, // MATA PELAJARAN
    { wch: 10 }, // SKOR
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Kunci_Jawaban_ASAS');
  const safeMapel = (mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const safeKelas = (kelas || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `FORMAT_KUNCI_JAWABAN_ASAS_${safeMapel}_KELAS_${safeKelas}.xlsx`);
}

// 8. Parse Uploaded ASAS Answer Key Excel
export function parseASASAnswerKeyExcel(file: File): Promise<Array<{ nomor: number; kunci: string; skor?: number }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const parsedKeys: Array<{ nomor: number; kunci: string; skor?: number }> = [];

        json.forEach((row) => {
          if (!row || row.length === 0) return;
          const noVal = Number(row[0]);
          if (!isNaN(noVal) && noVal > 0 && noVal <= 100) {
            let keyVal = String(row[1] || '').trim().toUpperCase();
            if (!['A', 'B', 'C', 'D', 'E'].includes(keyVal)) {
              for (let i = 1; i < row.length; i++) {
                const candidate = String(row[i] || '').trim().toUpperCase();
                if (['A', 'B', 'C', 'D', 'E'].includes(candidate)) {
                  keyVal = candidate;
                  break;
                }
              }
            }
            if (!['A', 'B', 'C', 'D', 'E'].includes(keyVal)) {
              keyVal = 'A';
            }

            const skorVal = Number(row[3]) || 2;
            parsedKeys.push({
              nomor: noVal,
              kunci: keyVal,
              skor: skorVal,
            });
          }
        });

        parsedKeys.sort((a, b) => a.nomor - b.nomor);
        resolve(parsedKeys);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// 9. Export Master Subjects to Excel
export function exportSubjectsToExcel(subjects: SubjectItem[], schoolName?: string) {
  const wb = XLSX.utils.book_new();
  const headers = [
    'NO',
    'KODE',
    'MATA_PELAJARAN',
    'GURU_PENGAMPU',
    'KELAS_AJAR',
    'KKTP_KELAS_X',
    'KKTP_KELAS_XI',
    'KKTP_KELAS_XII',
  ];

  const rows = (subjects || []).map((sbj, idx) => [
    idx + 1,
    sbj.kode || '',
    sbj.nama || '',
    (sbj.guruPengampu || []).join(', ') || '-',
    sbj.kelasAjar && sbj.kelasAjar.length > 0 ? sbj.kelasAjar.join(', ') : 'Semua',
    sbj.kktpX || sbj.kktp || 75,
    sbj.kktpXI || sbj.kktp || 75,
    sbj.kktpXII || sbj.kktp || 75,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 40 },
    { wch: 35 },
    { wch: 25 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Mapel');
  const safeSchool = (schoolName || 'SMANTRI').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `DATA_MATA_PELAJARAN_${safeSchool}.xlsx`);
}
