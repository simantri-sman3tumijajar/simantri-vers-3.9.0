import { Assessment } from '../types';

export function cleanFormulaString(text: string): string {
  if (!text) return '';
  return text
    // Replace double dollar LaTeX blocks
    .replace(/\$\$(.*?)\$\$/g, '$1')
    // Replace single dollar LaTeX blocks
    .replace(/\$(.*?)\$/g, '$1')
    // Replace specific LaTeX command artifacts
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\delta/g, 'δ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\ge/g, '≥')
    .replace(/\\le/g, '≤')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/r_{11}/g, 'r₁₁')
    .replace(/r_11/g, 'r₁₁')
    .replace(/\\bar{x}/g, 'x̄')
    .replace(/\\sigma\^2/g, 'σ²')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\sqrt/g, '√')
    // Strip other backslashes
    .replace(/\\/g, '');
}

export interface OptionDistribution {
  option: string;
  count: number;
  percentage: number;
  upperCount: number;
  lowerCount: number;
  isKey: boolean;
  isEffectiveDistractor: boolean;
}

export interface ItemAnalysisData {
  itemNumber: number;
  questionType: 'MCQ' | 'Essay';
  questionText?: string;
  answerKey?: string;
  maxScore: number;
  totalStudents: number;
  correctCount: number; // For MCQ or full credit count
  avgScore?: number;
  difficultyIndex: number; // p value: 0.0 to 1.0
  difficultyCategory: 'Sangat Mudah' | 'Mudah' | 'Sedang' | 'Sukar' | 'Sangat Sukar';
  discriminationIndex: number; // d value: -1.0 to +1.0
  discriminationCategory: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek / Dibuang';
  upperGroupCorrectPct: number;
  lowerGroupCorrectPct: number;
  distractors?: OptionDistribution[];
  recommendation: 'Soal Ideal (Simpan)' | 'Perlu Direvisi' | 'Dibuang / Diganti';
  recommendationNotes: string;
}

export interface AssessmentItemAnalysisSummary {
  assessmentId: string;
  assessmentTitle: string;
  mataPelajaran: string;
  kelas: string;
  jenis: Assessment['jenis'];
  totalSubmissions: number;
  avgDifficulty: number;
  avgDiscrimination: number;
  countIdeal: number;
  countRevise: number;
  countDiscard: number;
  items: ItemAnalysisData[];
}

export function calculateItemAnalysis(assessment: Assessment): AssessmentItemAnalysisSummary {
  const submissions = (assessment.submissions || []).filter(
    (sub) => sub.statusKoreksi && (sub.statusKoreksi.startsWith('Sudah Dikoreksi') || sub.statusKoreksi.startsWith('Sudah Diverifikasi'))
  );
  const totalSubmissions = submissions.length;
  const isASTS = assessment.jenis === 'ASTS';
  const totalQuestions = isASTS
    ? assessment.essayRubrik?.length || 10
    : assessment.mcqQuestions?.length || 50;

  if (totalSubmissions === 0) {
    // Generate placeholder items if no submissions exist yet
    const items: ItemAnalysisData[] = Array.from({ length: totalQuestions }, (_, idx) => {
      const num = idx + 1;
      const essayItem = isASTS ? assessment.essayRubrik?.find((r) => r.nomor === num) : null;
      const mcqItem = !isASTS ? assessment.mcqQuestions?.find((q) => q.nomor === num) : null;

      return {
        itemNumber: num,
        questionType: isASTS ? 'Essay' : 'MCQ',
        questionText: cleanFormulaString(essayItem?.soal || mcqItem?.soal || `Butir Soal Nomor ${num}`),
        answerKey: cleanFormulaString(essayItem?.kunciJawaban || mcqItem?.kunci || '-'),
        maxScore: isASTS ? (essayItem?.skorMaks || 10) : (mcqItem?.skor || 1),
        totalStudents: 0,
        correctCount: 0,
        avgScore: 0,
        difficultyIndex: 0.5,
        difficultyCategory: 'Sedang',
        discriminationIndex: 0.35,
        discriminationCategory: 'Baik',
        upperGroupCorrectPct: 0.6,
        lowerGroupCorrectPct: 0.25,
        distractors: !isASTS ? ['A', 'B', 'C', 'D', 'E'].map((opt) => ({
          option: opt,
          count: 0,
          percentage: 0,
          upperCount: 0,
          lowerCount: 0,
          isKey: opt === (mcqItem?.kunci || 'A'),
          isEffectiveDistractor: opt !== (mcqItem?.kunci || 'A'),
        })) : undefined,
        recommendation: 'Soal Ideal (Simpan)',
        recommendationNotes: 'Belum ada data koreksi siswa. Butir soal siap diujikan.',
      };
    });

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.judul,
      mataPelajaran: assessment.mataPelajaran,
      kelas: assessment.kelas,
      jenis: assessment.jenis,
      totalSubmissions: 0,
      avgDifficulty: 0.5,
      avgDiscrimination: 0.35,
      countIdeal: totalQuestions,
      countRevise: 0,
      countDiscard: 0,
      items,
    };
  }

  // 1. Calculate student total scores and sort descending
  const studentScores = submissions.map((sub) => {
    return {
      submission: sub,
      totalScore: sub.nilaiAkhir || 0,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  // 2. Determine Upper Group (Kelompok Atas - 27%) and Lower Group (Kelompok Bawah - 27%)
  const groupSize = Math.max(1, Math.round(totalSubmissions * 0.27));
  const upperGroup = studentScores.slice(0, groupSize);
  const lowerGroup = studentScores.slice(Math.max(0, totalSubmissions - groupSize));

  const items: ItemAnalysisData[] = [];

  for (let num = 1; num <= totalQuestions; num++) {
    let difficultyIndex = 0;
    let upperGroupCorrectPct = 0;
    let lowerGroupCorrectPct = 0;
    let correctCount = 0;
    let avgScore = 0;

    const essayItem = isASTS ? assessment.essayRubrik?.find((r) => r.nomor === num) : null;
    const mcqItem = !isASTS ? assessment.mcqQuestions?.find((q) => q.nomor === num) : null;
    const maxScore = isASTS ? (essayItem?.skorMaks || 10) : (mcqItem?.skor || 1);
    const keyAnswer = (isASTS ? essayItem?.kunciJawaban : mcqItem?.kunci) || '-';

    let distractors: OptionDistribution[] | undefined = undefined;

    if (!isASTS) {
      // Multiple Choice (ASAS)
      const optionCounts: Record<string, { total: number; upper: number; lower: number }> = {
        A: { total: 0, upper: 0, lower: 0 },
        B: { total: 0, upper: 0, lower: 0 },
        C: { total: 0, upper: 0, lower: 0 },
        D: { total: 0, upper: 0, lower: 0 },
        E: { total: 0, upper: 0, lower: 0 },
      };

      submissions.forEach((sub) => {
        const check = sub.studentAnswers?.find((a) => a.nomor === num);
        if (check) {
          const ans = (check.jawabanSiswa || '').trim().toUpperCase();
          if (optionCounts[ans]) {
            optionCounts[ans].total++;
          }
          if (check.benar || ans === (mcqItem?.kunci || '').toUpperCase()) {
            correctCount++;
          }
        }
      });

      // Upper group counts
      let upperCorrect = 0;
      upperGroup.forEach((item) => {
        const check = item.submission.studentAnswers?.find((a) => a.nomor === num);
        if (check) {
          const ans = (check.jawabanSiswa || '').trim().toUpperCase();
          if (optionCounts[ans]) optionCounts[ans].upper++;
          if (check.benar || ans === (mcqItem?.kunci || '').toUpperCase()) upperCorrect++;
        }
      });
      upperGroupCorrectPct = upperGroup.length > 0 ? upperCorrect / upperGroup.length : 0;

      // Lower group counts
      let lowerCorrect = 0;
      lowerGroup.forEach((item) => {
        const check = item.submission.studentAnswers?.find((a) => a.nomor === num);
        if (check) {
          const ans = (check.jawabanSiswa || '').trim().toUpperCase();
          if (optionCounts[ans]) optionCounts[ans].lower++;
          if (check.benar || ans === (mcqItem?.kunci || '').toUpperCase()) lowerCorrect++;
        }
      });
      lowerGroupCorrectPct = lowerGroup.length > 0 ? lowerCorrect / lowerGroup.length : 0;

      difficultyIndex = totalSubmissions > 0 ? correctCount / totalSubmissions : 0;

      // Build distractor analysis
      const officialKey = (mcqItem?.kunci || 'A').toUpperCase();
      distractors = ['A', 'B', 'C', 'D', 'E'].map((opt) => {
        const cnt = optionCounts[opt]?.total || 0;
        const up = optionCounts[opt]?.upper || 0;
        const low = optionCounts[opt]?.lower || 0;
        const pct = totalSubmissions > 0 ? (cnt / totalSubmissions) * 100 : 0;
        const isKey = opt === officialKey;
        // Pengecoh efektif jika bukan kunci, dipilih minimal 5% peserta, dan dipilih lebih banyak oleh kelompok bawah
        const isEffective = !isKey && pct >= 5 && low >= up;

        return {
          option: opt,
          count: cnt,
          percentage: Math.round(pct * 10) / 10,
          upperCount: up,
          lowerCount: low,
          isKey,
          isEffectiveDistractor: isEffective,
        };
      });
    } else {
      // Essay (ASTS)
      let sumScore = 0;
      submissions.forEach((sub) => {
        const itemScore = sub.itemScores?.find((s) => s.nomor === num);
        if (itemScore) {
          sumScore += itemScore.skor;
          if (itemScore.skor >= maxScore * 0.75) {
            correctCount++;
          }
        }
      });

      avgScore = totalSubmissions > 0 ? Math.round((sumScore / totalSubmissions) * 10) / 10 : 0;
      difficultyIndex = totalSubmissions > 0 ? sumScore / (totalSubmissions * maxScore) : 0;

      // Upper group sum score
      let upperSum = 0;
      upperGroup.forEach((item) => {
        const check = item.submission.itemScores?.find((s) => s.nomor === num);
        if (check) upperSum += check.skor;
      });
      upperGroupCorrectPct = upperGroup.length > 0 ? upperSum / (upperGroup.length * maxScore) : 0;

      // Lower group sum score
      let lowerSum = 0;
      lowerGroup.forEach((item) => {
        const check = item.submission.itemScores?.find((s) => s.nomor === num);
        if (check) lowerSum += check.skor;
      });
      lowerGroupCorrectPct = lowerGroup.length > 0 ? lowerSum / (lowerGroup.length * maxScore) : 0;
    }

    // Clamp difficulty between 0 and 1
    difficultyIndex = Math.min(1, Math.max(0, difficultyIndex));

    // Discrimination Index d = Upper % - Lower %
    let discriminationIndex = upperGroupCorrectPct - lowerGroupCorrectPct;
    discriminationIndex = Math.min(1, Math.max(-1, discriminationIndex));

    // Determine Difficulty Category (Standard Evaluasi Pendidikan Nasional)
    let difficultyCategory: ItemAnalysisData['difficultyCategory'] = 'Sedang';
    if (difficultyIndex > 0.85) difficultyCategory = 'Sangat Mudah';
    else if (difficultyIndex > 0.70) difficultyCategory = 'Mudah';
    else if (difficultyIndex >= 0.30) difficultyCategory = 'Sedang';
    else if (difficultyIndex >= 0.15) difficultyCategory = 'Sukar';
    else difficultyCategory = 'Sangat Sukar';

    // Determine Discrimination Category
    let discriminationCategory: ItemAnalysisData['discriminationCategory'] = 'Baik';
    if (discriminationIndex >= 0.40) discriminationCategory = 'Sangat Baik';
    else if (discriminationIndex >= 0.30) discriminationCategory = 'Baik';
    else if (discriminationIndex >= 0.20) discriminationCategory = 'Cukup';
    else discriminationCategory = 'Jelek / Dibuang';

    // Recommendation & Actionable Note
    let recommendation: ItemAnalysisData['recommendation'] = 'Soal Ideal (Simpan)';
    let recommendationNotes = 'Soal memiliki daya pembeda baik dan tingkat kesukaran proporsional. Layak disimpan ke bank soal resmi.';

    if (discriminationIndex < 0.20) {
      recommendation = 'Dibuang / Diganti';
      recommendationNotes = 'Daya pembeda rendah/negatif (kelompok bawah lebih mampu menjawab dibanding kelompok atas). Soal berpotensi ambigu/salah kunci dan harus diganti.';
    } else if (difficultyIndex < 0.20) {
      recommendation = 'Perlu Direvisi';
      recommendationNotes = 'Soal terlalu sukar (hampir semua siswa gagal menjawab). Perlu ditinjau kejelasan stimulus narasi atau kompleksitas soal.';
    } else if (difficultyIndex > 0.80) {
      recommendation = 'Perlu Direvisi';
      recommendationNotes = 'Soal terlalu mudah (hampir semua siswa benar). Perlu ditingkatkan kedalaman stimulus atau distractor pengecoh.';
    } else if (discriminationIndex < 0.30) {
      recommendation = 'Perlu Direvisi';
      recommendationNotes = 'Daya pembeda cukup (0.20 - 0.29). Soal perlu sedikit penyempurnaan pada opsi pengecoh atau rubrik penilaian.';
    }

    items.push({
      itemNumber: num,
      questionType: isASTS ? 'Essay' : 'MCQ',
      questionText: cleanFormulaString(essayItem?.soal || mcqItem?.soal || `Butir Soal Nomor ${num}`),
      answerKey: cleanFormulaString(keyAnswer),
      maxScore,
      totalStudents: totalSubmissions,
      correctCount,
      avgScore,
      difficultyIndex,
      difficultyCategory,
      discriminationIndex,
      discriminationCategory,
      upperGroupCorrectPct,
      lowerGroupCorrectPct,
      distractors,
      recommendation,
      recommendationNotes: cleanFormulaString(recommendationNotes),
    });
  }

  const avgDifficulty = items.reduce((acc, curr) => acc + curr.difficultyIndex, 0) / items.length;
  const avgDiscrimination = items.reduce((acc, curr) => acc + curr.discriminationIndex, 0) / items.length;

  const countIdeal = items.filter((i) => i.recommendation === 'Soal Ideal (Simpan)').length;
  const countRevise = items.filter((i) => i.recommendation === 'Perlu Direvisi').length;
  const countDiscard = items.filter((i) => i.recommendation === 'Dibuang / Diganti').length;

  return {
    assessmentId: assessment.id,
    assessmentTitle: assessment.judul,
    mataPelajaran: assessment.mataPelajaran,
    kelas: assessment.kelas,
    jenis: assessment.jenis,
    totalSubmissions,
    avgDifficulty,
    avgDiscrimination,
    countIdeal,
    countRevise,
    countDiscard,
    items,
  };
}
