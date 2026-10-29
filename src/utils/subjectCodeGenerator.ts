/**
 * Auto-Generates standardized subject code based on Subject Name.
 * Example:
 * - "Pendidikan Antikorupsi" -> "PAK"
 * - "Pendidikan Jasmani, Olahraga, dan Kesehatan" -> "PJOK"
 * - "Matematika" -> "MTK"
 * - "Informatika" -> "INF"
 * - "Fisika" -> "FIS"
 * - "Kimia" -> "KIM"
 */
export const generateSubjectCode = (name: string, fase?: string): string => {
  if (!name || !name.trim()) return '';

  const cleanName = name.trim().toLowerCase();
  let code = '';

  // Standard Indonesian High School Subject Abbreviations
  if (cleanName.includes('antikorupsi') || cleanName.includes('anti korupsi')) {
    code = 'PAK';
  } else if (cleanName.includes('jasmani') || cleanName.includes('pjok') || cleanName.includes('penjas')) {
    code = 'PJOK';
  } else if (cleanName.includes('agama islam') || cleanName.includes('paibp') || cleanName.includes('pendidikan agama')) {
    code = 'PAIBP';
  } else if (cleanName.includes('pancasila') || cleanName.includes('ppkn') || cleanName.includes('kewarganegaraan')) {
    code = 'PPKN';
  } else if (cleanName.includes('bahasa indonesia')) {
    code = 'BIND';
  } else if (cleanName.includes('bahasa inggris')) {
    code = 'BING';
  } else if (cleanName.includes('bahasa lampung') || cleanName.includes('muatan lokal')) {
    code = 'BLMP';
  } else if (cleanName.includes('matematika tingkat lanjut') || cleanName.includes('matematika lanjut')) {
    code = 'MTKL';
  } else if (cleanName.includes('matematika')) {
    code = 'MTK';
  } else if (cleanName.includes('informatika') || cleanName.includes('komputer') || cleanName.includes('tik')) {
    code = 'INF';
  } else if (cleanName.includes('fisika')) {
    code = 'FIS';
  } else if (cleanName.includes('kimia')) {
    code = 'KIM';
  } else if (cleanName.includes('biologi')) {
    code = 'BIO';
  } else if (cleanName.includes('ekonomi')) {
    code = 'EKO';
  } else if (cleanName.includes('geografi')) {
    code = 'GEO';
  } else if (cleanName.includes('sosiologi')) {
    code = 'SOS';
  } else if (cleanName.includes('sejarah indonesia') || cleanName.includes('sejarah')) {
    code = 'SEJ';
  } else if (cleanName.includes('seni budaya') || cleanName.includes('seni rupa') || cleanName.includes('seni musik')) {
    code = 'SBD';
  } else if (cleanName.includes('prakarya') || cleanName.includes('pkwu') || cleanName.includes('kewirausahaan')) {
    code = 'PKWU';
  } else if (cleanName.includes('bimbingan') || cleanName.includes('konseling') || cleanName.includes('bk')) {
    code = 'BK';
  } else {
    // Dynamic fallback acronym generator
    const words = cleanName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => !['dan', 'yang', 'untuk', 'pada', 'di', 'ke', 'tingkat'].includes(w));

    if (words.length === 1) {
      code = words[0].substring(0, 4).toUpperCase();
    } else {
      code = words.map((w) => w[0]).join('').substring(0, 5).toUpperCase();
    }
  }

  if (fase && (fase.includes('E') || fase.includes('F'))) {
    const suffix = fase.toLowerCase().includes('f') ? '-F' : '-E';
    return `${code}${suffix}`;
  }

  return code;
};
