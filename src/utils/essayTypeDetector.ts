// Intelligent Open-Ended (Essay Terbuka) vs Closed-Ended (Essay Tertutup) Detector & Flexible Grading Engine

export type EssayType = 'TERBUKA' | 'TERTUTUP';

export interface EssayFlexibilityAnalysis {
  type: EssayType;
  typeLabel: string;
  typeBadgeClass: string;
  typeDescription: string;
  extractedKeywords: string[];
  toleranceLevel: 'Tinggi (Sangat Fleksibel)' | 'Sedang (Toleransi Kata Kunci)' | 'Presisi Konsep';
  suggestedVariations: string[];
  aiGradingInstruction: string;
}

/**
 * Detects whether an essay question is Open-Ended (Essay Terbuka) or Closed-Ended (Essay Tertutup)
 * based on question stem patterns, rubric complexity, and linguistic indicators.
 */
export function detectEssayType(questionText: string, rubricKeyText: string): EssayType {
  const qClean = (questionText || '').toLowerCase();
  const kClean = (rubricKeyText || '').toLowerCase();

  // Strong linguistic triggers for Open-Ended Questions (Essay Terbuka)
  const openEndedTriggers = [
    'jelaskan',
    'analisis',
    'uraikan',
    'mengapa',
    'bagaimana',
    'berikan contoh',
    'pendapat',
    'argumen',
    'kemukakan',
    'jabarkan',
    'bandingkan',
    'dampaknya',
    'solusi',
    'menurut',
    'mengapa demikian',
    'alasan',
    'hubungan antara',
    'kesimpulan',
    'makna dari',
    'evaluasi',
    'tanggapan',
  ];

  // Strong linguistic triggers for Closed-Ended Questions (Essay Tertutup)
  const closedEndedTriggers = [
    'berapakah',
    'hitunglah',
    'sebutkan rumus',
    'siapakah',
    'kapan',
    'tanggal berapa',
    'apa nama',
    'dimanakah',
    'sebutkan 3',
    'sebutkan 2',
    'singkatan dari',
    'rumus kimia',
  ];

  let openScore = 0;
  let closedScore = 0;

  openEndedTriggers.forEach((trig) => {
    if (qClean.includes(trig)) openScore += 2;
  });

  closedEndedTriggers.forEach((trig) => {
    if (qClean.includes(trig)) closedScore += 2;
  });

  // Length and structure analysis of the rubric key
  const words = kClean.split(/\s+/).filter((w: string) => w.length > 2);
  if (words.length > 12) openScore += 2;
  if (words.length > 25) openScore += 3;
  if (kClean.includes('contoh:') || kClean.includes('seperti:') || kClean.includes('misalnya:')) openScore += 2;

  if (openScore >= closedScore) {
    return 'TERBUKA';
  }
  return 'TERTUTUP';
}

/**
 * Generates comprehensive flexibility analysis, key concept extraction, and AI grading instructions
 * to ensure student answers in ASTS are evaluated fairly without rigid text matching.
 */
export function analyzeEssayFlexibility(
  questionText: string,
  rubricKeyText: string,
  maxScore: number = 10
): EssayFlexibilityAnalysis {
  const type = detectEssayType(questionText, rubricKeyText);

  // Extract core keywords (nouns, verbs, key technical terms)
  const cleanWords = (rubricKeyText || '')
    .replace(/[^\w\s-]/gi, ' ')
    .split(/\s+/)
    .filter((w: string) => w.length > 3)
    .map((w: string) => w.toLowerCase());

  // Deduplicate and filter out common Indonesian stopwords
  const stopWords = new Set([
    'adalah', 'yang', 'dengan', 'untuk', 'pada', 'dalam', 'secara', 'serta', 'atau', 'dapat',
    'akan', 'dari', 'oleh', 'karena', 'sehingga', 'sebagai', 'maka', 'harus', 'yaitu', 'yakni'
  ]);

  const uniqueKeywords: string[] = [];
  cleanWords.forEach((word) => {
    if (!stopWords.has(word) && !uniqueKeywords.includes(word) && uniqueKeywords.length < 8) {
      uniqueKeywords.push(word);
    }
  });

  if (type === 'TERBUKA') {
    return {
      type: 'TERBUKA',
      typeLabel: 'Essay Terbuka (Toleransi & Penalaran Fleksibel)',
      typeBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      typeDescription:
        'Soal membutuhkan penjelasan, analisis, atau contoh. Jawaban siswa TIDAK wajib persis seperti kunci jawaban. Berikan kelonggaran jika siswa menyampaikan kata kunci utama, penalaran logis, atau contoh konkret pribadi.',
      extractedKeywords: uniqueKeywords,
      toleranceLevel: 'Tinggi (Sangat Fleksibel)',
      suggestedVariations: [
        'Jawaban dengan struktur kalimat pribadi siswa',
        'Jawaban yang menyebutkan kata kunci utama saja',
        'Jawaban yang disertai contoh nyata kehidupan sehari-hari',
        'Penjelasan dengan sinonim atau frasa setara',
      ],
      aiGradingInstruction: `PERHATIAN KOREKSI ASTS (SOAL ESSAY TERBUKA): Soal nomor ini adalah Essay Terbuka yang menguji penalaran dan pemahaman konsep. JANGAN kaku mencocokkan kata per kata dengan kunci jawaban. Berikan skor proporsional dan kelonggaran toleransi jika siswa: (1) Menuliskan kata kunci utama (${uniqueKeywords.join(', ')}), (2) Memberikan contoh konkret setara, atau (3) Menjelaskan dengan tata bahasa mereka sendiri. Berikan skor parsial yang adil (tidak pelit nilai) sesuai bobot pemahaman siswa.`,
    };
  }

  return {
    type: 'TERTUTUP',
    typeLabel: 'Essay Tertutup (Presisi Konsep)',
    typeBadgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    typeDescription:
      'Soal meminta fakta, istilah, atau rumus spesifik. Tetap berikan toleransi jika terdapat variasi ejaan tipis atau penyebutan istilah resmi.',
    extractedKeywords: uniqueKeywords,
    toleranceLevel: 'Sedang (Toleransi Kata Kunci)',
    suggestedVariations: [
      'Penyebutan istilah resmi atau sinonim baku',
      'Toleransi ejaan/typo ringan yang tidak mengubah makna dasar',
    ],
    aiGradingInstruction: `PERHATIAN KOREKSI ASTS (SOAL ESSAY TERTUTUP): Evaluasi presisi istilah atau konsep utama (${uniqueKeywords.join(', ')}). Tetap toleransi ejaan/typo ringan jika maksud dan konsep dasarnya benar.`,
  };
}

export interface TeacherNotesGenerationResult {
  essayType: 'TERBUKA' | 'TERTUTUP';
  catatanKhususGuru: string;
  toleransiJawaban: string;
  variasiJawabanDiterima: string[];
}

/**
 * Generates specific teacher notes, tolerance parameters, and acceptable variations
 * matching open-ended or closed-ended essay questions for automated grading and teacher rubric preview.
 */
export function generateTeacherNotesAndTolerance(
  questionText: string,
  rubricKeyText: string,
  maxScore: number = 10
): TeacherNotesGenerationResult {
  const analysis = analyzeEssayFlexibility(questionText, rubricKeyText, maxScore);

  if (analysis.type === 'TERBUKA') {
    const keywordsStr = analysis.extractedKeywords.length > 0 ? analysis.extractedKeywords.join(', ') : 'konsep utama';
    const notes = `[TOLERANSI ESSAY TERBUKA]: Soal ini berupa Essay Terbuka yang menguji pemahaman dan penalaran. Berikan kelonggaran penuh/parsial apabila siswa menjawab menggunakan variasi kalimat pribadi, menganalisis dengan analogi/contoh nyata, atau menyebutkan kata kunci utama (${keywordsStr}).`;
    const tolerance = `Toleransi kata kunci (${keywordsStr}), frasa sinonim, susunan kalimat buatan siswa, serta contoh penerapan relevan.`;
    const variations = [
      `Penjelasan dengan susunan kalimat pribadi siswa yang memuat kata kunci (${keywordsStr})`,
      'Penyebutan contoh nyata atau analogi konseptual yang relevan',
      'Jawaban yang menguraikan dampak atau alasan logis',
    ];

    return {
      essayType: 'TERBUKA',
      catatanKhususGuru: notes,
      toleransiJawaban: tolerance,
      variasiJawabanDiterima: variations,
    };
  } else {
    const keywordsStr = analysis.extractedKeywords.length > 0 ? analysis.extractedKeywords.join(', ') : 'istilah spesifik';
    const notes = `[TOLERANSI ESSAY TERTUTUP]: Soal ini berupa Essay Tertutup yang menguji fakta, rumus, atau istilah spesifik (${keywordsStr}). Tetap berikan nilai jika istilah/konsep dasar tepat, meskipun terdapat typo ringan/variasi ejaan.`;
    const tolerance = `Berfokus pada presisi istilah/rumus (${keywordsStr}). Toleransi ejaan/typo ringan atau penulisan istilah resmi sinonim.`;
    const variations = [
      `Penyebutan istilah resmi atau rumus (${keywordsStr})`,
      'Toleransi ejaan/typo ringan yang tidak merubah definisi dasar',
    ];

    return {
      essayType: 'TERTUTUP',
      catatanKhususGuru: notes,
      toleransiJawaban: tolerance,
      variasiJawabanDiterima: variations,
    };
  }
}

