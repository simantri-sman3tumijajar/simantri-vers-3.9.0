import * as XLSX from 'xlsx';
import { Student, SubjectItem, SchoolInfo } from '../types';

export interface LegerTemplateOptions {
  school: SchoolInfo;
  className: string;
  fase: string;
  tahunAjaran: string;
  semester: string;
  students: Student[];
  subjects: SubjectItem[];
}

export function downloadLegerExcelTemplate(options: LegerTemplateOptions) {
  const { school, className, fase, tahunAjaran, semester, students, subjects } = options;

  // 1. Prepare Subject Names (e.g. 15-20 core & elective subjects)
  const subjectList = subjects && subjects.length > 0
    ? subjects.map((s) => s.nama)
    : [
        'Pendidikan Agama Islam',
        'Pendidikan Pancasila',
        'Bahasa Indonesia',
        'Matematika',
        'Sejarah',
        'Bahasa Inggris',
        'Seni Budaya',
        'PJOK',
        'Informatika',
        'Biologi',
        'Fisika',
        'Kimia',
        'Ekonomi',
        'Geografi',
        'Sosiologi',
      ];

  // 2. Prepare Worksheet Data for LEGER_NILAI
  const wsData: any[][] = [];

  // Official Header
  wsData.push(['PEMERINTAH PROVINSI LAMPUNG - DINAS PENDIDIKAN DAN KEBUDAYAAN']);
  wsData.push([school.namaSekolah ? school.namaSekolah.toUpperCase() : 'SMAN 3 TUMIJAJAR']);
  wsData.push(['FORMAT RESMI IMPOR / EKSPOR LEGER NILAI AKADEMIK SISWA']);
  wsData.push([
    `KELAS: ${className}`,
    `FASE: ${fase}`,
    `TAHUN PELAJARAN: ${tahunAjaran}`,
    `SEMESTER: ${semester.toUpperCase()}`,
  ]);
  wsData.push([]); // Blank separator

  // Table Column Headers
  const colHeaders = [
    'NO',
    'NISN',
    'NAMA SISWA',
    'JK',
    ...subjectList,
    'JUMLAH',
    'RATA-RATA',
    'KETERANGAN',
  ];
  wsData.push(colHeaders);

  // Student Data Rows
  if (students && students.length > 0) {
    students.forEach((st, idx) => {
      const rowNum = 6 + idx + 1; // 1-indexed Excel row number
      const firstSubjColIndex = 4; // 0-indexed column E
      const lastSubjColIndex = 4 + subjectList.length - 1;

      const firstSubjLetter = XLSX.utils.encode_col(firstSubjColIndex);
      const lastSubjLetter = XLSX.utils.encode_col(lastSubjColIndex);

      const row: any[] = [
        idx + 1,
        st.nisn || '',
        st.nama,
        st.jenisKelamin || 'L',
      ];

      // Empty subject cells for grades
      for (let i = 0; i < subjectList.length; i++) {
        row.push('');
      }

      // Excel formula for Sum and Average
      const sumFormula = { f: `SUM(${firstSubjLetter}${rowNum}:${lastSubjLetter}${rowNum})` };
      const avgFormula = { f: `IFERROR(ROUND(AVERAGE(${firstSubjLetter}${rowNum}:${lastSubjLetter}${rowNum}), 1), "")` };

      row.push(sumFormula);
      row.push(avgFormula);
      row.push(''); // Keterangan

      wsData.push(row);
    });
  } else {
    // Blank template with 5 placeholder rows
    for (let i = 1; i <= 5; i++) {
      const row = [i, '', `Contoh Siswa ${i}`, 'L', ...subjectList.map(() => ''), '', '', ''];
      wsData.push(row);
    }
  }

  // Create Workbook & append Leger sheet
  const wb = XLSX.utils.book_new();
  const wsLeger = XLSX.utils.aoa_to_sheet(wsData);

  // Column width styling
  const colWidths: any[] = [
    { wch: 6 },  // NO
    { wch: 16 }, // NISN
    { wch: 32 }, // NAMA SISWA
    { wch: 6 },  // JK
  ];
  subjectList.forEach(() => colWidths.push({ wch: 12 }));
  colWidths.push({ wch: 12 }); // JUMLAH
  colWidths.push({ wch: 12 }); // RATA-RATA
  colWidths.push({ wch: 16 }); // KETERANGAN
  wsLeger['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsLeger, `Leger_${className.replace(/[^a-zA-Z0-9]/g, '_')}`);

  // 3. Prepare Petunjuk Pengisian Sheet
  const guideData = [
    ['PETUNJUK PENGISIAN FORMAT EXCEL LEGER NILAI SISWA SMAN 3 TUMIJAJAR'],
    [],
    ['No', 'Ketentuan & Pedoman'],
    [1, 'Jangan mengubah nama kolom NISN dan NAMA SISWA agar sistem dapat menghubungkan data secara otomatis.'],
    [2, 'Kolom nilai mata pelajaran diisi dengan angka bulat atau desimal (skala 0 - 100).'],
    [3, 'Jika siswa belum memiliki nilai pada suatu mapel, biarkan sel dalam keadaan kosong.'],
    [4, 'File ini dapat digunakan untuk mengimpor riwayat nilai tahun/kelas sebelumnya ke dalam sistem SiMantri.'],
    [5, 'Setelah pengisian selesai, simpan file ini dan gunakan menu "Impor Leger Excel (Tahun & Kelas Sebelumnya)" pada sistem.'],
    [],
    ['Daftar Kode Mata Pelajaran Terdata:'],
    ...subjectList.map((s, idx) => [idx + 1, s]),
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 6 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'PETUNJUK_PENGISIAN');

  // Trigger download
  const cleanFileName = `Format_Leger_Nilai_${className}_TP_${tahunAjaran.replace('/', '_')}_${semester}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}
