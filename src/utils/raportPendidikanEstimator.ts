import { LitNumRecord, RaporPendidikanDoc } from '../types';

export interface CohortLevelStat {
  tingkat: string; // 'Kelas X (Fase E)' | 'Kelas XI (Fase F)' | 'Kelas XII (Fase F)'
  totalStudents: number;
  totalLitTests: number;
  avgLitScore: number;
  totalNumTests: number;
  avgNumScore: number;
  litCompetenceRate: number; // % Mahir + Cakap (>=65)
  numCompetenceRate: number; // % Mahir + Cakap (>=65)
}

export interface ScenarioSimulationResult {
  scenarioName: string;
  description: string;
  projectedLitCompetencePercent: number;
  projectedLitScore: number;
  projectedNumCompetencePercent: number;
  projectedNumScore: number;
}

export interface RaporPendidikanEstimation2026 {
  schoolName: string;
  npsn: string;
  baselineYear: number;
  hasRealBaseline: boolean;

  // Baseline Data (from uploaded official Kemendikdasmen RAPOR-PBD Excel)
  baselineLitScore: number;
  baselineLitCompetencePercent: number; // Mahir + Cakap %
  baselineLitBand: string;
  baselineLitMahirPercent: number;
  baselineLitCakapPercent: number;
  baselineLitDasarPercent: number;
  baselineLitIntervensiPercent: number;

  baselineNumScore: number;
  baselineNumCompetencePercent: number; // Mahir + Cakap %
  baselineNumBand: string;
  baselineNumMahirPercent: number;
  baselineNumCakapPercent: number;
  baselineNumDasarPercent: number;
  baselineNumIntervensiPercent: number;

  // Real-time Student Testing Statistics (Empiris apa adanya dari CBT & Google Form)
  totalStudentsEvaluated: number;
  totalTestsEvaluated: number;
  totalLitTests: number;
  totalNumTests: number;
  avgStudentLitScore: number;
  avgStudentNumScore: number;
  litPassingRatePercent: number; // % siswa mencapai batas kompetensi (>= 65)
  numPassingRatePercent: number; // % siswa mencapai batas kompetensi (>= 65)
  liveLitMahirPercent: number;
  liveLitCakapPercent: number;
  liveLitDasarPercent: number;
  liveLitIntervensiPercent: number;
  liveNumMahirPercent: number;
  liveNumCakapPercent: number;
  liveNumDasarPercent: number;
  liveNumIntervensiPercent: number;

  // Cohort level breakdowns (Fase E & Fase F)
  cohortBreakdowns: CohortLevelStat[];

  // 2026 Projected Estimations (Internal Predictive School Simulation)
  literasiProjectedCompetencePercent: number; // % Siswa Mencapai Batas Minimum 2026 (Mahir + Cakap)
  literasiProjectedScore: number; // Indeks Nilai 0-100
  literasiProjectedBand: string;
  literasiMahirPercent: number;
  literasiCakapPercent: number;
  literasiDasarPercent: number;
  literasiIntervensiPercent: number;
  literasiGrowthDelta: number; // e.g. +4.2%

  numerasiProjectedCompetencePercent: number; // % Siswa Mencapai Batas Minimum 2026 (Mahir + Cakap)
  numerasiProjectedScore: number; // Indeks Nilai 0-100
  numerasiProjectedBand: string;
  numerasiMahirPercent: number;
  numerasiCakapPercent: number;
  numerasiDasarPercent: number;
  numerasiIntervensiPercent: number;
  numerasiGrowthDelta: number; // e.g. +5.1%

  // Simulation Scenarios (What-if strategic projections)
  scenarios: ScenarioSimulationResult[];

  spmStatusLiterasi: 'Tuntas / Sangat Baik' | 'Tercapai Penuh' | 'Mendekati Tercapai' | 'Perlu Intervensi';
  spmStatusNumerasi: 'Tuntas / Sangat Baik' | 'Tercapai Penuh' | 'Mendekati Tercapai' | 'Perlu Intervensi';

  disclaimer: string;
}

/**
 * Calculates real-time empirical estimation for 2026 Kemendikdasmen Rapor Pendidikan
 * based on actual student tests (CBT & Google Form) and official uploaded RAPOR-PBD baseline.
 */
export function calculate2026RaporPendidikanEstimation(
  litnumRecords: LitNumRecord[] = [],
  raportDocs: RaporPendidikanDoc[] = []
): RaporPendidikanEstimation2026 {
  // Sort Rapor Docs by year descending to get the latest official baseline
  const latestBaselineDoc = raportDocs.length > 0
    ? [...raportDocs].sort((a, b) => b.tahun - a.tahun)[0]
    : null;

  const baselineYear = latestBaselineDoc ? latestBaselineDoc.tahun : 2024;
  const schoolName = latestBaselineDoc?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR';
  const npsn = latestBaselineDoc?.npsn || '10809544';

  const baseLitScore = latestBaselineDoc ? latestBaselineDoc.skorLiterasi : 70.0;
  const baseNumScore = latestBaselineDoc ? latestBaselineDoc.skorNumerasi : 68.5;

  const baseLitMahir = latestBaselineDoc?.literasiMahirPercent ?? 38.0;
  const baseLitCakap = latestBaselineDoc?.literasiCakapPercent ?? 46.0;
  const baseLitDasar = latestBaselineDoc?.literasiDasarPercent ?? 12.0;
  const baseLitIntervensi = latestBaselineDoc?.literasiPerluIntervensiPercent ?? 4.0;
  const baseLitCompetence = Math.round((baseLitMahir + baseLitCakap) * 10) / 10;

  const baseNumMahir = latestBaselineDoc?.numerasiMahirPercent ?? 34.0;
  const baseNumCakap = latestBaselineDoc?.numerasiCakapPercent ?? 48.0;
  const baseNumDasar = latestBaselineDoc?.numerasiDasarPercent ?? 14.0;
  const baseNumIntervensi = latestBaselineDoc?.numerasiPerluIntervensiPercent ?? 4.0;
  const baseNumCompetence = Math.round((baseNumMahir + baseNumCakap) * 10) / 10;

  // Filter LitNum records for Literasi and Numerasi - ONLY FINALIZED SCORES
  // Records with status === 'draft' (e.g. newly submitted by students awaiting review) are strictly excluded!
  const eligibleRecords = litnumRecords.filter(
    (r) => r.status === 'final' || (!r.status && r.source !== 'live_test')
  );
  const litRecords = eligibleRecords.filter((r) => r.type === 'literasi');
  const numRecords = eligibleRecords.filter((r) => r.type === 'numerasi');

  // Real-time student performance calculation
  const totalLitScores = litRecords.reduce((acc, r) => acc + r.score, 0);
  const avgLitStudentScore = litRecords.length > 0
    ? Math.round((totalLitScores / litRecords.length) * 10) / 10
    : baseLitScore;

  const totalNumScores = numRecords.reduce((acc, r) => acc + r.score, 0);
  const avgNumStudentScore = numRecords.length > 0
    ? Math.round((totalNumScores / numRecords.length) * 10) / 10
    : baseNumScore;

  // Kemendikdasmen standard: KKTP >= 65 is competency threshold (Cakap & Mahir)
  const litPassingCount = litRecords.filter((r) => r.score >= 65).length;
  const litPassingRate = litRecords.length > 0
    ? Math.round((litPassingCount / litRecords.length) * 1000) / 10
    : baseLitCompetence;

  const numPassingCount = numRecords.filter((r) => r.score >= 65).length;
  const numPassingRate = numRecords.length > 0
    ? Math.round((numPassingCount / numRecords.length) * 1000) / 10
    : baseNumCompetence;

  // Empirical Distribution Calculations from Real-Time Records
  // Kemendikdasmen bands: Mahir (>=85), Cakap (65-84), Dasar (45-64), Perlu Intervensi (<45)
  const calcDistribution = (records: LitNumRecord[], baseM: number, baseC: number, baseD: number, baseI: number) => {
    if (records.length === 0) {
      return {
        mahir: baseM,
        cakap: baseC,
        dasar: baseD,
        intervensi: baseI,
        liveM: baseM,
        liveC: baseC,
        liveD: baseD,
        liveI: baseI
      };
    }
    const mCount = records.filter((r) => r.score >= 85).length;
    const cCount = records.filter((r) => r.score >= 65 && r.score < 85).length;
    const dCount = records.filter((r) => r.score >= 45 && r.score < 65).length;
    const iCount = records.filter((r) => r.score < 45).length;
    const n = records.length;

    const liveM = Math.round((mCount / n) * 1000) / 10;
    const liveC = Math.round((cCount / n) * 1000) / 10;
    const liveD = Math.round((dCount / n) * 1000) / 10;
    const liveI = Math.round((iCount / n) * 1000) / 10;

    // Blend: 55% baseline historical stability + 45% live empirical cohort progression
    let blendM = Math.round((baseM * 0.55 + liveM * 0.45) * 10) / 10;
    let blendC = Math.round((baseC * 0.55 + liveC * 0.45) * 10) / 10;
    let blendD = Math.round((baseD * 0.55 + liveD * 0.45) * 10) / 10;
    let blendI = Math.round((100 - (blendM + blendC + blendD)) * 10) / 10;

    if (blendI < 0) blendI = 0;

    return {
      mahir: Math.max(0, blendM),
      cakap: Math.max(0, blendC),
      dasar: Math.max(0, blendD),
      intervensi: Math.max(0, blendI),
      liveM,
      liveC,
      liveD,
      liveI
    };
  };

  const litDist = calcDistribution(litRecords, baseLitMahir, baseLitCakap, baseLitDasar, baseLitIntervensi);
  const numDist = calcDistribution(numRecords, baseNumMahir, baseNumCakap, baseNumDasar, baseNumIntervensi);

  // Projected 2026 Competency Percentages (% Mahir + Cakap)
  const litProjectedCompetence = Math.round((litDist.mahir + litDist.cakap) * 10) / 10;
  const numProjectedCompetence = Math.round((numDist.mahir + numDist.cakap) * 10) / 10;

  // Projected 2026 Composite Scores (0-100 index)
  const hasLiveLit = litRecords.length > 0;
  const hasLiveNum = numRecords.length > 0;

  const litProjectedScore = hasLiveLit
    ? Math.min(100, Math.round((baseLitScore * 0.55 + avgLitStudentScore * 0.45) * 10) / 10)
    : baseLitScore;

  const numProjectedScore = hasLiveNum
    ? Math.min(100, Math.round((baseNumScore * 0.55 + avgNumStudentScore * 0.45) * 10) / 10)
    : baseNumScore;

  // Growth Deltas vs Baseline
  const litGrowthDelta = Math.round((litProjectedCompetence - baseLitCompetence) * 10) / 10;
  const numGrowthDelta = Math.round((numProjectedCompetence - baseNumCompetence) * 10) / 10;

  // Performance band evaluator
  const getBand = (score: number) => {
    if (score >= 80) return 'Mencapai Batas Kompetensi Minimum (Sangat Baik / Mahir)';
    if (score >= 60) return 'Mencapai Batas Kompetensi Minimum (Baik / Cakap)';
    if (score >= 40) return 'Belum Mencapai Batas Minimum (Sedang / Dasar)';
    return 'Perlu Intervensi Khusus';
  };

  // Cohort level breakdowns (Kelas X / Fase E, Kelas XI / Fase F, Kelas XII / Fase F)
  const cohortBreakdowns: CohortLevelStat[] = [
    { tingkat: 'Kelas X (Fase E)', prefix: 'X' },
    { tingkat: 'Kelas XI (Fase F)', prefix: 'XI' },
    { tingkat: 'Kelas XII (Fase F)', prefix: 'XII' }
  ].map(({ tingkat, prefix }) => {
    const isMatchingClass = (cName: string) => {
      const up = (cName || '').toUpperCase().trim();
      if (prefix === 'X') return up.startsWith('X-') || up.startsWith('X ') || (up.startsWith('X') && !up.startsWith('XI') && !up.startsWith('XII'));
      if (prefix === 'XI') return up.startsWith('XI-') || up.startsWith('XI ') || (up.startsWith('XI') && !up.startsWith('XII'));
      return up.startsWith('XII-') || up.startsWith('XII ');
    };

    const cLit = litRecords.filter((r) => isMatchingClass(r.kelas));
    const cNum = numRecords.filter((r) => isMatchingClass(r.kelas));
    const uniqueStudents = new Set([...cLit, ...cNum].map((r) => r.studentId));

    const avgLit = cLit.length > 0
      ? Math.round((cLit.reduce((s, r) => s + r.score, 0) / cLit.length) * 10) / 10
      : avgLitStudentScore;

    const avgNum = cNum.length > 0
      ? Math.round((cNum.reduce((s, r) => s + r.score, 0) / cNum.length) * 10) / 10
      : avgNumStudentScore;

    const litComp = cLit.length > 0
      ? Math.round((cLit.filter((r) => r.score >= 65).length / cLit.length) * 1000) / 10
      : litPassingRate;

    const numComp = cNum.length > 0
      ? Math.round((cNum.filter((r) => r.score >= 65).length / cNum.length) * 1000) / 10
      : numPassingRate;

    return {
      tingkat,
      totalStudents: uniqueStudents.size,
      totalLitTests: cLit.length,
      avgLitScore: avgLit,
      totalNumTests: cNum.length,
      avgNumScore: avgNum,
      litCompetenceRate: litComp,
      numCompetenceRate: numComp
    };
  });

  // What-if Scenarios for School Planning
  const scenarios: ScenarioSimulationResult[] = [
    {
      scenarioName: '1. Skenario Tren Saat Ini (Status Quo Empiris)',
      description: 'Proyeksi berjalan normal mengikuti rata-rata pengerjaan real-time siswa saat ini tanpa intervensi tambahan.',
      projectedLitCompetencePercent: litProjectedCompetence,
      projectedLitScore: litProjectedScore,
      projectedNumCompetencePercent: numProjectedCompetence,
      projectedNumScore: numProjectedScore
    },
    {
      scenarioName: '2. Skenario Intervensi Terarah Klinik LitNum (+5%)',
      description: 'Pelaksanaan klinik remedial terjadwal dan pengayaan wacana berbasis konteks setiap Selasa & Rabu.',
      projectedLitCompetencePercent: Math.min(100, Math.round((litProjectedCompetence + 5.0) * 10) / 10),
      projectedLitScore: Math.min(100, Math.round((litProjectedScore + 3.8) * 10) / 10),
      projectedNumCompetencePercent: Math.min(100, Math.round((numProjectedCompetence + 5.0) * 10) / 10),
      projectedNumScore: Math.min(100, Math.round((numProjectedScore + 4.0) * 10) / 10)
    },
    {
      scenarioName: '3. Skenario Transformasi Deep Learning & Kombel (+10%)',
      description: 'Integrasi penuh siklus Meaningful & Joyful Learning, adopsi modul PMM secara terpadu, dan pelatihan kombel berkala.',
      projectedLitCompetencePercent: Math.min(100, Math.round((litProjectedCompetence + 10.0) * 10) / 10),
      projectedLitScore: Math.min(100, Math.round((litProjectedScore + 7.5) * 10) / 10),
      projectedNumCompetencePercent: Math.min(100, Math.round((numProjectedCompetence + 10.0) * 10) / 10),
      projectedNumScore: Math.min(100, Math.round((numProjectedScore + 7.8) * 10) / 10)
    }
  ];

  // Evaluate unique students evaluated
  const uniqueStudentsAll = new Set(litnumRecords.map((r) => r.studentId));

  const spmStatusLiterasi: 'Tuntas / Sangat Baik' | 'Tercapai Penuh' | 'Mendekati Tercapai' | 'Perlu Intervensi' =
    litProjectedCompetence >= 85
      ? 'Tuntas / Sangat Baik'
      : litProjectedCompetence >= 70
      ? 'Tercapai Penuh'
      : litProjectedCompetence >= 55
      ? 'Mendekati Tercapai'
      : 'Perlu Intervensi';

  const spmStatusNumerasi: 'Tuntas / Sangat Baik' | 'Tercapai Penuh' | 'Mendekati Tercapai' | 'Perlu Intervensi' =
    numProjectedCompetence >= 85
      ? 'Tuntas / Sangat Baik'
      : numProjectedCompetence >= 70
      ? 'Tercapai Penuh'
      : numProjectedCompetence >= 55
      ? 'Mendekati Tercapai'
      : 'Perlu Intervensi';

  return {
    schoolName,
    npsn,
    baselineYear,
    hasRealBaseline: Boolean(latestBaselineDoc),

    baselineLitScore: baseLitScore,
    baselineLitCompetencePercent: baseLitCompetence,
    baselineLitBand: getBand(baseLitScore),
    baselineLitMahirPercent: baseLitMahir,
    baselineLitCakapPercent: baseLitCakap,
    baselineLitDasarPercent: baseLitDasar,
    baselineLitIntervensiPercent: baseLitIntervensi,

    baselineNumScore: baseNumScore,
    baselineNumCompetencePercent: baseNumCompetence,
    baselineNumBand: getBand(baseNumScore),
    baselineNumMahirPercent: baseNumMahir,
    baselineNumCakapPercent: baseNumCakap,
    baselineNumDasarPercent: baseNumDasar,
    baselineNumIntervensiPercent: baseNumIntervensi,

    totalStudentsEvaluated: uniqueStudentsAll.size,
    totalTestsEvaluated: litnumRecords.length,
    totalLitTests: litRecords.length,
    totalNumTests: numRecords.length,
    avgStudentLitScore: avgLitStudentScore,
    avgStudentNumScore: avgNumStudentScore,
    litPassingRatePercent: litPassingRate,
    numPassingRatePercent: numPassingRate,
    liveLitMahirPercent: litDist.liveM,
    liveLitCakapPercent: litDist.liveC,
    liveLitDasarPercent: litDist.liveD,
    liveLitIntervensiPercent: litDist.liveI,
    liveNumMahirPercent: numDist.liveM,
    liveNumCakapPercent: numDist.liveC,
    liveNumDasarPercent: numDist.liveD,
    liveNumIntervensiPercent: numDist.liveI,

    cohortBreakdowns,

    literasiProjectedCompetencePercent: litProjectedCompetence,
    literasiProjectedScore: litProjectedScore,
    literasiProjectedBand: getBand(litProjectedScore),
    literasiMahirPercent: litDist.mahir,
    literasiCakapPercent: litDist.cakap,
    literasiDasarPercent: litDist.dasar,
    literasiIntervensiPercent: litDist.intervensi,
    literasiGrowthDelta: litGrowthDelta,

    numerasiProjectedCompetencePercent: numProjectedCompetence,
    numerasiProjectedScore: numProjectedScore,
    numerasiProjectedBand: getBand(numProjectedScore),
    numerasiMahirPercent: numDist.mahir,
    numerasiCakapPercent: numDist.cakap,
    numerasiDasarPercent: numDist.dasar,
    numerasiIntervensiPercent: numDist.intervensi,
    numerasiGrowthDelta: numGrowthDelta,

    scenarios,
    spmStatusLiterasi,
    spmStatusNumerasi,

    disclaimer:
      'Perhatian Resmi: Estimasi proyeksi Rapor Pendidikan 2026 ini merupakan kalkulasi analitik internal sekolah SMAN 3 Tumijajar berbasis penggabungan data empiris riil pengerjaan asesmen siswa terkini dengan baseline resmi RAPOR-PBD Kemendikdasmen. BUKAN MERUPAKAN HASIL RESMI KEMENDIKDASMEN RI (Hasil resmi final diterbitkan berkala oleh Kemendikdasmen RI).'
  };
}
