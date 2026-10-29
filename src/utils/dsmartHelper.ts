import { Student, ClassItem, MCQQuestionItem } from '../types';

export interface DSMartStudentCardInfo {
  student: Student;
  participantNumber: string; // e.g. 69955116-2026-001 or 69955116-2026-0327
  sequenceNumber: number;
  classGroup: string; // e.g. 10.1 or 11.3
  sessionTime: string; // e.g. L&N:1 or Sesi 1
  username: string; // NISN or exam username
  password: string; // Exam password
  schoolName: string;
  serverTest: string;
}

export interface DSMartResultData {
  studentName: string;
  nisn: string;
  participantNumber: string;
  examTitle: string; // e.g. "Literasi & Numerasi 12"
  gradeScore: number; // e.g. 96.6
  totalAnswered: number; // e.g. 160 or 50
  totalCorrect: number; // e.g. 54
  totalQuestions: number; // e.g. 160 or 50
  completionTime: string;
  instruments: {
    name: string;
    score: number;
    correct: number;
    total: number;
    category: string;
  }[];
}

/**
 * Natural comparator for class names:
 * Sorts X/10 first, then XI/11, then XII/12, and numbered subsets (X-1, X-2, 11.3 etc.)
 */
export function sortClassNames(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const getGradeWeight = (name: string) => {
      const lower = name.toLowerCase().trim();
      if (lower.startsWith('x') && !lower.startsWith('xi') && !lower.startsWith('xii')) return 10;
      if (lower.startsWith('10')) return 10;
      if (lower.startsWith('xi') && !lower.startsWith('xii')) return 11;
      if (lower.startsWith('11')) return 11;
      if (lower.startsWith('xii')) return 12;
      if (lower.startsWith('12')) return 12;
      return 99;
    };

    const gradeA = getGradeWeight(a);
    const gradeB = getGradeWeight(b);
    if (gradeA !== gradeB) return gradeA - gradeB;

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Computes sequential participant numbers for all students strictly ordered by class sequence:
 * Class 1: 001 - 036 (or total in class 1)
 * Class 2: 037 - ... (continuous from after the last number of class 1)
 * Class 3: continues from after the last number of class 2, and so forth.
 * Format: [NPSN]-[Tahun]-[NoUrut] (e.g. 69955116-2026-001)
 */
export function generateDSMartParticipantMap(
  students: Student[],
  classes?: ClassItem[],
  npsn: string = '69955116',
  year: string = '2026'
): Map<string, { participantNumber: string; sequenceNumber: number; groupName: string }> {
  const map = new Map<string, { participantNumber: string; sequenceNumber: number; groupName: string }>();

  if (!students || students.length === 0) return map;

  // Collect unique classes from classes list and students list
  const uniqueClassNames = Array.from(
    new Set([
      ...(classes?.map((c) => c.nama) || []),
      ...students.map((s) => s.kelas).filter(Boolean),
    ])
  );

  const sortedClasses = sortClassNames(uniqueClassNames);

  let currentSequence = 1;

  // Traverse through each class in order
  for (const className of sortedClasses) {
    const studentsInClass = students
      .filter((s) => s.kelas === className)
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

    for (const std of studentsInClass) {
      // 3-digit padding (001 - 999), or 4-digit if over 999
      const paddedSeq = String(currentSequence).padStart(
        currentSequence > 999 ? 4 : 3,
        '0'
      );
      const participantNumber = `${npsn}-${year}-${paddedSeq}`;

      // Convert class name to clean format (e.g. "X.1" -> "10.1", "XI-3" -> "11.3")
      const groupName = formatClassToDSMartGroup(className);

      map.set(std.id, {
        participantNumber,
        sequenceNumber: currentSequence,
        groupName,
      });

      currentSequence++;
    }
  }

  // Handle any orphan students without assigned class
  const unassigned = students.filter((s) => !map.has(s.id));
  for (const std of unassigned) {
    const paddedSeq = String(currentSequence).padStart(3, '0');
    map.set(std.id, {
      participantNumber: `${npsn}-${year}-${paddedSeq}`,
      sequenceNumber: currentSequence,
      groupName: std.kelas || 'Umum',
    });
    currentSequence++;
  }

  return map;
}

/**
 * Format class name to DSMART style group, e.g. "X.1" -> "X", "11 IPA 2" -> "XI", "XII-3" -> "XII"
 */
export function formatClassToDSMartGroup(className: string): string {
  if (!className) return 'X';
  const clean = className.trim().toLowerCase();
  if (clean.startsWith('xii') || clean.startsWith('12')) return 'XII';
  if (clean.startsWith('xi') || clean.startsWith('11')) return 'XI';
  if (clean.startsWith('x') || clean.startsWith('10')) return 'X';
  return className.trim().toUpperCase();
}

/**
 * Get DSMart Participant Number for a single student
 */
export function getSingleDSMartParticipantNumber(
  student: Student,
  allStudents: Student[],
  classes?: ClassItem[],
  npsn: string = '69955116',
  year: string = '2026'
): string {
  const map = generateDSMartParticipantMap(allStudents, classes, npsn, year);
  return map.get(student.id)?.participantNumber || `${npsn}-${year}-001`;
}

/**
 * Sample / default DSMART assessment result for mobile viewer
 */
export const DEFAULT_DSMART_SAMPLE_RESULT: DSMartResultData = {
  studentName: 'NABILA ZAHRA ZAIN',
  nisn: '3091110048',
  participantNumber: '69955116-2026-0327',
  examTitle: 'Literasi & Numerasi 12',
  gradeScore: 96.6,
  totalAnswered: 160,
  totalCorrect: 54,
  totalQuestions: 160,
  completionTime: '14 September 2026, 10:45 WIB',
  instruments: [
    {
      name: 'Literasi Membaca',
      score: 95.0,
      correct: 18,
      total: 20,
      category: 'Mahir (Sangat Tinggi)',
    },
    {
      name: 'Numerasi & Penalaran Kuantitatif',
      score: 92.5,
      correct: 16,
      total: 20,
      category: 'Cakap (Tinggi)',
    },
    {
      name: 'Skrining Kesiapan Pra Kampus (SNBP/SNBT)',
      score: 98.0,
      correct: 10,
      total: 10,
      category: 'Sangat Siap PTN Unggulan',
    },
    {
      name: 'Survei Karakter & Lingkungan Belajar',
      score: 100.0,
      correct: 10,
      total: 10,
      category: 'Berakhlak Mulia & Bernalar Kritis',
    },
  ],
};

/**
 * Generate 50 Complete High-Stakes Questions mapped strictly across the 4 DSMART Instruments:
 * Part 1: Literasi Membaca (Soal 1-15)
 * Part 2: Numerasi & Penalaran Kuantitatif (Soal 16-30)
 * Part 3: Pemahaman Pra Kampus (Soal 31-40)
 * Part 4: Survei Karakter & Profil Pelajar Pancasila (Soal 41-50)
 */
export function generateDSMart50Questions(): MCQQuestionItem[] {
  const questions: MCQQuestionItem[] = [
    // =========================================================================
    // PART 1: LITERASI MEMBACA (Soal 1 - 15)
    // =========================================================================
    {
      nomor: 1,
      soal: '[PART 1: LITERASI MEMBACA - TEKS INFORMASI] Industri pengolahan tapioka di Kabupaten Tulang Bawang Barat kini menerapkan teknologi ramah lingkungan dengan mengolah limbah cair menjadi energi biogas. Proses anaerobik mengubah limbah organik menjadi gas metana yang dimanfaatkan sebagai pembangkit listrik mandiri pabrik. Berdasarkan teks di atas, apakah manfaat utama dari inovasi pengolahan limbah cair tersebut?',
      pilihan: {
        A: 'Meningkatkan kadar asam pada tanah perkebunan singkong sekitar pabrik.',
        B: 'Mengubah limbah cair berbahaya menjadi sumber energi listrik terbarukan mandiri.',
        C: 'Menurunkan jumlah produksi tepung tapioka agar menghemat penggunaan bahan bakar.',
        D: 'Menghentikan seluruh penggunaan mesin otomatisasi pada proses pemisahan pati.',
        E: 'Menggantikan seluruh bahan baku singkong dengan tanaman alternatif lain.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Teks menyatakan bahwa limbah cair diolah secara anaerobik menjadi biogas gas metana untuk pembangkit listrik mandiri pabrik.',
      hint: 'Cermati hubungan sebab-akibat antara pengolahan limbah cair dan energi biogas.',
    },
    {
      nomor: 2,
      soal: '[PART 1: LITERASI MEMBACA - TEKS INFORMASI] Digitalisasi UMKM produk turunan singkong di Tubaba berhasil memperluas jangkauan pasar hingga luar Lampung. Penggunaan platform pasar digital memangkas rantai distribusi tradisional dan meningkatkan transparansi harga bagi petani. Manakah simpulan yang paling valid dari teks di atas?',
      pilihan: {
        A: 'Petani singkong tidak lagi memerlukan tempat penyimpanan pascapanen.',
        B: 'Pemasaran digital memotong perantara sehingga efisiensi dan jangkauan pasar UMKM meningkat.',
        C: 'Seluruh transaksi jual beli singkong kini wajib dilakukan melalui mata uang digital.',
        D: 'Pasar tradisional di Tulang Bawang Barat sudah sepenuhnya ditutup oleh pemerintah.',
        E: 'Harga tepung tapioka menjadi tidak stabil karena persaingan antar platform.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Pemasaran digital memangkas rantai distribusi dan memperluas pasar secara langsung ke pembeli.',
      hint: 'Fokus pada kata kunci memangkas rantai distribusi dan memperluas jangkauan.',
    },
    {
      nomor: 3,
      soal: '[PART 1: LITERASI MEMBACA - TEKS INFORMASI] Konservasi kawasan resapan air di sekitar DAS Tulang Bawang menjadi krusial untuk mencegah penurunan kualitas tanah pertanian. Penanaman pohon vegetasi dalam skala luas mampu menahan erosi dan menjaga kelembaban mikro. Apakah tujuan utama penelitian konservasi tanah tersebut?',
      pilihan: {
        A: 'Mempercepat penguapan air sungai saat musim penghujan tiba.',
        B: 'Menjaga keberlanjutan struktur tanah pertanian serta mencegah erosi permukaan.',
        C: 'Mengubah lahan pertanian produktif menjadi kawasan pemukiman padat.',
        D: 'Mengurangi jumlah vegetasi pohon agar debit air mengalir lebih cepat.',
        E: 'Menghilangkan ketergantungan pupuk organik bagi tanaman holtikultura.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Tujuan utama penanaman vegetasi adalah menahan erosi dan menjaga struktur serta kelembaban tanah.',
      hint: 'Cari gagasan utama tentang fungsi tanaman terhadap erosi dan kelembaban tanah.',
    },
    {
      nomor: 4,
      soal: '[PART 1: LITERASI MEMBACA - TEKS INFORMASI] Penggunaan panel surya pada fasilitas umum SMAN 3 Tumijajar mengurangi konsumsi energi fosil hingga 35%. Energi matahari yang berlimpah dimanfaatkan untuk daya laboratorium Komputer dan penerangan malam. Apa implikasi positif penerapan teknologi ini bagi lingkungan sekolah?',
      pilihan: {
        A: 'Meningkatkan suhu udara ruang kelas secara signifikan.',
        B: 'Menurunkan emisi karbon sekolah sekaligus menghemat biaya operasional energi.',
        C: 'Membatasi jam operasional komputer belajar siswa hanya di siang hari.',
        D: 'Mengharuskan sekolah menambah jaringan daya listrik dari bahan bakar batu bara.',
        E: 'Memutus jaringan internet sekolah saat cuaca mendung.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Penggunaan energi terbarukan panel surya memotong emisi karbon dan menghemat pengeluaran daya listrik.',
      hint: 'Perhatikan dampak ganda: dampak ekologis (emisi) dan dampak ekonomis (biaya).',
    },
    {
      nomor: 5,
      soal: '[PART 1: LITERASI MEMBACA - TEKS INFORMASI] Perubahan pola curah hujan akibat dinamika iklim mempengaruhi kalender tanam petani karet dan singkong. Diperlukan penerapan mitigasi berbasis teknologi prakiraan cuaca presisi tinggi. Berdasarkan teks, mengapa petani membutuhkan prakiraan cuaca presisi?',
      pilihan: {
        A: 'Agar petani dapat mengganti seluruh alat pertanian menjadi mesin robotik.',
        B: 'Untuk meminimalkan risiko gagal tanam dan menentukan waktu pemupukan yang paling optimal.',
        C: 'Guna menghentikan siklus panen selama musim kemarau berlangsung.',
        D: 'Memastikan harga komoditas karet tidak mengalami fluktuasi di pasar dunia.',
        E: 'Mengharuskan petani pindah profesi menjadi pekerja industri manufaktur.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Data cuaca presisi membantu petani menentukan timing tepat untuk tanam dan pemupukan guna mencegah gagal panen.',
      hint: 'Hubungkan prakiraan cuaca dengan efisiensi keputusan bertani.',
    },
    {
      nomor: 6,
      soal: '[PART 1: LITERASI MEMBACA - SASTRA & BUDAYA] Dalam sebuah kutipan novel lokal: "Di pelataran Rumah Panggung Tiyuh, Mbah Sastro menatap debu jalanan yang mengepul. \'Kerja keras itu bukan sekadar menguras keringat, Nak, tapi menghidupkan jiwa Nemen dan Nedes di dadamu,\' bisiknya lembut." Karakter Mbah Sastro merepresentasikan nilai filosofis Tubaba yaitu...',
      pilihan: {
        A: 'Sikap pasrah tanpa melakukan usaha apapun saat diterpa musibah.',
        B: 'Semangat keteguhan, kerja keras pantang menyerah (Nemen & Nedes) yang dijiwai dengan keikhlasan.',
        C: 'Keinginan untuk bersaing secara tidak sehat dengan sesama warga desa.',
        D: 'Menolak segala bentuk kemajuan teknologi modern di era globalisasi.',
        E: 'Mencari kekayaan materi sebanyak-banyaknya demi status sosial.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Mbah Sastro menekankan pentingnya kerja keras (Nemen) dan ketangguhan (Nedes) dalam bertindak.',
      hint: 'Refleksikan makna falsafah Nemen, Nedes, Nerimo dalam kutipan.',
    },
    {
      nomor: 7,
      soal: '[PART 1: LITERASI MEMBACA - SASTRA & BUDAYA] Esai Budaya: "Falsafah Piil Pesenggiri mengandarkan kehormatan diri dan martabat sosial. Dalam konteks masyarakat Lampung modern, martabat tersebut tidak diukur dari hegemoni kekuasaan, melainkan dari kontribusi nyata bagi kemaslahatan bersama." Apakah amanat utama esai di atas?',
      pilihan: {
        A: 'Martabat sejati seseorang ditentukan oleh kontribusi positif bagi masyarakat, bukan kekuasaan.',
        B: 'Kehormatan diri hanya dapat diraih melalui kepemilikan harta benda yang melimpah.',
        C: 'Falsafah tradisional tidak relevan lagi digunakan dalam kehidupan masyarakat modern.',
        D: 'Masyarakat Lampung harus mengisolasi diri dari pengaruh budaya luar.',
        E: 'Kekuasaan politik merupakan satu-satunya ukuran keberhasilan seseorang.',
      },
      kunci: 'A',
      skor: 2,
      penjelasan: 'Esai menjelaskan redefinisi Piil Pesenggiri modern: kehormatan bersumber dari kemanfaat sosial.',
      hint: 'Cari inti kalimat pada konteks kontribusi nyata kemaslahatan bersama.',
    },
    {
      nomor: 8,
      soal: '[PART 1: LITERASI MEMBACA - SASTRA & BUDAYA] Dalam puisi "Langkah di Kota Seni Tubaba": \n"Di antara ukiran tiang panggung kayu,\nKami merajut cita dalam keberagaman,\nTak ada benteng yang memisahkan suku,\nSebab kebaikan adalah bahasa universal kita."\nSuasana dan pesan utama yang terpancar dalam bait puisi tersebut adalah...',
      pilihan: {
        A: 'Keresahan akan hilangnya identitas kesenian daerah.',
        B: 'Keharmonisan, persatuan dalam keberagaman, dan kebanggaan atas kearifan lokal.',
        C: 'Kekecewaan terhadap pembangunan fisik bangunan modern.',
        D: 'Ketakutan akan masuknya wisatawan luar daerah ke Tubaba.',
        E: 'Persaingan antar kebudayaan tradisional di masa kini.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Bait puisi menggambarkan persatuan antarsuku tanpa benteng pemisah dan kebanggaan atas karya seni lokal.',
      hint: 'Perhatikan kata "merajut cita dalam keberagaman" dan "kebaikan bahasa universal".',
    },
    {
      nomor: 9,
      soal: '[PART 1: LITERASI MEMBACA - SASTRA & BUDAYA] Teks Narasi Sejarah: "Arsitektur Rumah Panggung Lampung memiliki panggung berkolong tinggi yang secara cermat dirancang oleh leluhur untuk beradaptasi dengan kondisi iklim tropis basah serta ancaman hewan liar." Faktor teknis utama rancangan Rumah Panggung tersebut adalah...',
      pilihan: {
        A: 'Sekadar mengikuti estetika zaman kerajaan kuno.',
        B: 'Adaptasi ekologis terhadap keselamatan dari hewan liar dan sirkulasi udara banjir tropis.',
        C: 'Memudahkan proses pembongkaran saat warga berpindah tempat tinggal.',
        D: 'Mencegah masuknya cahaya matahari ke dalam ruangan rumah.',
        E: 'Menghemat penggunaan bahan baku kayu konstruksi.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Kolong tinggi merupakan wujud adaptasi ekologis terhadap iklim basah, banjir, dan keamanaan dari satwa.',
      hint: 'Cermati frase "beradaptasi dengan kondisi iklim tropis serta ancaman hewan liar".',
    },
    {
      nomor: 10,
      soal: '[PART 1: LITERASI MEMBACA - SASTRA & BUDAYA] Esai Kritik: "Gotong royong kini sering tergeser oleh pragmatisme transaksi ekonomi. Padahal, esensi gotong royong bukan sekadar kerja fisik gratis, melainkan simpul perekat rasa persaudaraan warga." Solusi yang ditawarkan penulis dalam kritiknya adalah...',
      pilihan: {
        A: 'Menghapus seluruh kegiatan kemasyarakatan yang bernilai ekonomi.',
        B: 'Mengembalikan kesadaran kolektif bahwa gotong royong adalah modal sosial nilai persaudaraan.',
        C: 'Mewajibkan setiap warga membayar denda jika tidak ikut gotong royong.',
        D: 'Menerapkan sistem upah komersial pada setiap kegiatan kebersihan Tiyuh.',
        E: 'Menyerahkan seluruh urusan kemasyarakatan kepada pemerintah daerah.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Penulis menekankan perlunya merevitalisasi gotong royong sebagai nilai ikatan sosial persaudaraan.',
      hint: 'Fokus pada "perekat rasa persaudaraan warga".',
    },
    {
      nomor: 11,
      soal: '[PART 1: LITERASI MEMBACA - ANALISIS KRITIS] Sebuah artikel opini menyatakan: "Seluruh teknologi pembelajaran berbasis AI pasti merusak daya kritis siswa karena siswa tidak pernah berpikir sendiri lagi." Manakah evaluasi paling tepat atas argumen dalam artikel tersebut?',
      pilihan: {
        A: 'Argumen sangat valid karena AI memang tidak memiliki manfaat sama sekali dalam pendidikan.',
        B: 'Argumen mengandung falasi tergeneralisasi berlebihan (hasty generalization) dan mengabaikan peran AI sebagai alat bantu eksplorasi.',
        C: 'Argumen sepenuhnya benar berdasarkan fakta sejarah perkembangan teknologi.',
        D: 'Argumen harus diterima tanpa perlu dikaji ulang oleh akademisi.',
        E: 'Argumen memperlihatkan bahwa guru tidak lagi dibutuhkan di sekolah.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Penggunaan kata "Seluruh" dan "pasti merusak" adalah klaim generalisasi berlebihan yang mengabaikan penggunaan AI yang bertanggung jawab.',
      hint: 'Perhatikan kata mutlak "seluruh" dan "pasti" yang memicu kesalahan logika generalisasi.',
    },
    {
      nomor: 12,
      soal: '[PART 1: LITERASI MEMBACA - ANALISIS KRITIS] Teks A menekankan pentingnya pembangunan infrastruktur jalan tol untuk mempercepat distribusi barang. Teks B menyoroti dampak alih fungsi lahan pertanian akibat pembangunan jalan tol. Sikap kritis yang objektif dalam membandingkan kedua teks adalah...',
      pilihan: {
        A: 'Menolak Teks B karena mengganggu program pembangunan pemerintah.',
        B: 'Memahami bahwa kedua teks saling melengkapi dalam memberikan sudut pandang manfaat ekonomi dan analisis dampak lingkungan.',
        C: 'Menganggap Teks A salah total karena tidak memikirkan lingkungan.',
        D: 'Mengabaikan kedua teks karena tidak berkaitan dengan siswa.',
        E: 'Hanya percaya pada Teks A karena berfokus pada kemajuan ekonomi.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Membaca kritis memerlukan sintesis berimbang antara analisis manfaat (Teks A) dan mitigasi dampak ekologis (Teks B).',
      hint: 'Pendekatan objektif mencari titik temu antara pembangunan dan kelestarian.',
    },
    {
      nomor: 13,
      soal: '[PART 1: LITERASI MEMBACA - ANALISIS KRITIS] Penulis majalah ilmiah menulis: "Berdasarkan data sampel 5.000 siswa, 82% yang menggunakan metode peta konsep terstruktur mencatatkan retensi memori 40% lebih tinggi dibanding metode membaca pasif." Apa asumsi tersirat dari pernyataan penulis?',
      pilihan: {
        A: 'Membaca pasif adalah metode terbaik untuk ujian menghafal.',
        B: 'Metode belajar aktif seperti peta konsep secara signifikan meningkatkan efektivitas pemahaman materi.',
        C: 'Siswa yang tidak memakai peta konsep dipastikan gagal dalam ujian.',
        D: 'Jumlah sampel 5.000 siswa terlalu sedikit untuk mengambil kesimpulan.',
        E: 'Peta konsep hanya cocok untuk mata pelajaran eksakta.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Asumsi dasar penulis adalah bahwa teknik pengorganisasian visual (peta konsep) mendorong keterlibatan aktif otak.',
      hint: 'Cermati kontras retensi antara peta konsep dan membaca pasif.',
    },
    {
      nomor: 14,
      soal: '[PART 1: LITERASI MEMBACA - ANALISIS KRITIS] Dalam teks tajuk rencana: "Pemerintah daerah mengalokasikan 25% APBD untuk penguatan fasilitas laboratorium sekolah menengah." Apa maksud terselubung (intent) dari penulis tajuk rencana tersebut?',
      pilihan: {
        A: 'Mengecam kebijakan penganggaran pemerintah daerah.',
        B: 'Mendukung dan mengapresiasi komitmen investasi jangka panjang pemerintah pada kualitas pendidikan.',
        C: 'Menuntut agar anggaran pendidikan dialihkan ke sektor industri hiburan.',
        D: 'Menyarankan agar sekolah tidak perlu lagi menarik biaya pemeliharaan.',
        E: 'Mengkritik guru yang jarang menggunakan fasilitas laboratorium.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Menyoroti alokasi 25% (di atas mandat 20%) menunjukkan apresiasi terhadap investasi strategis pendidikan.',
      hint: 'Identifikasi nada/tonalitas apresiatif terhadap alokasi anggaran.',
    },
    {
      nomor: 15,
      soal: '[PART 1: LITERASI MEMBACA - ANALISIS KRITIS] Manakah kesimpulan paling logis dari paragraf berikut: "Peningkatan literasi membaca siswa berbanding lurus dengan ketersediaan bahan bacaan yang relevan di perpustakaan sekolah dan akses internet belajar mandiri."?',
      pilihan: {
        A: 'Ketersediaan bahan bacaan dan akses internet merupakan faktor pendukung penting peningkatan literasi.',
        B: 'Perpustakaan sekolah harus menghilangkan semua buku cetak dan menggantinya dengan HP.',
        C: 'Siswa yang rajin membaca pasti tidak memerlukan bimbingan guru lagi.',
        D: 'Literasi membaca hanya dapat ditingkatkan jika siswa membeli buku pribadi.',
        E: 'Akses internet selalu berdampak negatif pada minat baca siswa.',
      },
      kunci: 'A',
      skor: 2,
      penjelasan: 'Hubungan berbanding lurus menunjukkan bahwa ketersediaan fasilitas merupakan variabel pendukung utama.',
      hint: 'Perhatikan frasa "berbanding lurus".',
    },

    // =========================================================================
    // PART 2: NUMERASI & PENALARAN KUANTITATIF (Soal 16 - 30)
    // =========================================================================
    {
      nomor: 16,
      soal: '[PART 2: NUMERASI - ALJABAR & FUNGSI] Hasil panen komoditas singkong di sebuah perkebunan Tulang Bawang Barat mengikuti fungsi pertumbuhan P(t) = 120 . (1.10)^t ton, dengan t adalah waktu dalam tahun. Jika panen awal (t=0) adalah 120 ton, berapakah estimasi total panen setelah 2 tahun (t=2)?',
      pilihan: {
        A: '132.0 ton',
        B: '145.2 ton',
        C: '150.0 ton',
        D: '160.4 ton',
        E: '172.8 ton',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'P(2) = 120 . (1.10)² = 120 . 1.21 = 145.2 ton.',
      hint: 'Hitung (1.10)² = 1.21 lalu kalikan dengan 120.',
    },
    {
      nomor: 17,
      soal: '[PART 2: NUMERASI - ALJABAR & FUNGSI] Seorang pemilik UMKM keripik singkong di Tubaba memiliki fungsi biaya total B(x) = 5.000x + 200.000 (dalam Rupiah), di mana x adalah jumlah kemasan. Jika keripik dijual dengan harga H(x) = 15.000x, berapakah jumlah kemasan minimal (Break Even Point) agar UMKM tidak mengalami kerugian?',
      pilihan: {
        A: '15 kemasan',
        B: '20 kemasan',
        C: '25 kemasan',
        D: '30 kemasan',
        E: '40 kemasan',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'BEP saat H(x) = B(x) -> 15.000x = 5.000x + 200.000 -> 10.000x = 200.000 -> x = 20 kemasan.',
      hint: 'Samakan Pendapatan 15.000x dengan Biaya (5.000x + 200.000).',
    },
    {
      nomor: 18,
      soal: '[PART 2: NUMERASI - ALJABAR & FUNGSI] Sebuah tangki pengolahan limbah biogas pertanian berbentuk silinder memiliki rumus volume V = π . r² . h. Jika jari-jari tangki r diperbesar menjadi 2 kali lipat dan tingginya h tetap, bagaimana perubahan volume tangki yang baru dibanding volume awal?',
      pilihan: {
        A: 'Volume baru menjadi 2 kali volume awal.',
        B: 'Volume baru menjadi 4 kali volume awal.',
        C: 'Volume baru menjadi 8 kali volume awal.',
        D: 'Volume baru tetap tidak berubah.',
        E: 'Volume baru menjadi 1/2 kali volume awal.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'V_baru = π . (2r)² . h = π . 4r² . h = 4 . V_awal.',
      hint: 'Ingat bahwa r dikuadratkan dalam rumus volume silinder.',
    },
    {
      nomor: 19,
      soal: '[PART 2: NUMERASI - ALJABAR & FUNGSI] Sebuah toko pupuk memberikan diskon bertingkat: diskon pertama 20%, kemudian dari sisa harga diberikan potongan tambahan 10%. Jika harga awal pupuk sebelum diskon adalah Rp 500.000, berapakah harga akhir yang harus dibayar pembeli?',
      pilihan: {
        A: 'Rp 350.000',
        B: 'Rp 360.000',
        C: 'Rp 380.000',
        D: 'Rp 400.000',
        E: 'Rp 420.000',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Diskon 1: 80% x 500.000 = 400.000. Diskon 2: 90% x 400.000 = Rp 360.000.',
      hint: 'Hitung diskon secara bertahap dari sisa harga, bukan menjumlahkan persentase.',
    },
    {
      nomor: 20,
      soal: '[PART 2: NUMERASI - DATA & KETIDAKPASTIAN] Hasil Tryout Simulasi D\'SMART 30 siswa SMAN 3 Tumijajar mencatatkan rata-rata nilai 78. Jika 5 siswa susulan dengan rata-rata nilai 85 dimasukkan ke dalam kelompok, berapakah rata-rata nilai gabungan seluruh 35 siswa tersebut?',
      pilihan: {
        A: '78.50',
        B: '79.00',
        C: '79.50',
        D: '80.00',
        E: '81.20',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Rata-rata gabungan = (30 x 78 + 5 x 85) / 35 = (2340 + 425) / 35 = 2765 / 35 = 79.00.',
      hint: 'Gunakan rumus rata-rata gabungan: (n1.x1 + n2.x2) / (n1 + n2).',
    },
    {
      nomor: 21,
      soal: '[PART 2: NUMERASI - DATA & KETIDAKPASTIAN] Tabel Distribusi Frekuensi Nilai Numerasi:\n[Nilai 61-70: 4 siswa] | [Nilai 71-80: 10 siswa] | [Nilai 81-90: 12 siswa] | [Nilai 91-100: 4 siswa]\nBerapakah persentase siswa yang memperoleh nilai lebih dari 80 (kategori Mahir)?',
      pilihan: {
        A: '40%',
        B: '46.7%',
        C: '53.3%',
        D: '60%',
        E: '66.7%',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'Siswa nilai > 80 = (81-90: 12 siswa) + (91-100: 4 siswa) = 16 siswa. Total siswa = 30. Persentase = (16/30) x 100% = 53.33%.',
      hint: 'Jumlahkan frekuensi interval 81-90 dan 91-100 lalu bagikan total.',
    },
    {
      nomor: 22,
      soal: '[PART 2: NUMERASI - DATA & KETIDAKPASTIAN] Dari 10 orang calon pengurus kelompok belajar (6 laki-laki dan 4 perempuan), akan dipilih 3 orang secara acak untuk menjadi ketua, sekretaris, dan bendahara. Berapakah peluang terpilih ketiganya adalah siswa laki-laki?',
      pilihan: {
        A: '1/6',
        B: '1/5',
        C: '1/4',
        D: '1/3',
        E: '1/2',
      },
      kunci: 'A',
      skor: 2,
      penjelasan: 'Peluang = (6/10) x (5/9) x (4/8) = (3/5) x (5/9) x (1/2) = 15 / 90 = 1/6.',
      hint: 'Kalikan peluang kejadian bersyarat tanpa pengembalian: 6/10 x 5/9 x 4/8.',
    },
    {
      nomor: 23,
      soal: '[PART 2: NUMERASI - DATA & KETIDAKPASTIAN] Sebuah kotak memuat 5 bola merah dan 3 bola putih. Jika diambil 2 bola sekaligus secara acak, berapakah peluang terambil sekurang-kurangnya 1 bola merah?',
      pilihan: {
        A: '25/28',
        B: '22/28',
        C: '18/28',
        D: '15/28',
        E: '10/28',
      },
      kunci: 'A',
      skor: 2,
      penjelasan: 'Peluang keduanya putih = C(3,2)/C(8,2) = 3/28. Peluang sekurang-kurangnya 1 merah = 1 - 3/28 = 25/28.',
      hint: 'Gunakan peluang komplemen: 1 - P(keduanya putih).',
    },
    {
      nomor: 24,
      soal: '[PART 2: NUMERASI - GEOMETRI & PENGUKURAN] Seorang siswa mengukur tinggi tiang bendera SMAN 3 Tumijajar menggunakan klinometer. Dari jarak 12 meter dari kaki tiang, sudut elevasi ke puncak tiang terukur 45°. Jika tinggi mata siswa dari tanah adalah 1.5 meter, berapakah tinggi tiang bendera tersebut?',
      pilihan: {
        A: '12.0 meter',
        B: '13.5 meter',
        C: '14.0 meter',
        D: '15.5 meter',
        E: '16.2 meter',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'tan 45° = h / 12 -> 1 = h / 12 -> h = 12 meter. Tinggi total = 12 + 1.5 = 13.5 meter.',
      hint: 'Tinggi tiang = (jarak x tan 45°) + tinggi mata siswa.',
    },
    {
      nomor: 25,
      soal: '[PART 2: NUMERASI - GEOMETRI & PENGUKURAN] Lahan percobaan pertanian SMAN 3 Tumijajar berbentuk segitiga siku-siku dengan panjang sisi tegak 30 meter dan 40 meter. Berapakah panjang pagar yang dibutuhkan untuk mengelilingi seluruh batas lahan tersebut?',
      pilihan: {
        A: '90 meter',
        B: '100 meter',
        C: '120 meter',
        D: '140 meter',
        E: '150 meter',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'Sisi miring = √(30² + 40²) = √(900 + 1600) = 50 meter. Keliling = 30 + 40 + 50 = 120 meter.',
      hint: 'Gunakan pythagoras untuk mencari hipotenusa (sisi miring) lalu kelilingi.',
    },
    {
      nomor: 26,
      soal: '[PART 2: NUMERASI - GEOMETRI & PENGUKURAN] Sebuah tempat penampungan air bersih berbentuk balok memiliki ukuran panjang 4 meter, lebar 2 meter, dan tinggi 1.5 meter. Jika air mengalir dari pipa dengan debit konstan 50 liter/menit, berapa jam waktu yang dibutuhkan untuk mengisi tempat penampungan hingga penuh? (1 m³ = 1.000 liter)',
      pilihan: {
        A: '2 jam',
        B: '3 jam',
        C: '4 jam',
        D: '5 jam',
        E: '6 jam',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'Volume = 4 x 2 x 1.5 = 12 m³ = 12.000 liter. Waktu = 12.000 / 50 = 240 menit = 4 jam.',
      hint: 'Hitung volume dalam liter (12.000 L) lalu bagikan debit 50 L/menit.',
    },
    {
      nomor: 27,
      soal: '[PART 2: NUMERASI - GEOMETRI & PENGUKURAN] Denah kebun sekolah digambar dengan skala 1 : 500. Jika pada denah kebun berbentuk persegi panjang berukuran 8 cm x 5 cm, berapakah luas kebun sekolah yang sebenarnya?',
      pilihan: {
        A: '400 m²',
        B: '800 m²',
        C: '1.000 m²',
        D: '2.000 m²',
        E: '4.000 m²',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'Panjang sebenarnya = 8 cm x 500 = 4.000 cm = 40 m. Lebar sebenarnya = 5 cm x 500 = 2.500 cm = 25 m. Luas = 40 x 25 = 1.000 m².',
      hint: 'Kalikan dimensi denah dengan skala terlebih dahulu sebelum menghitung luas.',
    },
    {
      nomor: 28,
      soal: '[PART 2: NUMERASI - POLA LOGIKA] Diketahui barisan angka: 3, 7, 15, 31, 63, ... Berapakah angka suku berikutnya dari barisan pola tersebut?',
      pilihan: {
        A: '95',
        B: '112',
        C: '127',
        D: '135',
        E: '141',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'Pola: x2 + 1. (3x2+1=7), (7x2+1=15), (15x2+1=31), (31x2+1=63), (63x2+1 = 127).',
      hint: 'Cermati hubungan perkalian 2 ditambah 1 pada setiap suku.',
    },
    {
      nomor: 29,
      soal: '[PART 2: NUMERASI - POLA LOGIKA] Tiga buah lampu sensor di laboratorium menyala berkala: Lampu Merah setiap 4 menit, Lampu Hijau setiap 6 menit, dan Lampu Kuning setiap 10 menit. Jika ketiga lampu menyala bersamaan pada pukul 08.00 WIB, pada pukul berapakah ketiga lampu akan menyala bersamaan kembali?',
      pilihan: {
        A: '08.30 WIB',
        B: '08.45 WIB',
        C: '09.00 WIB',
        D: '09.15 WIB',
        E: '09.30 WIB',
      },
      kunci: 'C',
      skor: 2,
      penjelasan: 'KPK dari 4, 6, dan 10 adalah 60 menit (1 jam). Waktu menyala bersama = 08.00 + 1 jam = 09.00 WIB.',
      hint: 'Cari Kelipatan Persekutuan Terkecil (KPK) dari 4, 6, dan 10.',
    },
    {
      nomor: 30,
      soal: '[PART 2: NUMERASI - POLA LOGIKA] Jika 6 pekerja mampu menyelesaikan pembuatan pagar sekolah dalam waktu 12 hari, berapa tambahan pekerja yang dibutuhkan agar pembuatan pagar selesai hanya dalam waktu 8 hari?',
      pilihan: {
        A: '2 orang',
        B: '3 orang',
        C: '4 orang',
        D: '5 orang',
        E: '6 orang',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Perbandingan berbalik nilai: 6 x 12 = P x 8 -> 72 = 8P -> P = 9 pekerja. Tambahan = 9 - 6 = 3 orang.',
      hint: 'Gunakan perbandingan berbalik nilai, lalu kurangi dengan jumlah pekerja awal.',
    },

    // =========================================================================
    // PART 3: PEMAHAMAN PRA KAMPUS & SELEKSI PTN (Soal 31 - 40)
    // =========================================================================
    {
      nomor: 31,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - SELEKSI NASIONAL] Pada seleksi SNBP (Seleksi Nasional Berdasarkan Prestasi), nilai rapor semester 1-5 dan portofolio prestasi pendukung menjadi komponen utama. Manakah strategi penentuan jurusan yang paling rasional bagi siswa SMA?',
      pilihan: {
        A: 'Memilih jurusan berketatannya paling tinggi tanpa melihat konsistensi grafik nilai rapor.',
        B: 'Menganalisis linieritas nilai mata pelajaran pendukung, grafik konsistensi rapor, serta rekam jejak alumni di PTN tujuan.',
        C: 'Menyerahkan pilihan jurusan sepenuhnya kepada pilihan teman satu kelompok.',
        D: 'Hanya mendaftar pada PTN luar pulau yang tidak memiliki kuota penerimaan.',
        E: 'Mengabaikan saran guru BK dan fokus pada prediksi acak media sosial.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'SNBP memperhitungkan kelinearitasan mapel pendukung, tren grafik nilai rapor, serta track record sekolah asal.',
      hint: 'Rasionalitas pilihan didasarkan pada data historis dan potensi diri.',
    },
    {
      nomor: 32,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - UTBK SNBT] Tes Potensi Skolastik (TPS) UTBK-SNBT mengukur kemampuan penalaran umum, kuantitatif, serta pemahaman bacaan. Manakah metode persiapan mandiri yang paling efektif menghadapi ujian skolastik?',
      pilihan: {
        A: 'Menghafal seluruh buku rumus tanpa pernah mencoba latihan soal berbasis waktu.',
        B: 'Latihan soal berbobot HOTS secara konsisten, analisis pembahasan kesalahan, dan simulasi manajemen waktu tes.',
        C: 'Belajar maraton 24 jam nonstop H-1 ujian dilaksanakan.',
        D: 'Hanya berfokus pada satu subtes saja dan mengosongkan subtes lainnya.',
        E: 'Mengandalkan keberuntungan jawaban acak.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Tes skolastik menguji logika dan daya tangkap; latihan evaluatif berkelanjutan dan manajemen waktu adalah kunci.',
      hint: 'Latihan terstruktur berbasis waktu membentuk daya analisis cepat.',
    },
    {
      nomor: 33,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - ETIKA SELEKSI] Seorang siswa dinyatakan lolos seleksi SNBP di PTN Pilihan 1. Namun, siswa tersebut tidak mengambil kesempatan tersebut karena ingin mengulang seleksi mandiri di PTN lain. Apakah konsekuensi resmi sistematis atas tindakan tersebut?',
      pilihan: {
        A: 'Siswa tetap diperbolehkan mendaftar tes UTBK-SNBT di tahun yang sama.',
        B: 'Siswa diblokir (blacklist) otomatis dari pendaftaran UTBK-SNBT dan jalur mandiri berbasis UTBK pada tahun berjalan.',
        C: 'Sekolah mendapatkan hadiah tambahan kuota SNBP untuk tahun berikutnya.',
        D: 'Tidak ada konsekuensi apapun baik bagi siswa maupun sekolah.',
        E: 'Nilai UTBK siswa otomatis dinaikkan 100 poin.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Aturan resmi SNPMB menegaskan siswa yang lolos SNBP dilarang mendaftar UTBK-SNBT demi keadilan kuota.',
      hint: 'Aturan integrasi sistem SNPMB melarang kelolosan ganda.',
    },
    {
      nomor: 34,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - KETUNTASAN MAPEL] Dalam Kurikulum Merdeka, pemilihan mata pelajaran pilihan di kelas XI dan XII berdampak langsung pada kelayakan pendaftaran program studi perguruan tinggi. Manakah pasangan mapel pilihan yang paling linier untuk program studi Teknik Informatika?',
      pilihan: {
        A: 'Geografi dan Sosiologi.',
        B: 'Matematika Tingkat Lanjut dan Fisika.',
        C: 'Biologi dan Sejarah Lanjut.',
        D: 'Ekonomi dan Bahasa Indonesia Lanjut.',
        E: 'Seni Rupa dan Prakarya.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Prodi Teknik Informatika membutuhkan fondasi logika kuat aljabar (Matematika Lanjut) dan pemrograman/fisika.',
      hint: 'Cari mata pelajaran yang menunjang penalaran logika komputasi.',
    },
    {
      nomor: 35,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - BEASISWA GLOBAL] Program Beasiswa Indonesia Maju (BIM) dan KIP-Kuliah mensyaratkan kelengkapan portofolio dan penulisan Personal Statement/Essay Motivasi. Unsur paling krusial yang harus ditonjolkan dalam essay motivasi beasiswa adalah...',
      pilihan: {
        A: 'Menceritakan kelemahan pribadi tanpa solusi penanggulangan.',
        B: 'Rekam jejak kontribusi, relevansi cita-cita dengan program studi, serta rencana kontribusi pascastudi bagi Indonesia.',
        C: 'Menyalin tulisan karangan orang lain dari internet.',
        D: 'Fokus memprotes fasilitas pendidikan yang ada.',
        E: 'Menjelaskan daftar hobi yang tidak berhubungan dengan akademis.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Reviewer beasiswa menilai originalitas visi, komitmen kontribusi sosial, serta daya juang kandidat.',
      hint: 'Ketiga pilar utama: Rekam jejak, relevansi prodi, dan rencana kontribusi.',
    },
    {
      nomor: 36,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - BEASISWA] KIP-Kuliah merupakan bantuan biaya pendidikan dari pemerintah bagi siswa berpotensi akademik baik tetapi memiliki keterbatasan ekonomi. Manakah kriteria utama penerima bantuan KIP-Kuliah?',
      pilihan: {
        A: 'Memiliki mobil pribadi dan rumah mewah.',
        B: 'Terdata dalam DTKS/P3KE atau memiliki kartu bantuan sosial dan diterima di PTN/PTS terakreditasi.',
        C: 'Satu-satunya siswa di sekolah yang tidak mengikuti ujian akhir.',
        D: 'Siswa yang menolak mendaftar di universitas dalam negeri.',
        E: 'Anak dari pejabat publik tingkat provinsi.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'KIP-Kuliah diprioritaskan bagi siswa dari keluarga kurang mampu terverifikasi data DTKS/P3KE yang diterima PTN/PTS.',
      hint: 'Verifikasi berbasis data kemiskinan terpadu (DTKS/P3KE).',
    },
    {
      nomor: 37,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - KULTUR AKADEMIK] Saat memasuki dunia perkuliahan, mahasiswa dituntut memiliki kemandirian akademik (self-directed learning). Perbedaan utama kultur belajar SMA dengan Perguruan Tinggi adalah...',
      pilihan: {
        A: 'Di perguruan tinggi dosen selalu mengingatkan tugas setiap hari.',
        B: 'Mahasiswa aktif mencari referensi jurnal ilmiah mandiri dan bertanggung jawab penuh atas jadwal studi.',
        C: 'Di kampus tidak ada ujian akhir semester.',
        D: 'Seluruh materi perkuliahan cukup dihafalkan dari satu buku teks saja.',
        E: 'Mahasiswa dilarang berorganisasi atau berdiskusi.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Perguruan tinggi mengutamakan otonomi belajar mandiri, eksplorasi riset literatur, dan tanggung jawab pribadi.',
      hint: 'Kata kunci: kemandirian pencarian riset dan tanggung jawab mandiri.',
    },
    {
      nomor: 38,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - INTEGRITAS MENTOR] Dalam menulis makalah ilmiah riset kampus, tindakan menyalin paragraf karya ilmiah orang lain tanpa mencantumkan sumber sitasi resmi dinamakan...',
      pilihan: {
        A: 'Apropriasi budaya.',
        B: 'Plagiarisme (plagiat) yang melanggar etika akademis.',
        C: 'Publikasi ilmiah terakreditasi.',
        D: 'Kritik sastra terbuka.',
        E: 'Inovasi penulisan kreatif.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Menyalin klaim/tulisan karya orang lain tanpa atribusi sumber merupakan bentuk pelanggaran etika akademis (plagiarisme).',
      hint: 'Pahami istilah pelanggaran integritas hak cipta karya ilmiah.',
    },
    {
      nomor: 39,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - ADAPTASI KAMPUS] Seorang mahasiswa mengalami kendala penurunan nilai di semester pertama karena kesulitan membagi waktu antara kegiatan organisasi dan tugas kuliah. Langkah solutif yang paling rasional dilakukan adalah...',
      pilihan: {
        A: 'Keluar dari universitas dan mendaftar kembali di kampus lain.',
        B: 'Menyusun skala prioritas harian (Matriks Eisenhower), konsultasi dengan dosen pembimbing akademik, dan mengevaluasi komitmen organisasi.',
        C: 'Menyalahkan dosen atas ketatnya batas waktu pengumpulan tugas.',
        D: 'Menghentikan seluruh aktivitas belajar dan fokus berorganisasi saja.',
        E: 'Menyewa orang lain untuk mengerjakan seluruh tugas perkuliahan.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Penyelesaian masalah manajemen waktu memerlukan evaluasi skala prioritas dan komunikasi dengan dosen pembimbing.',
      hint: 'Manajemen prioritas dan bimbingan dosen pembimbing akademik.',
    },
    {
      nomor: 40,
      soal: '[PART 3: PEMAHAMAN PRA KAMPUS - METODE RISET] Dalam penelitian ilmiah, metode pengumpulan data melalui pengamatan langsung pada perilaku objek di lapangan tanpa merekayasa kondisi dinamakan...',
      pilihan: {
        A: 'Studi Literatur Ekstrem.',
        B: 'Observasi Lapangan (Field Observation).',
        C: 'Simulasi Komputer Acak.',
        D: 'Wawancara Tertutup Terstruktur.',
        E: 'Eksperimen Laboratorium Steril.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Observasi lapangan merupakan metode pengamatan empiris objek secara alamiah di lokasi sebenarnya.',
      hint: 'Fokus pada kata kunci pengamatan langsung di lapangan.',
    },

    // =========================================================================
    // PART 4: SURVEI KARAKTER & PROFIL PELAJAR PANCASILA (Soal 41 - 50)
    // =========================================================================
    {
      nomor: 41,
      soal: '[PART 4: SURVEI KARAKTER - KEBINEKAAN GLOBAL] Saat diskusi kelompok di kelas, terjadi perbedaan pendapat yang tajam antananggota kelompok yang berasal dari latar belakang budaya berbeda. Sikap terbaik yang mencerminkan elemen Kebinekaan Global adalah...',
      pilihan: {
        A: 'Memaksa seluruh anggota menerima pendapat pribadi sebagai satu-satunya yang benar.',
        B: 'Mendengarkan dengan empati, menghargai keberagaman sudut pandang, dan mencari titik temu secara musyawarah.',
        C: 'Meninggalkan ruang diskusi dan menolak bekerja sama lagi.',
        D: 'Membentuk kelompok tandingan berdasarkan kesamaan latar belakang daerah.',
        E: 'Melaporkan teman yang berbeda pendapat kepada pihak kepolisian.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Kebinekaan global menekankan saling menghargai, komunikasi interkultural, dan musyawarah inklusif.',
      hint: 'Pilihlah sikap empati, keterbukaan, dan pencarian titik musyawarah.',
    },
    {
      nomor: 42,
      soal: '[PART 4: SURVEI KARAKTER - KEBINEKAAN GLOBAL] Di era derasnya arus informasi media sosial, budaya pop asing sangat digandrungi oleh remaja. Bagaimana sikap ideal seorang Pelajar Pancasila dalam merespons fenomena tersebut?',
      pilihan: {
        A: 'Menolak secara ekstrem seluruh budaya luar tanpa terkecuali.',
        B: 'Bersikap terbuka terhadap hal-hal positif budaya luar namun tetap melestarikan dan bangga pada identitas kearifan lokal bangsa.',
        C: 'Meninggalkan seluruh tradisi daerah karena dianggap tidak gaul.',
        D: 'Mengejek teman yang menyukai seni tradisional daerah.',
        E: 'Mengabaikan norma-norma etika sopan santun lokal.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Sikap seimbang: bersikap terbuka secara kritis (kebinekaan global) tanpa kehilangan akar kebudayaan bangsa.',
      hint: 'Sikap seimbang antara keterbukaan global dan penguatan kearifan lokal.',
    },
    {
      nomor: 43,
      soal: '[PART 4: SURVEI KARAKTER - KEBINEKAAN GLOBAL] Di media sosial, muncul berita bohong (hoaks) yang berpotensi memecah belah kerukunan antarumat beragama di daerah Anda. Tindakan paling bijak yang harus Anda lakukan adalah...',
      pilihan: {
        A: 'Membagikan (share) secara cepat ke seluruh grup obrolan tanpa mengecek kebenarannya.',
        B: 'Memeriksa kebenaran informasi melalui sumber resmi berita (saring sebelum sharing) dan tidak memprovokasi.',
        C: 'Menambahkan komentar kebencian agar berita semakin viral.',
        D: 'Acuh tak acuh biarpun konflik membesar.',
        E: 'Menyalahkan satu pihak tanpa fakta.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Prinsip "saring sebelum sharing" serta verifikasi fakta adalah cermin bernalar kritis dan menjaga persatuan.',
      hint: 'Saring sebelum sharing dan cek keabsahan fakta.',
    },
    {
      nomor: 44,
      soal: '[PART 4: SURVEI KARAKTER - INTEGRITAS] Saat ujian berlangsung, teman karib Anda meminta bantuan jawaban karena takut tidak lulus. Sebagai siswa berintegritas, tindakan yang paling tepat dilakukan adalah...',
      pilihan: {
        A: 'Memberikan kunci jawaban karena rasa solidaritas pertemanan.',
        B: 'Menolak memberikan jawaban secara sopan dan fokus mengerjakan ujian sendiri secara jujur.',
        C: 'Meneriaki teman di tengah ruangan agar dipermalukan.',
        D: 'Sengaja memberikan jawaban yang salah agar teman mendapat nilai jelek.',
        E: 'Ikut menyontek jawaban dari teman yang lain.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Integritas sejati adalah mempertahankan kejujuran akademik meskipun mendapat tekanan pertemanan.',
      hint: 'Kejujuran akademis merupakan harga mati integritas.',
    },
    {
      nomor: 45,
      soal: '[PART 4: SURVEI KARAKTER - INTEGRITAS] Sekolah menyediakan fasilitas air minum gratis dan komputer belajar untuk seluruh siswa. Namun, Anda melihat beberapa oknum merusak kran air dan membuang sampah sembarangan. Tindakan Anda adalah...',
      pilihan: {
        A: 'Pura-pura tidak melihat agar tidak berurusan dengan orang lain.',
        B: 'Mengingatkan oknum tersebut dengan sopan serta melaporkan kerusakan ke pihak sarana sekolah agar segera diperbaiki.',
        C: 'Ikut membuang sampah sembarangan karena merasa bukan barang pribadi.',
        D: 'Mengambil komponen komputer untuk dibawa pulang ke rumah.',
        E: 'Foto kejadian lalu menjadikannya lelucon di media sosial.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Memelihara fasilitas umum publik merupakan wujud rasa memiliki (sense of belonging) dan integritas tanggung jawab warga sekolah.',
      hint: 'Kepedulian menjaga aset bersama sekolah.',
    },
    {
      nomor: 46,
      soal: '[PART 4: SURVEI KARAKTER - INTEGRITAS] Anda dipercaya menjadi bendahara panitia pentas seni sekolah. Saat mengelola dana sponsor, terdapat sisa dana belanja yang cukup besar. Sikap transparan yang harus Anda lakukan adalah...',
      pilihan: {
        A: 'Menggunakan sisa uang untuk membeli barang pribadi karena merasa sudah bekerja keras.',
        B: 'Mencatat seluruh pembukuan keuangan secara rinci dan melaporkan sisa saldo secara terbuka kepada ketua dan pembina.',
        C: 'Membagi-bagikan sisa uang kepada teman dekat secara rahasia.',
        D: 'Menghapus catatan kuitansi belanja agar tidak bisa diperiksa.',
        E: 'Menunda-nunda laporan keuangan sampai semua orang lupa.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Akuntabilitas dan transparansi finansial adalah pilar kejujuran dalam berorganisasi.',
      hint: 'Transparansi pembukuan dan pelaporan terbuka.',
    },
    {
      nomor: 47,
      soal: '[PART 4: SURVEI KARAKTER - FALSAFAH NENEMO (NEMEN)] Dalam falsafah Tubaba, "Nemen" memiliki arti kerja keras, tekun, dan bersungguh-sungguh. Ketika Anda menghadapi mata pelajaran yang dirasa sangat sulit, wujud nyata dari nilai "Nemen" adalah...',
      pilihan: {
        A: 'Menyerah dan mengosongkan lembar ujian.',
        B: 'Mempelajari materi secara tekun, bertanya kepada guru/teman, dan konsisten latihan soal sampai paham.',
        C: 'Mencari bocoran soal di internet.',
        D: 'Menyalahkan kurikulum sekolah yang dianggap terlalu berat.',
        E: 'Membolos dari pelajaran tersebut.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Nemen mengandarkan semangat keuletan dan kesungguhan pantang menyerah dalam belajar.',
      hint: 'Nemen = Kerja keras, tekun, dan bersungguh-sungguh.',
    },
    {
      nomor: 48,
      soal: '[PART 4: SURVEI KARAKTER - FALSAFAH NENEMO (NEDES)] Falsafah "Nedes" bermakna tahan banting, ulet, dan tidak mudah patah semangat saat menghadapi ujian hidup. Apabila proyek eksperimen sains kelompok Anda gagal saat uji coba pertama, respon berkarakter Nedes adalah...',
      pilihan: {
        A: 'Menyalahkan anggota kelompok lain dan membubarkan panitia.',
        B: 'Menganalisis penyebab kegagalan secara bersama, memperbaiki prosedur riset, dan mencoba kembali dengan semangat baru.',
        C: 'Menangis dan menolak melanjutkan sekolah.',
        D: 'Mengganti topik penelitian menjadi topik yang tidak ada tantangannya.',
        E: 'Memalsukan data hasil percobaan agar terlihat berhasil.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Nedes mengajarkan daya juang (resiliensi) untuk bangkit dari kegagalan dan memperbaiki kesalahan.',
      hint: 'Nedes = Tangguh, ulet, resiliensi bangkit dari kegagalan.',
    },
    {
      nomor: 49,
      soal: '[PART 4: SURVEI KARAKTER - FALSAFAH NENEMO (NERIMO)] Falsafah "Nerimo" mencerminkan keikhlasan, kelapangan dada, dan rasa syukur atas hasil maksimal yang telah diikhtiarkan. Ketika pengumuman lomba menempatkan Anda di peringkat kedua, sikap "Nerimo" yang bijak adalah...',
      pilihan: {
        A: 'Protes keras dan menuduh dewan juri bersikap curang tanpa bukti.',
        B: 'Menerima hasil dengan lapang dada, bersyukur atas pengalaman yang didapat, dan mengucapkan selamat kepada pemenang pertama.',
        C: 'Merasa minder dan tidak mau lagi mengikuti lomba di masa depan.',
        D: 'Mengejek karya pemenang pertama di media sosial.',
        E: 'Menyimpan rasa dendam kepada guru pembimbing.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Nerimo adalah keikhlasan dan kelapangan dada menerima takdir hasil setelah ikhtiar maksimal.',
      hint: 'Nerimo = Ikhlas, lapang dada, dan bersyukur.',
    },
    {
      nomor: 50,
      soal: '[PART 4: SURVEI KARAKTER - GOTO ROYONG & CIVIC ENGAGEMENT] Lingkungan sekolah mengalami penumpukan sampah plastik di area kantin. Tindakan kolaboratif yang paling mencerminkan semangat Gotong Royong Pelajar Pancasila adalah...',
      pilihan: {
        A: 'Menunggu petugas kebersihan sekolah datang membersihkan seluruhnya.',
        B: 'Menginisiasi aksi pemilahan sampah bersama teman-teman, kampanye kurangi plastik, dan pengolahan daur ulang.',
        C: 'Menutup kantin sekolah agar tidak ada lagi yang berjualan.',
        D: 'Membakar sampah di halaman sekolah.',
        E: 'Saling menyalahkan antar jenjang kelas.',
      },
      kunci: 'B',
      skor: 2,
      penjelasan: 'Gotong royong aktif ditunjukkan dengan mengambil inisiatif bersama untuk kepedulian lingkungan.',
      hint: 'Inisiatif kolaboratif peduli lingkungan bersama.',
    },
  ];

  return questions;
}

