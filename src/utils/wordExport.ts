import { Assessment, SchoolInfo, Student, Submission } from '../types';
import QRCode from 'qrcode';
import { sanitizeCapaianKompetensi, generateBloomDeepLearningCK } from './capaianKompetensi';
import { formatAcademicTitles, getKKTPKategori } from './kktpHelper';
import { getCorrectionDateFormatted, formatIndonesianDate } from './dateUtils';
import { isClassMatch, getSemesterNumber } from './classHelper';
import { generateAuthenticVerificationCode, getAuthenticStatus, buildVerificationURL, formatGuruNip } from './authenticProofHelper';

// Convert image URL to base64 for embedding directly inside Word HTML document
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
        resolve(imageUrl);
      }
    };
    img.onerror = () => {
      resolve(imageUrl);
    };
    img.src = imageUrl;
  });
}

function formatTextForWord(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^\*\s][^\*]*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/==(.*?)==/g, '<mark>$1</mark>')
    .replace(/\n/g, '<br/>');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate Official Kop Surat HTML
function generateOfficialKopHTML(schoolInfo: SchoolInfo, logoProvBase64: string | null, logoSekolahBase64: string | null): string {
  const logoProvSrc = logoProvBase64 || schoolInfo.logoProvinsiUrl || 'https://iili.io/nl0FZGe.png';
  const logoSekolahSrc = logoSekolahBase64 || schoolInfo.logoSekolahUrl || 'https://iili.io/nl02Et1.png';

  return `
    <table class="kop-table" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none; margin-bottom: 2px;">
      <col style="width: 90px;" />
      <col style="width: auto;" />
      <col style="width: 80px;" />
      <tr>
        <td style="text-align: left; vertical-align: middle; border: none; padding: 0 4px 0 0;">
          <img src="${logoProvSrc}" alt="Logo Provinsi" style="width: 84px; height: 75px; max-height: 85px; object-fit: fill;" />
        </td>
        <td style="text-align: center; vertical-align: middle; border: none; padding: 0 4px; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-family: 'Times New Roman', serif; font-size: 13.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.15; color: #000;">
            ${schoolInfo.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: 15.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.15; color: #000; letter-spacing: 0.5px;">
            ${schoolInfo.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: 9.5pt; font-weight: normal; text-transform: uppercase; line-height: 1.2; color: #000; margin-top: 1px;">
            NPSN : ${schoolInfo.npsn || '69955116'} - NSS: ${schoolInfo.nss || '30.1.1812.02.021'} - AKREDITASI ”${schoolInfo.akreditasi || 'B'}”
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: 8.5pt; font-style: normal; line-height: 1.2; color: #000;">
            ${schoolInfo.alamat || 'Alamat : Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794'}
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000;">
            E-mail : ${schoolInfo.email || 'smantitumijajar@gmail.com'} – Website : ${schoolInfo.website || 'https://sman3tumijajar.sch.id'}
          </div>
        </td>
        <td style="text-align: right; vertical-align: middle; border: none; padding: 0 0 0 4px;">
          <img src="${logoSekolahSrc}" alt="Logo Sekolah" style="width: 72px; height: auto; max-height: 85px; object-fit: contain;" />
        </td>
      </tr>
    </table>
    <div style="border-top: 2.25pt solid #000; border-bottom: 0.75pt solid #000; height: 2pt; margin-top: 3pt; margin-bottom: 12pt;"></div>
  `;
}

  // 1. Export ASTS Lembar Soal & Lembar Jawaban (Essay) to Word (Standard F4 Document)
export async function exportASTSSoalWord(assessment: Assessment, schoolInfo: SchoolInfo) {
  const logoProvBase64 = await getBase64ImageFromUrl(schoolInfo.logoProvinsiUrl);
  const logoSekolahBase64 = await getBase64ImageFromUrl(schoolInfo.logoSekolahUrl);

  const kopHtml = generateOfficialKopHTML(schoolInfo, logoProvBase64, logoSekolahBase64);

  // Generate Questions List
  let questionsHtml = '';
  assessment.essayRubrik.forEach((item) => {
    questionsHtml += `
      <div style="margin-bottom: 8pt; text-align: justify; line-height: 1.15; word-wrap: break-word; overflow-wrap: break-word;">
        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none;">
          <col style="width: 28px;" />
          <col style="width: auto;" />
          <tr>
            <td style="vertical-align: top; font-weight: normal; border: none; padding: 0 4px 0 0;">${item.nomor}.</td>
            <td style="vertical-align: top; text-align: justify; border: none; padding: 0; word-wrap: break-word; overflow-wrap: break-word;">${formatTextForWord(item.soal)}</td>
          </tr>
        </table>
      </div>
    `;
  });

  // Generate 15 Dotted Answer Lines
  let dottedLinesHtml = '';
  for (let i = 1; i <= 15; i++) {
    dottedLinesHtml += `
      <div style="border-bottom: 1pt dotted #777777; height: 22pt; width: 100%; margin-bottom: 2pt;"></div>
    `;
  }

  const documentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Naskah Soal ${assessment.jenis} - ${assessment.mataPelajaran}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.59cm 33.02cm; /* Standar F4 / Folio Indonesia */
          margin: 1.2cm 1.5cm 1.5cm 1.8cm; /* Atas: 1.2cm, Kanan: 1.5cm, Bawah: 1.5cm, Kiri: 1.8cm */
          mso-page-orientation: portrait;
          mso-header-margin: 20pt;
          mso-footer-margin: 20pt;
        }
        div.Section1 {
          page: Section1;
          max-width: 18.29cm;
          width: 100%;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.15;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000000;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
        }
        table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        td, th {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          vertical-align: top;
        }
        .text-center {
          text-align: center;
        }
        .text-justify {
          text-align: justify;
        }
        .font-bold {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${kopHtml}

        <!-- Judul Soal -->
        <div style="text-align: center; margin-bottom: 12pt; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
            LEMBAR SOAL DAN LEMBAR JAWABAN
          </div>
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
            ${(assessment.judul || `ASESMEN SUMATIF TENGAH SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()} T.P ${assessment.tahunAjaran}`).replace(/^(LEMBAR\s+SOAL\s+DAN\s+LEMBAR\s+JAWABAN|LEMBAR\s+SOAL)\s*/i, '').trim() || `ASESMEN SUMATIF TENGAH SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()} T.P ${assessment.tahunAjaran}`}
          </div>
        </div>

        <!-- Tabel Identitas Ujian & Siswa (2 Kolom Sejajar) -->
        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none; margin-bottom: 10pt; font-size: 11pt;">
          <col style="width: 50%;" />
          <col style="width: 50%;" />
          <tr>
            <!-- Kolom Kiri -->
            <td style="vertical-align: top; border: none; padding: 0 12pt 0 0; word-wrap: break-word; overflow-wrap: break-word;">
              <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none;">
                <col style="width: 115px;" />
                <col style="width: 15px;" />
                <col style="width: auto;" />
                <tr>
                  <td style="border: none; padding: 5px 0;">Mata Pelajaran</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0; font-weight: bold;">${assessment.mataPelajaran}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Hari / Tanggal</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.hariTanggal || '-'}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Pukul</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.pukul || '07.30 - 09.00 WIB'}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Waktu</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.waktuMenit} Menit</td>
                </tr>
              </table>
            </td>
            <!-- Kolom Kanan -->
            <td style="vertical-align: top; border: none; padding: 0 0 0 12pt; word-wrap: break-word; overflow-wrap: break-word;">
              <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none;">
                <col style="width: 75px;" />
                <col style="width: 15px;" />
                <col style="width: auto;" />
                <tr>
                  <td style="border: none; padding: 5px 0;">Nama</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;"><div style="border-bottom: 1pt dotted #000; width: 95%; height: 13pt;"></div></td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Kelas</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0; font-weight: bold;">${assessment.kelas} (${assessment.fase})</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Nomor</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;"><div style="border-bottom: 1pt dotted #000; width: 95%; height: 13pt;"></div></td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Nilai</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;"><div style="border-bottom: 1pt dotted #000; width: 95%; height: 13pt;"></div></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Garis Pembatas Identitas -->
        <div style="border-bottom: 0.75pt solid #000000; margin-bottom: 8pt;"></div>

        <!-- Kalimat Pengantar / Petunjuk Umum -->
        <div style="font-weight: bold; font-style: italic; margin-bottom: 10pt; font-size: 11pt; word-wrap: break-word; overflow-wrap: break-word;">
          ${assessment.petunjukUmum || 'Jawab dan jelaskan Soal berikut dengan tepat dan jelas!'}
        </div>

        <!-- Daftar Butir Soal -->
        <div style="margin-bottom: 14pt;">
          ${questionsHtml}
        </div>

        <!-- Area Lembar Jawaban Siswa -->
        <div style="margin-top: 14pt;">
          <div style="font-weight: bold; font-size: 11pt; margin-bottom: 4pt;">Jawab:</div>
          ${dottedLinesHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', documentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `LEMBAR_SOAL_ASTS_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}.doc`);
}

// 2. Export ASAS Lembar Soal (Pilihan Ganda) to Word (Standard F4 Document)
export async function exportASASSoalWord(assessment: Assessment, schoolInfo: SchoolInfo) {
  const logoProvBase64 = await getBase64ImageFromUrl(schoolInfo.logoProvinsiUrl);
  const logoSekolahBase64 = await getBase64ImageFromUrl(schoolInfo.logoSekolahUrl);

  const kopHtml = generateOfficialKopHTML(schoolInfo, logoProvBase64, logoSekolahBase64);

  // Generate MCQ Questions HTML
  let questionsHtml = '';
  assessment.mcqQuestions.forEach((q) => {
    let optionsHtml = '';
    const opts = ['A', 'B', 'C', 'D', 'E'];
    opts.forEach((optKey) => {
      const optVal = (q.pilihan as any)[optKey];
      if (optVal) {
        optionsHtml += `
          <div style="margin-left: 20px; margin-bottom: 2pt; line-height: 1.15;">
            <strong>${optKey}.</strong> ${optVal}
          </div>
        `;
      }
    });

    questionsHtml += `
      <div style="margin-bottom: 8pt; text-align: justify; line-height: 1.15;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 25px; vertical-align: top; border: none; padding: 0 4px 0 0;">${q.nomor}.</td>
            <td style="vertical-align: top; text-align: justify; border: none; padding: 0;">${formatTextForWord(q.soal)}</td>
          </tr>
        </table>
        <div style="margin-top: 2pt;">
          ${optionsHtml}
        </div>
      </div>
    `;
  });

  // Generate Answer Key Table (Appendix)
  let keyRows = '';
  const half = Math.ceil(assessment.mcqQuestions.length / 2);
  for (let i = 0; i < half; i++) {
    const q1 = assessment.mcqQuestions[i];
    const q2 = assessment.mcqQuestions[i + half];
    keyRows += `
      <tr>
        <td style="border: 1pt solid #000; padding: 3px 8px; text-align: center;">${q1 ? q1.nomor : ''}</td>
        <td style="border: 1pt solid #000; padding: 3px 8px; text-align: center; font-weight: bold;">${q1 ? q1.kunci : ''}</td>
        <td style="border: 1pt solid #000; padding: 3px 8px; text-align: center;">${q2 ? q2.nomor : ''}</td>
        <td style="border: 1pt solid #000; padding: 3px 8px; text-align: center; font-weight: bold;">${q2 ? q2.kunci : ''}</td>
      </tr>
    `;
  }

  const documentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Naskah Soal ${assessment.jenis} - ${assessment.mataPelajaran}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.59cm 33.02cm; /* Standar F4 / Folio Indonesia */
          margin: 2cm 2cm 2cm 2.5cm; /* Atas: 2cm, Kanan: 2cm, Bawah: 2cm, Kiri: 2.5cm */
          mso-page-orientation: portrait;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
        }
        div.Section1 {
          page: Section1;
          max-width: 17.09cm;
          width: 100%;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.15;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000000;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
        }
        table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        td, th {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${kopHtml}

        <!-- Judul Soal -->
        <div style="text-align: center; margin-bottom: 12pt; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
            ${(assessment.judul || `SOAL ASESMEN SUMATIF AKHIR SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()}`).replace(/^(LEMBAR\s+SOAL\s+DAN\s+LEMBAR\s+JAWABAN|LEMBAR\s+SOAL)\s*/i, '').trim() || `SOAL ASESMEN SUMATIF AKHIR SEMESTER (${assessment.jenis}) ${assessment.semester.toUpperCase()}`}
          </div>
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.2;">
            TAHUN PELAJARAN ${assessment.tahunAjaran}
          </div>
        </div>

        <!-- Tabel Identitas Ujian & Siswa (2 Kolom Sejajar) -->
        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none; margin-bottom: 10pt; font-size: 11pt;">
          <col style="width: 50%;" />
          <col style="width: 50%;" />
          <tr>
            <td style="vertical-align: top; border: none; padding: 0 12pt 0 0; word-wrap: break-word; overflow-wrap: break-word;">
              <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none;">
                <col style="width: 115px;" />
                <col style="width: 15px;" />
                <col style="width: auto;" />
                <tr>
                  <td style="border: none; padding: 5px 0;">Mata Pelajaran</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0; font-weight: bold;">${assessment.mataPelajaran}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Kelas</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.kelas} (${assessment.fase})</td>
                </tr>
              </table>
            </td>
            <td style="vertical-align: top; border: none; padding: 0 0 0 12pt; word-wrap: break-word; overflow-wrap: break-word;">
              <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none;">
                <col style="width: 105px;" />
                <col style="width: 15px;" />
                <col style="width: auto;" />
                <tr>
                  <td style="border: none; padding: 5px 0;">Hari / Tanggal</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.hariTanggal || 'Senin, 18 Mei 2026'}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 5px 0;">Waktu</td>
                  <td style="border: none; padding: 5px 0;">:</td>
                  <td style="border: none; padding: 5px 0;">${assessment.pukul || '07.30 – 08.30 WIB'} (${assessment.waktuMenit} Menit)</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Garis Pembatas Identitas -->
        <div style="border-bottom: 0.75pt solid #000000; margin-bottom: 8pt;"></div>

        <!-- Petunjuk Umum & Khusus -->
        <div style="margin-bottom: 10pt; font-size: 10pt; line-height: 1.2; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-weight: bold; margin-bottom: 2pt;">Petunjuk Umum:</div>
          <div style="margin-left: 12pt; margin-bottom: 4pt;">
            1. Tuliskan nama dan nomor tes anda pada lembar jawaban yang tersedia.<br/>
            2. Kerjakan soal yang dianggap mudah terlebih dahulu.<br/>
            3. Laporkan pada pengawas jika terdapat tulisan yang kurang jelas atau rusak.<br/>
            4. Periksalah lembar jawaban sebelum diserahkan kepada pengawas.
          </div>
          <div style="font-weight: bold; margin-bottom: 2pt;">Petunjuk Khusus:</div>
          <div style="margin-left: 12pt;">
            1. Pilihlah salah satu jawaban yang paling tepat pada salah satu huruf A, B, C, D atau E di lembar jawaban.<br/>
            2. Untuk membetulkan jawaban, hapuslah jawaban kemudian pilihlah jawaban yang benar.
          </div>
        </div>

        <div style="border-bottom: 0.5pt solid #000000; margin-bottom: 10pt;"></div>

        <!-- Daftar Butir Soal Pilihan Ganda -->
        <div>
          ${questionsHtml}
        </div>

        <!-- Halaman Lampiran Kunci Jawaban -->
        <br clear="all" style="page-break-before:always" />
        <div style="text-align: center; margin-bottom: 16pt; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">KUNCI JAWABAN RESMI</div>
          <div style="font-size: 12pt; font-weight: bold;">${assessment.mataPelajaran} - Kelas ${assessment.kelas} (${assessment.fase})</div>
        </div>

        <table style="width: 320px; max-width: 100%; margin: 0 auto; table-layout: fixed; border-collapse: collapse; border: 1pt solid #000; font-size: 11pt;">
          <col style="width: 45px;" />
          <col style="width: 115px;" />
          <col style="width: 45px;" />
          <col style="width: 115px;" />
          <thead>
            <tr style="background-color: #e2e8f0;">
              <th style="border: 1pt solid #000; padding: 4px; text-align: center;">No</th>
              <th style="border: 1pt solid #000; padding: 4px; text-align: center;">Kunci</th>
              <th style="border: 1pt solid #000; padding: 4px; text-align: center;">No</th>
              <th style="border: 1pt solid #000; padding: 4px; text-align: center;">Kunci</th>
            </tr>
          </thead>
          <tbody>
            ${keyRows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', documentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `LEMBAR_SOAL_ASAS_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}.doc`);
}

// 3. Export Nilai Raport STS / SAS ke Microsoft Word (Standar F4 Indonesia)
export async function exportRaportToWord(
  assessment: Assessment,
  schoolInfo: SchoolInfo,
  allStudentsInClass: Student[],
  selectedClassOnly?: string
) {
  // Determine strictly 1 selected class name for title, header, and filename
  const cleanCanonical = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetClass = (selectedClassOnly && selectedClassOnly !== 'ALL')
    ? selectedClassOnly.trim()
    : (allStudentsInClass[0]?.kelas || assessment.kelas.split(/[,;\/]/)[0] || assessment.kelas).trim();

  // Strictly filter students to ONLY this 1 selected class
  const filteredStudents = allStudentsInClass.filter(
    (std) => !targetClass || isClassMatch(targetClass, std.kelas) || cleanCanonical(std.kelas) === cleanCanonical(targetClass)
  );
  const studentsToRender = filteredStudents.length > 0 ? filteredStudents : allStudentsInClass;

  let tableRowsHtml = '';
  studentsToRender.forEach((std, idx) => {
    const sub = assessment.submissions.find(
      (s) => s.studentId === std.id || s.studentName === std.nama || cleanCanonical(s.studentName) === cleanCanonical(std.nama)
    );
    const ck = sub
      ? sanitizeCapaianKompetensi(sub.capaianKompetensi, std.nama, sub.tuntas, assessment.mataPelajaran, sub.nilaiAkhir)
      : generateBloomDeepLearningCK(0, assessment.kktp || 75, assessment.mataPelajaran);

    tableRowsHtml += `
      <tr>
        <td style="border: 1pt solid #000; padding: 4px; text-align: center; word-wrap: break-word; overflow-wrap: break-word;">${idx + 1}</td>
        <td style="border: 1pt solid #000; padding: 4px 6px; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">${std.nama}</td>
        <td style="border: 1pt solid #000; padding: 4px; text-align: center; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">${sub ? sub.nilaiAkhir : 0}</td>
        <td style="border: 1pt solid #000; padding: 4px 6px; word-wrap: break-word; overflow-wrap: break-word;">${ck}</td>
      </tr>
    `;
  });

  const documentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Nilai Raport ${assessment.jenis} - ${assessment.mataPelajaran}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.59cm 33.02cm; /* Standar F4 / Folio Indonesia */
          margin: 2cm 2cm 2cm 2.5cm; /* Atas: 2cm, Kanan: 2cm, Bawah: 2cm, Kiri: 2.5cm */
          mso-page-orientation: portrait;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
        }
        div.Section1 {
          page: Section1;
          max-width: 17.09cm;
          width: 100%;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.15;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000000;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
        }
        table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        td, th {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <div style="text-align: center; margin-bottom: 12pt; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">
            NILAI RAPORT ${assessment.jenis} KELAS ${targetClass}
          </div>
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">
            SEMESTER ${getSemesterNumber(targetClass, assessment.semester)} (${assessment.semester.toUpperCase()}) TAHUN AJARAN ${assessment.tahunAjaran}
          </div>
        </div>

        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none; margin-bottom: 8pt; font-size: 11pt;">
          <col style="width: 80px;" />
          <col style="width: 15px;" />
          <col style="width: auto;" />
          <col style="width: 120px;" />
          <tr>
            <td style="border: none; padding: 2px 0;">KELAS</td>
            <td style="border: none; padding: 2px 0;">:</td>
            <td style="border: none; padding: 2px 0; font-weight: bold;">${targetClass}</td>
            <td style="text-align: right; border: none; padding: 2px 0; font-weight: bold;">FASE ${assessment.fase.replace('Fase ', '')}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px 0;">MAPEL</td>
            <td style="border: none; padding: 2px 0;">:</td>
            <td style="border: none; padding: 2px 0; font-weight: bold;" colspan="2">${assessment.mataPelajaran}</td>
          </tr>
        </table>

        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1pt solid #000; font-size: 10pt; margin-bottom: 16pt;">
          <col style="width: 8%;" />
          <col style="width: 32%;" />
          <col style="width: 14%;" />
          <col style="width: 46%;" />
          <thead>
            <tr style="background-color: #e5e7eb; color: #000000; font-weight: bold;">
              <th style="border: 1pt solid #000; padding: 5px; text-align: center;">NO</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: left;">NAMA</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: center;">NILAI AKHIR</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: left;">CAPAIAN KOMPETENSI</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- Tanda Tangan Guru -->
        <table style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: none; font-size: 11pt; margin-top: 20pt;">
          <col style="width: 60%;" />
          <col style="width: 40%;" />
          <tr>
            <td style="border: none;"></td>
            <td style="text-align: left; border: none;">
              <div>Tumijajar, ${getCorrectionDateFormatted(assessment.submissions)}</div>
              <div style="margin-top: 2px;">Guru Mapel,</div>
              <div style="margin-top: 55px; font-weight: bold; text-decoration: underline;">${formatAcademicTitles(assessment.guruPengampu || 'Guru Mata Pelajaran')}</div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', documentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const safeClassWord = targetClass.replace(/[\s\/\\]+/g, '_');
  const safeMapelWord = assessment.mataPelajaran.replace(/[\s\/\\]+/g, '_');
  triggerDownload(blob, `NILAI_RAPORT_${assessment.jenis}_KELAS_${safeClassWord}_${safeMapelWord}_TA_${assessment.tahunAjaran.replace(/\//g, '-')}.doc`);
}

// 4. Export Authentic Proof (Cetak Bukti Otentik) Word Document
export async function exportAuthenticProofWord(
  submission: Submission,
  assessment: Assessment,
  student?: Student,
  schoolInfo?: SchoolInfo
) {
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

  const logoProvBase64 = await getBase64ImageFromUrl(school.logoProvinsiUrl);
  const logoSekolahBase64 = await getBase64ImageFromUrl(school.logoSekolahUrl);

  const kopHtml = generateOfficialKopHTML(school, logoProvBase64, logoSekolahBase64);

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

  const qrPayload = buildVerificationURL(submission, assessment, student, school);

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 });
  } catch (err) {
    console.error('Failed to generate QR code for Word:', err);
  }

  let rubricRowsHtml = '';
  if (Array.isArray(submission.itemScores) && submission.itemScores.length > 0) {
    submission.itemScores.forEach((itm, idx) => {
      const rubricItem = assessment.essayRubrik?.find((r) => r.nomor === itm.nomor);
      const maxScore = rubricItem ? rubricItem.skorMaks : 10;
      rubricRowsHtml += `
        <tr>
          <td style="border: 1pt solid #000; padding: 5px; text-align: center; font-weight: bold;">${itm.nomor || idx + 1}</td>
          <td style="border: 1pt solid #000; padding: 5px; text-align: left;">
            <div><strong>"${itm.jawabanSiswa || '(Kosong)'}"</strong></div>
            ${rubricItem ? `<div style="font-size: 8.5pt; color: #555; margin-top: 2px;">Soal: ${rubricItem.soal}</div>` : ''}
          </td>
          <td style="border: 1pt solid #000; padding: 5px; text-align: left; font-size: 9.5pt;">${itm.feedback || 'Evaluasi sesuai rubrik ketuntasan kompetensi.'}</td>
          <td style="border: 1pt solid #000; padding: 5px; text-align: center; font-weight: bold;">${itm.skor} / ${maxScore}</td>
        </tr>
      `;
    });
  }

  const documentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Bukti Otentik Penilaian Hasil Asesmen</title>
      <style>
        @page Section1 {
          size: 215.9mm 330.2mm; /* Standard F4 */
          margin: 15mm 15mm 15mm 18mm;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000000;
          background-color: #ffffff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Times New Roman', Times, serif;
          font-size: 10.5pt;
        }
        td, th {
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${kopHtml}

        <div style="text-align: center; margin-bottom: 12pt;">
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">
            BUKTI OTENTIK PENILAIAN HASIL ASESMEN & DRAF KOREKSI
          </div>
          <div style="font-size: 9.5pt; margin-top: 2px;">
            Nomor Registrasi Verifikasi Dokumen: <strong>${authCode}</strong> (${authStatus.isDraft ? 'DRAF TERSIMPAN' : 'TERVERIFIKASI RESMI'})
          </div>
        </div>

        <table style="width: 100%; border: none; margin-bottom: 12pt; font-size: 10pt;">
          <col style="width: 20%;" />
          <col style="width: 30%;" />
          <col style="width: 20%;" />
          <col style="width: 30%;" />
          <tr>
            <td style="font-weight: bold;">Nama Peserta Didik</td>
            <td>: ${studentName}</td>
            <td style="font-weight: bold;">Mata Pelajaran</td>
            <td>: ${assessment.mataPelajaran}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">NISN / No. Induk</td>
            <td>: ${studentNisn}</td>
            <td style="font-weight: bold;">Guru Pengampu</td>
            <td>: ${formatAcademicTitles(guruName)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Kelas / Fase</td>
            <td>: ${studentClass} (${assessment.fase})</td>
            <td style="font-weight: bold;">Waktu Koreksi</td>
            <td>: ${submission.waktuKoreksi || 'Tercatat di Sistem'} WIB</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">No. Absen / Urut</td>
            <td>: ${submission.noUrut || student?.noUrut || '-'}</td>
            <td style="font-weight: bold;">KKTP Minimal</td>
            <td>: ${assessment.kktp || 75} Poin</td>
          </tr>
        </table>

        <table style="width: 100%; border: 1pt solid #000; margin-bottom: 12pt; text-align: center; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <th style="border: 1pt solid #000; padding: 5px;">NILAI AKHIR RAPOR</th>
              <th style="border: 1pt solid #000; padding: 5px;">NILAI MURNI SISWA</th>
              <th style="border: 1pt solid #000; padding: 5px;">KETUNTASAN KKTP</th>
              <th style="border: 1pt solid #000; padding: 5px;">DETEKSI INTEGRITAS AI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1pt solid #000; padding: 6px; font-weight: bold; font-size: 12pt;">${submission.nilaiAkhir}</td>
              <td style="border: 1pt solid #000; padding: 6px; font-weight: bold; font-size: 12pt; color: #3730a3;">${submission.nilaiMurni ?? submission.nilaiAkhir}</td>
              <td style="border: 1pt solid #000; padding: 6px;">${kktpInfo.subLabel}</td>
              <td style="border: 1pt solid #000; padding: 6px;">${submission.aiDetected ? `AI (${submission.aiPenaltyPercent || 0}% Penalti)` : '100% Tulisan Tangan'}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 12pt; padding: 8px; background-color: #ecfdf5; border: 1pt solid #a7f3d0; font-size: 9.5pt; text-align: justify;">
          <strong>Pernyataan Keabsahan & Validasi Lembar Jawaban Siswa:</strong><br/>
          Jawaban siswa dinyatakan sah setelah dilakukan pengecekan dan verifikasi secara mendalam meliputi struktur huruf, kata, kalimat, serta penyesuaian yang presisi dengan kunci jawaban dan rubrik penilaian yang berlaku.
        </div>

        ${rubricRowsHtml ? `
        <div style="font-weight: bold; margin-bottom: 4pt; font-size: 10.5pt;">RINCIAN PENILAIAN BUTIR PER BUTIR SOAL:</div>
        <table style="width: 100%; border: 1pt solid #000; margin-bottom: 12pt; font-size: 9.5pt;">
          <col style="width: 8%;" />
          <col style="width: 40%;" />
          <col style="width: 40%;" />
          <col style="width: 12%;" />
          <thead>
            <tr style="background-color: #e5e7eb; font-weight: bold;">
              <th style="border: 1pt solid #000; padding: 5px; text-align: center;">NO</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: left;">JAWABAN SISWA</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: left;">RUBRIK & ULASAN PEDAGOGIS</th>
              <th style="border: 1pt solid #000; padding: 5px; text-align: center;">SKOR</th>
            </tr>
          </thead>
          <tbody>
            ${rubricRowsHtml}
          </tbody>
        </table>
        ` : ''}

        <div style="margin-bottom: 14pt; padding: 8px; background-color: #eef2ff; border: 1pt solid #c7d2fe; font-size: 10pt; text-align: justify;">
          <strong>Deskripsi Capaian Kompetensi (Rapor Resmi):</strong><br/>
          ${submission.capaianKompetensi || 'Telah mengikuti asesmen dan menunjukkan pemahaman materi sesuai kriteria.'}
        </div>

        <div style="margin-top: 18pt; border-top: 1.5pt solid #000; padding-top: 10pt;">
          <table style="width: 100%; border: none; font-size: 9.5pt;">
            <tr>
              <td style="width: 44%; vertical-align: top; border: none; padding-right: 12px;">
                <table style="border: none;">
                  <tr>
                    <td style="vertical-align: top; border: none; padding-right: 8px;">
                      ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" width="76" height="76" style="border: 1pt solid #000; padding: 2px; background: #fff;" alt="QR Code Verifikasi" />` : ''}
                    </td>
                    <td style="vertical-align: top; border: none; font-family: 'Times New Roman', serif; font-size: 8pt; line-height: 1.25; color: #333;">
                      <strong style="display: block; font-size: 9pt; color: #000; margin-bottom: 2px;">Verifikasi Sah SiMantri</strong>
                      <span>Sistem Informasi Akademik SMAN 3 Tumijajar</span><br/>
                      <span style="color: #555;">Dokumen ini merupakan bukti otentik penilaian resmi berbasis AI & validasi guru. Pindai kode QR dengan kamera ponsel untuk memeriksa data asli apa adanya.</span><br/>
                      <span style="font-family: monospace; font-size: 7.5pt; color: #444; font-weight: bold; margin-top: 3px; display: block;">ID: ${authCode}</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="width: 28%; text-align: center; vertical-align: top; border: none;">
                <div>Mengetahui,</div>
                <div style="font-weight: bold;">Kepala Sekolah</div>
                <div style="height: 48px;"></div>
                <div style="font-weight: bold; text-decoration: underline;">${formatAcademicTitles(school?.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.')}</div>
                <div style="font-size: 8.5pt;">NIP. ${school?.nipKepalaSekolah || '19720512 199802 1 002'}</div>
              </td>
              <td style="width: 28%; text-align: center; vertical-align: top; border: none;">
                <div>Tumijajar, ${formatIndonesianDate(submission.waktuKoreksi)}</div>
                <div style="font-weight: bold;">Guru Mata Pelajaran</div>
                <div style="height: 48px;"></div>
                <div style="font-weight: bold; text-decoration: underline;">${formatAcademicTitles(guruName)}</div>
                <div style="font-size: 8.5pt;">NIP. ${formatGuruNip(assessment.guruId)}</div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', documentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const cleanStd = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMapel = assessment.mataPelajaran.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanClass = (studentClass || 'KELAS').replace(/[^a-zA-Z0-9]/g, '_');
  triggerDownload(blob, `BUKTI_OTENTIK_KELAS_${cleanClass}_${cleanStd}_${cleanMapel}.doc`);
}

