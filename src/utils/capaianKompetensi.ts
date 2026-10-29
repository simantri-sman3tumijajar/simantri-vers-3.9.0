/**
 * Utilitas Standardisasi Capaian Kompetensi (CK) Raport
 * Berdasarkan Kaidah Taksonomi Bloom & Prinsip Pembelajaran Mendalam (Deep Learning)
 * 
 * Aturan Mutlak:
 * 1. Dilarang mencantumkan nama siswa dalam kalimat CK.
 * 2. Wajib menggunakan subjek formal "Peserta didik".
 * 3. Menggunakan Kata Kerja Operasional (KKO) Taksonomi Bloom (C1-C6).
 * 4. Berorientasi pada penalaran kritis, pemahaman konseptual mendalam, dan bimbingan reflektif.
 */

/**
 * Utilitas Standardisasi Capaian Kompetensi (CK) Raport
 * Berdasarkan Panduan Resmi Rentang KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)
 * Sesuai Diagram Standar:
 * - 0 - 60   : "Peserta didik kurang mampu ..........................."
 * - 61 - 70  : "Peserta didik cukup mampu ..........................."
 * - 71 - 80  : "Peserta didik mampu ..........................."
 * - 81 - 100 : "Peserta didik sangat mampu ..........................."
 * 
 * Aturan Mutlak:
 * 1. Dilarang mencantumkan nama siswa dalam kalimat CK.
 * 2. Wajib menggunakan formula awalan resmi di atas sesuai perolehan nilai KKTP siswa.
 * 3. Menggunakan Kata Kerja Operasional (KKO) Taksonomi Bloom & Pembelajaran Mendalam (Deep Learning).
 */

import { getKKTPPrefix } from './kktpHelper';

export { getKKTPPrefix };

/**
 * Mengharmonisasikan isi kelanjutan Capaian Kompetensi agar memenuhi kaidah
 * tata bahasa baku Bahasa Indonesia, Taksonomi Bloom (C1-C6), dan Pembelajaran Mendalam (Deep Learning).
 *
 * Mencegah susunan kalimat rancu dan tidak rapi seperti:
 * - "Peserta didik kurang mampu masih memerlukan..."
 * - "Peserta didik mampu pemahaman konseptual..."
 * - "Peserta didik cukup mampu masih memerlukan..."
 * - "Peserta didik mampu dalam memahami..."
 */
export function harmonizeCKContent(
  rawContent: string,
  targetPrefix: string,
  score: number,
  mapel?: string
): string {
  const cleanMapel = mapel ? mapel.trim() : 'materi asesmen';
  let content = rawContent.trim();

  // 1. Bersihkan tanda baca liar di awal kalimat (koma, titik dua, tanda hubung)
  content = content.replace(/^[,;:\-–—\s]+/, '').trim();

  // 2. Bersihkan variasi subjek dan sebutan siswa yang berulang
  content = content.replace(/^(peserta didik|siswa ini|siswi ini|siswa|siswi|ananda|murid)\s*/gi, '').trim();
  content = content.replace(/^[,;:\-–—\s]+/, '').trim();

  // 3. Bersihkan awalan predikat lama yang berulang
  content = content.replace(
    /^(sangat mampu|cukup mampu|kurang mampu|belum mampu|tidak mampu|mampu|telah|sudah|dapat|bisa|menunjukkan)\s*/gi,
    ''
  ).trim();
  content = content.replace(/^[,;:\-–—\s]+/, '').trim();

  // Jika setelah dibersihkan teks terlalu pendek atau kosong, gunakan narasi baku Bloom Deep Learning
  if (content.length < 5) {
    return generateBloomDeepLearningCK(score, 75, mapel);
  }

  // KASUS 1: Frasa Kebutuhan Bantuan ("masih memerlukan...", "memerlukan...", "butuh...", "perlu...")
  if (/^(masih\s+memerlukan|memerlukan|butuh|perlu|masih\s+perlu|masih\s+butuh)\b/i.test(content)) {
    const detail = content
      .replace(/^(masih\s+memerlukan|memerlukan|butuh|perlu|masih\s+perlu|masih\s+butuh)\s*/i, '')
      .replace(/^[,;:\-–—\s]+/, '')
      .trim();

    if (score <= 60) {
      // 0 - 60: Kurang Mampu
      const cleanDetail = detail || 'bimbingan intensif dan program remedial terstruktur';
      return `${targetPrefix} memahami konsep dasar materi ${cleanMapel}, serta masih memerlukan ${cleanDetail}.`;
    } else if (score <= 70) {
      // 61 - 70: Cukup Mampu
      const cleanDetail = detail || 'penguatan terarah dalam menyelesaikan penalaran mendalam dan prosedur pemecahan masalah';
      return `${targetPrefix} memahami konsep dasar materi ${cleanMapel}, namun masih memerlukan ${cleanDetail}.`;
    } else if (score <= 80) {
      // 71 - 80: Mampu
      return `${targetPrefix} memahami dan mengaplikasikan materi ${cleanMapel} secara mandiri dan tepat sesuai tujuan pembelajaran.`;
    } else {
      // 81 - 100: Sangat Mampu
      return `${targetPrefix} menganalisis, mengevaluasi, dan menguasai materi ${cleanMapel} dengan penalaran kritis tinggi secara komprehensif.`;
    }
  }

  // KASUS 2: Bentuk Frasa Kata Benda ("pemahaman konseptual...", "pemahaman konsep...", "pemahaman...")
  if (/^pemahaman\s+konseptual\b/i.test(content)) {
    const detail = content
      .replace(/^pemahaman\s+konseptual\s*/i, '')
      .replace(/^(dalam|pada|terhadap|mengenai)\s*/i, '')
      .trim();
    const topic = detail ? `materi ${detail}` : `materi ${cleanMapel}`;

    if (score >= 81) {
      return `${targetPrefix} menguasai pemahaman konseptual mendalam dan merekonstruksi penyelesaian masalah ${topic} dengan penalaran kritis tinggi.`;
    } else if (score >= 71) {
      return `${targetPrefix} memahami secara konseptual dan mengaplikasikan ${topic} secara mandiri dan tepat.`;
    } else if (score >= 61) {
      return `${targetPrefix} memahami konsep dasar ${topic}, namun masih memerlukan penguatan dalam penalaran mendalam.`;
    } else {
      return `${targetPrefix} memahami konsep dasar ${topic}, serta memerlukan pendampingan intensif untuk menumbuhkan pemahaman konseptual yang bermakna.`;
    }
  }

  if (/^pemahaman\b/i.test(content)) {
    const detail = content
      .replace(/^pemahaman\s*/i, '')
      .replace(/^(dalam|pada|terhadap|mengenai|tentang)\s*/i, '')
      .trim();
    const topic = detail ? `konsep ${detail}` : `konsep ${cleanMapel}`;

    if (score >= 81) {
      return `${targetPrefix} menguasai dan menganalisis ${topic} secara mendalam dengan penalaran kritis tinggi.`;
    } else if (score >= 71) {
      return `${targetPrefix} memahami dan mengaplikasikan ${topic} secara mandiri dan tepat sesuai tujuan pembelajaran.`;
    } else if (score >= 61) {
      return `${targetPrefix} memahami dasar ${topic}, namun masih memerlukan penguatan terarah dalam menyelesaikan penalaran lanjutan.`;
    } else {
      return `${targetPrefix} memahami dasar ${topic}, serta memerlukan bimbingan intensif dan program remedial terstruktur.`;
    }
  }

  // KASUS 3: Bentuk Kata Benda Penguasaan ("penguasaan materi...", "penguasaan konsep...")
  if (/^penguasaan\b/i.test(content)) {
    const detail = content
      .replace(/^penguasaan\s*/i, '')
      .replace(/^(terhadap|pada|dalam|mengenai)\s*/i, '')
      .trim();
    const topic = detail ? `materi ${detail}` : `materi ${cleanMapel}`;

    if (score >= 81) {
      return `${targetPrefix} menunjukkan penguasaan mendalam terhadap ${topic} serta mampu memecahkan masalah kompleks secara komprehensif.`;
    } else if (score >= 71) {
      return `${targetPrefix} menguasai dan menerapkan ${topic} secara mandiri dan konsisten.`;
    } else if (score >= 61) {
      return `${targetPrefix} menguasai konsep dasar ${topic}, namun masih memerlukan penguatan terarah.`;
    } else {
      return `${targetPrefix} mencapai ketuntasan penguasaan ${topic}, serta memerlukan pendampingan remedial khusus.`;
    }
  }

  // KASUS 4: Diawali Preposisi ("dalam...", "pada...", "mengenai...", "terhadap...")
  if (/^(dalam|pada|mengenai|terhadap)\b/i.test(content)) {
    const detail = content.replace(/^(dalam|pada|mengenai|terhadap)\s*/i, '').trim();

    if (score >= 81) {
      return `${targetPrefix} menganalisis dan menguasai konsep dalam ${detail} dengan penalaran kritis tingkat tinggi.`;
    } else if (score >= 71) {
      return `${targetPrefix} memahami dan mengaplikasikan konsep dalam ${detail} secara mandiri.`;
    } else if (score >= 61) {
      return `${targetPrefix} memahami konsep dasar dalam ${detail}, namun masih memerlukan penguatan terarah.`;
    } else {
      return `${targetPrefix} mencapai ketuntasan konsep dalam ${detail}, serta memerlukan bimbingan terstruktur.`;
    }
  }

  // KASUS 5: Jika diawali kata kerja (KKO Bloom: menganalisis, memahami, menyelesaikan, dll.)
  let firstWord = content.charAt(0).toLowerCase() + content.slice(1);

  // Jika skor kurang (0-60), dan belum memiliki rincian bantuan, lengkapi agar edukatif
  if (score <= 60 && !/(serta|dan|namun)\s+(masih\s+)?(memerlukan|perlu|butuh)/i.test(firstWord)) {
    if (!/(memerlukan|bimbingan|remedial|pendampingan|intervensi)/i.test(firstWord)) {
      firstWord = `${firstWord}, serta masih memerlukan bimbingan intensif dan program remedial terstruktur`;
    }
  }

  // Jika skor cukup (61-70), rapikan konjungsi penghubung
  if (score >= 61 && score <= 70) {
    firstWord = firstWord.replace(/,\s*masih memerlukan/i, ', namun masih memerlukan');
    firstWord = firstWord.replace(/dan masih memerlukan/i, 'namun masih memerlukan');
  }

  return `${targetPrefix} ${firstWord}`.trim();
}

export function sanitizeCapaianKompetensi(
  rawText: string | undefined | null,
  studentName?: string,
  isTuntas?: boolean,
  mapel?: string,
  nilai?: number
): string {
  const defaultScore = typeof nilai === 'number' ? nilai : (isTuntas ? 85 : 55);

  // Jika teks kosong, titik-titik placeholder, atau tidak valid -> buatkan otomatis sesuai rentang KKTP
  if (
    !rawText ||
    typeof rawText !== 'string' ||
    rawText.trim() === '' ||
    rawText.includes('…..') ||
    rawText.includes('.....')
  ) {
    return generateBloomDeepLearningCK(defaultScore, 75, mapel);
  }

  let text = rawText.trim();

  // 1. Bersihkan seluruh variasi penyebutan nama siswa
  if (studentName && typeof studentName === 'string') {
    const cleanStudentName = studentName.trim();
    if (cleanStudentName.length > 0) {
      const escapedFull = cleanStudentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(escapedFull, 'gi'), 'peserta didik');

      const nameParts = cleanStudentName.split(/\s+/).filter((p) => p.length > 2);
      nameParts.forEach((part) => {
        const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), 'peserta didik');
      });
    }
  }

  // 2. Normalisasi sebutan Ananda/Siswa/Murid menjadi "peserta didik"
  text = text.replace(/\b(ananda|siswa ini|siswi ini|siswa|siswi|murid)\b/gi, 'peserta didik');

  // 3. Selaraskan formula awalan dengan kaidah resmi rentang nilai KKTP:
  // 0 - 60  : "Peserta didik kurang mampu"
  // 61 - 70 : "Peserta didik cukup mampu"
  // 71 - 80 : "Peserta didik mampu"
  // 81 - 100: "Peserta didik sangat mampu"
  const currentScore = typeof nilai === 'number' ? Math.max(0, Math.min(100, Math.round(nilai))) : defaultScore;
  const targetPrefix = getKKTPPrefix(currentScore);

  // Bersihkan awalan lama dari text
  const stripped = text
    .replace(/^peserta didik\s+/i, '')
    .replace(
      /^(sangat mampu|cukup mampu|kurang mampu|belum mampu|tidak mampu|mampu|telah|menunjukkan|mulai berkembang|dapat)\s*/i,
      ''
    )
    .replace(/^peserta didik\s+/i, '')
    .trim();

  // Harmonisasikan teks kelanjutan agar menghasilkan kalimat baku, rapi, dan akademis
  text = harmonizeCKContent(stripped, targetPrefix, currentScore, mapel);

  // 4. Bersihkan duplikasi kata yang berulang
  text = text.replace(/peserta didik(\s+peserta didik)+/gi, 'peserta didik');
  text = text.replace(/\s{2,}/g, ' ').trim();

  // 5. Pastikan huruf pertama kapital dan diakhiri tanda titik tunggal
  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/[.,\s]+$/, '');
  text += '.';

  return text;
}

export function generateBloomDeepLearningCK(
  nilai: number,
  kktp: number = 75,
  mapel?: string
): string {
  const cleanMapel = mapel ? `pada materi ${mapel}` : 'materi asesmen';
  const score = Math.max(0, Math.min(100, Math.round(Number(nilai) || 0)));

  if (score >= 81) {
    // 81 - 100: Sangat Baik (Mahir / Melampaui Ketuntasan) -> "Peserta didik sangat mampu"
    return `Peserta didik sangat mampu menganalisis, mengevaluasi, dan menguasai konsep ${cleanMapel} dengan penalaran kritis tinggi serta merekonstruksi pemecahan masalah secara komprehensif.`;
  } else if (score >= 71) {
    // 71 - 80: Baik (Mencapai Ketuntasan Mandiri) -> "Peserta didik mampu"
    return `Peserta didik mampu memahami dan mengaplikasikan konsep ${cleanMapel} secara mandiri, tepat, dan berkesadaran sesuai tujuan pembelajaran.`;
  } else if (score >= 61) {
    // 61 - 70: Cukup (Mulai Berkembang / Perlu Penguatan) -> "Peserta didik cukup mampu"
    return `Peserta didik cukup mampu memahami konsep dasar ${cleanMapel}, namun masih memerlukan penguatan terarah dalam menyelesaikan penalaran mendalam dan prosedur pemecahan masalah.`;
  } else {
    // 0 - 60: Kurang (Perlu Bimbingan / Intervensi Khusus) -> "Peserta didik kurang mampu"
    return `Peserta didik kurang mampu memahami konsep dasar ${cleanMapel}, memerlukan pendampingan intensif dan program remedial terstruktur guna menumbuhkan daya nalar yang bermakna.`;
  }
}

/**
 * Merumuskan alasan/justifikasi pemberian skor yang akademis & akurat secara otomatis
 * setiap kali guru mengubah skor atau mengedit manual jawaban siswa.
 */
export function generateDynamicReasoning(
  nomor: number,
  skor: number,
  skorMaks: number,
  jawabanSiswa?: string,
  kunciAtauRubrik?: string,
  catatanGuru?: string
): string {
  const ratio = skorMaks > 0 ? skor / skorMaks : 0;
  const hasText = !!(jawabanSiswa && jawabanSiswa.trim().length > 0);
  const cleanExcerpt = hasText
    ? (jawabanSiswa!.trim().length > 35 ? `"${jawabanSiswa!.trim().substring(0, 32)}..."` : `"${jawabanSiswa!.trim()}"`)
    : '';

  const teacherNoteSuffix = catatanGuru && catatanGuru.trim().length > 0
    ? ` (Pedoman guru: ${catatanGuru.trim().length > 40 ? catatanGuru.trim().substring(0, 38) + '...' : catatanGuru.trim()})`
    : '';

  if (ratio >= 1) {
    return (hasText
      ? `Jawaban sangat komprehensif (${cleanExcerpt}), seluruh konsep utama diuraikan secara tepat dan logis, serta memenuhi kriteria maksimal rubrik asesmen`
      : `Jawaban tepat dan sempurna memenuhi seluruh indikator capaian rubrik penilaian`) + teacherNoteSuffix + '.';
  } else if (ratio >= 0.75) {
    return (hasText
      ? `Jawaban telah mencakup sebagian besar konsep kunci (${cleanExcerpt}) dengan penalaran baik, namun rincian elaborasi atau pembuktian konseptual masih dapat diperdalam`
      : `Jawaban telah mencakup sebagian besar konsep kunci sesuai rubrik asesmen dengan argumentasi yang baik`) + teacherNoteSuffix + '.';
  } else if (ratio >= 0.5) {
    return (hasText
      ? `Jawaban telah menyentuh konsep dasar (${cleanExcerpt}), namun uraian analisis, formulasi prosedur, atau kesimpulan belum lengkap sesuai rubrik`
      : `Jawaban memenuhi sebagian kriteria indikator konsep dasar pada rubrik asesmen`) + teacherNoteSuffix + '.';
  } else if (ratio > 0) {
    return (hasText
      ? `Jawaban berupaya merespons pertanyaan (${cleanExcerpt}), namun pemahaman konsep masih terbatas sehingga diberikan skor sebagian atas upaya penyelesaian`
      : `Diberikan skor sebagian atas upaya penyelesaian konsep dasar`) + teacherNoteSuffix + '.';
  } else {
    return (hasText
      ? `Jawaban yang diberikan (${cleanExcerpt}) belum sesuai dengan konsep dan indikator penilaian pada rubrik asesmen`
      : `Belum ada jawaban yang relevan atau sesuai dengan kunci rubrik penilaian`) + teacherNoteSuffix + '.';
  }
}
