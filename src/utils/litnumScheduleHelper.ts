import { LitNumScheduleConfig, MCQQuestionItem, ReadingPassage } from '../types';

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DEFAULT_LITNUM_SCHEDULE_CONFIG: LitNumScheduleConfig = {
  isEnabled: true,
  scheduleMode: 'otomatis_resmi',
  activeDaysLiterasi: [2], // Selasa
  activeDaysNumerasi: [3], // Rabu
  jamMulai: '07:30',
  jamSelesai: '12:00',
  activeDomain: 'otomatis_hari',
  bypassScheduleForTesting: false,
  pesanPengumuman: 'Pengerjaan Asesmen Literasi & Numerasi terjadwal setiap Selasa (Literasi) dan Rabu (Numerasi) pukul 07:30 - 12:00 WIB.',
};

export interface LitNumScheduleEvaluation {
  isAllowed: boolean;
  statusBadge: 'BUKA_LITERASI' | 'BUKA_NUMERASI' | 'BUKA_SEMUA' | 'DITUTUP_JADWAL' | 'DITUTUP_JAM' | 'NONAKTIF_MANUAL';
  activeDomain: 'literasi' | 'numerasi' | 'semua' | 'none';
  dayIndex: number;
  dayName: string;
  currentHHMM: string;
  reasonTitle: string;
  reasonMessage: string;
  isTuesday: boolean;
  isWednesday: boolean;
  scheduledDaysText: string;
  timeRangeText: string;
}

export function evaluateLitNumSchedule(
  config?: LitNumScheduleConfig,
  currentDate: Date = new Date()
): LitNumScheduleEvaluation {
  const cfg: LitNumScheduleConfig = {
    ...DEFAULT_LITNUM_SCHEDULE_CONFIG,
    ...(config || {}),
  };

  const dayIndex = currentDate.getDay(); // 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, ...
  const dayName = DAY_NAMES[dayIndex] || 'Hari Ini';
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const currentHHMM = `${hours}:${minutes}`;

  const isTuesday = dayIndex === 2;
  const isWednesday = dayIndex === 3;
  const timeRangeText = `${cfg.jamMulai} - ${cfg.jamSelesai} WIB`;

  // 1. Check if master toggle is turned OFF manually
  if (!cfg.isEnabled) {
    return {
      isAllowed: false,
      statusBadge: 'NONAKTIF_MANUAL',
      activeDomain: 'none',
      dayIndex,
      dayName,
      currentHHMM,
      reasonTitle: 'Pengerjaan Sedang Dinonaktifkan',
      reasonMessage:
        cfg.pesanPengumuman ||
        'Pengerjaan Asesmen Literasi & Numerasi saat ini sedang dinonaktifkan oleh Koordinator / Administrator SMAN 3 Tumijajar.',
      isTuesday,
      isWednesday,
      scheduledDaysText: 'Selasa (Literasi) & Rabu (Numerasi)',
      timeRangeText,
    };
  }

  // 2. Check if Testing / Simulation Bypass is enabled by Koordinator
  if (cfg.bypassScheduleForTesting) {
    let domain: 'literasi' | 'numerasi' | 'semua' = 'semua';
    if (cfg.activeDomain === 'literasi' || (cfg.activeDomain === 'otomatis_hari' && isTuesday)) {
      domain = 'literasi';
    } else if (cfg.activeDomain === 'numerasi' || (cfg.activeDomain === 'otomatis_hari' && isWednesday)) {
      domain = 'numerasi';
    }
    return {
      isAllowed: true,
      statusBadge: domain === 'literasi' ? 'BUKA_LITERASI' : domain === 'numerasi' ? 'BUKA_NUMERASI' : 'BUKA_SEMUA',
      activeDomain: domain,
      dayIndex,
      dayName,
      currentHHMM,
      reasonTitle: 'Mode Simulasi & Uji Coba Terbuka',
      reasonMessage: 'Akses pengerjaan dibuka dalam mode simulasi / pengujian oleh Koordinator LitNum.',
      isTuesday,
      isWednesday,
      scheduledDaysText: 'Setiap Hari (Mode Simulasi)',
      timeRangeText: 'Bebas Waktu',
    };
  }

  // Helper to check within time window
  const isWithinTimeWindow = currentHHMM >= cfg.jamMulai && currentHHMM <= cfg.jamSelesai;
  const isBeforeStartTime = currentHHMM < cfg.jamMulai;

  // 3. Automated Weekly Mode (Default: Selasa = Literasi, Rabu = Numerasi, Hari lain = Otomatis Tutup)
  const mode = cfg.scheduleMode || 'otomatis_resmi';

  if (mode === 'otomatis_resmi') {
    if (isTuesday) {
      // Tuesday -> Literasi
      if (isWithinTimeWindow) {
        return {
          isAllowed: true,
          statusBadge: 'BUKA_LITERASI',
          activeDomain: 'literasi',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Literasi Sedang Berlangsung',
          reasonMessage: `Hari ini Selasa adalah jadwal resmi Asesmen Literasi Membaca (${timeRangeText}). Siswa dapat login dan mengerjakan soal.`,
          isTuesday: true,
          isWednesday: false,
          scheduledDaysText: 'Hari Selasa: Khusus Literasi',
          timeRangeText,
        };
      } else if (isBeforeStartTime) {
        return {
          isAllowed: false,
          statusBadge: 'DITUTUP_JAM',
          activeDomain: 'literasi',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Literasi Belum Dimulai',
          reasonMessage: `Hari ini Selasa jadwal Asesmen Literasi Membaca baru akan dibuka pukul ${cfg.jamMulai} WIB (Waktu saat ini: ${currentHHMM} WIB).`,
          isTuesday: true,
          isWednesday: false,
          scheduledDaysText: 'Hari Selasa: Khusus Literasi',
          timeRangeText,
        };
      } else {
        return {
          isAllowed: false,
          statusBadge: 'DITUTUP_JAM',
          activeDomain: 'none',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Literasi Hari Ini Telah Berakhir',
          reasonMessage: `Sesi pengerjaan Asesmen Literasi hari ini telah ditutup pada pukul ${cfg.jamSelesai} WIB. Silakan bersiap untuk sesi Numerasi besok Rabu.`,
          isTuesday: true,
          isWednesday: false,
          scheduledDaysText: 'Hari Selasa: Khusus Literasi',
          timeRangeText,
        };
      }
    } else if (isWednesday) {
      // Wednesday -> Numerasi
      if (isWithinTimeWindow) {
        return {
          isAllowed: true,
          statusBadge: 'BUKA_NUMERASI',
          activeDomain: 'numerasi',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Numerasi Sedang Berlangsung',
          reasonMessage: `Hari ini Rabu adalah jadwal resmi Asesmen Numerasi Matematika/Sains (${timeRangeText}). Siswa dapat login dan mengerjakan soal.`,
          isTuesday: false,
          isWednesday: true,
          scheduledDaysText: 'Hari Rabu: Khusus Numerasi',
          timeRangeText,
        };
      } else if (isBeforeStartTime) {
        return {
          isAllowed: false,
          statusBadge: 'DITUTUP_JAM',
          activeDomain: 'numerasi',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Numerasi Belum Dimulai',
          reasonMessage: `Hari ini Rabu jadwal Asesmen Numerasi baru akan dibuka pukul ${cfg.jamMulai} WIB (Waktu saat ini: ${currentHHMM} WIB).`,
          isTuesday: false,
          isWednesday: true,
          scheduledDaysText: 'Hari Rabu: Khusus Numerasi',
          timeRangeText,
        };
      } else {
        return {
          isAllowed: false,
          statusBadge: 'DITUTUP_JAM',
          activeDomain: 'none',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: 'Sesi Numerasi Hari Ini Telah Berakhir',
          reasonMessage: `Sesi pengerjaan Asesmen Numerasi hari ini telah ditutup pada pukul ${cfg.jamSelesai} WIB.`,
          isTuesday: false,
          isWednesday: true,
          scheduledDaysText: 'Hari Rabu: Khusus Numerasi',
          timeRangeText,
        };
      }
    } else {
      // Any other day: Senin, Kamis, Jumat, Sabtu, Minggu -> Otomatis TUTUP!
      return {
        isAllowed: false,
        statusBadge: 'DITUTUP_JADWAL',
        activeDomain: 'none',
        dayIndex,
        dayName,
        currentHHMM,
        reasonTitle: 'Pengerjaan Ditutup Sesuai Jadwal',
        reasonMessage: `Pengerjaan Asesmen Literasi dan Numerasi SMAN 3 Tumijajar dijadwalkan khusus setiap hari Selasa (Literasi) dan Rabu (Numerasi) pukul ${timeRangeText}. Hari ini (${dayName}) sistem otomatis menutup pengerjaan.`,
        isTuesday: false,
        isWednesday: false,
        scheduledDaysText: 'Selasa (Literasi) & Rabu (Numerasi)',
        timeRangeText,
      };
    }
  }

  // 4. Custom Days Mode
  if (mode === 'kustom_hari') {
    const isLitDay = (cfg.activeDaysLiterasi || [2]).includes(dayIndex);
    const isNumDay = (cfg.activeDaysNumerasi || [3]).includes(dayIndex);

    if (isLitDay || isNumDay) {
      const targetDomain: 'literasi' | 'numerasi' | 'semua' =
        isLitDay && isNumDay ? 'semua' : isLitDay ? 'literasi' : 'numerasi';

      if (isWithinTimeWindow) {
        return {
          isAllowed: true,
          statusBadge: targetDomain === 'literasi' ? 'BUKA_LITERASI' : targetDomain === 'numerasi' ? 'BUKA_NUMERASI' : 'BUKA_SEMUA',
          activeDomain: targetDomain,
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: `Sesi ${targetDomain.toUpperCase()} Aktif (${dayName})`,
          reasonMessage: `Pengerjaan ${targetDomain.toUpperCase()} sedang dibuka pada ${timeRangeText}.`,
          isTuesday,
          isWednesday,
          scheduledDaysText: `${dayName} (${targetDomain})`,
          timeRangeText,
        };
      } else {
        return {
          isAllowed: false,
          statusBadge: 'DITUTUP_JAM',
          activeDomain: 'none',
          dayIndex,
          dayName,
          currentHHMM,
          reasonTitle: isBeforeStartTime ? 'Belum Masuk Jam Pengerjaan' : 'Jam Pengerjaan Telah Selesai',
          reasonMessage: `Pengerjaan dijadwalkan buka pukul ${cfg.jamMulai} sampai ${cfg.jamSelesai} WIB (Waktu saat ini: ${currentHHMM} WIB).`,
          isTuesday,
          isWednesday,
          scheduledDaysText: `${dayName} (${targetDomain})`,
          timeRangeText,
        };
      }
    } else {
      return {
        isAllowed: false,
        statusBadge: 'DITUTUP_JADWAL',
        activeDomain: 'none',
        dayIndex,
        dayName,
        currentHHMM,
        reasonTitle: 'Hari Ini Tidak Ada Jadwal Pengerjaan',
        reasonMessage: `Hari ini (${dayName}) tidak termasuk dalam jadwal pengerjaan yang ditentukan oleh Koordinator.`,
        isTuesday,
        isWednesday,
        scheduledDaysText: 'Sesuai Jadwal Kustom',
        timeRangeText,
      };
    }
  }

  // 5. Open Every Day Mode
  if (isWithinTimeWindow) {
    return {
      isAllowed: true,
      statusBadge: 'BUKA_SEMUA',
      activeDomain: cfg.activeDomain === 'otomatis_hari' ? (isTuesday ? 'literasi' : isWednesday ? 'numerasi' : 'semua') : cfg.activeDomain,
      dayIndex,
      dayName,
      currentHHMM,
      reasonTitle: 'Pengerjaan Terbuka',
      reasonMessage: `Sesi dibuka setiap hari pada jam ${timeRangeText}.`,
      isTuesday,
      isWednesday,
      scheduledDaysText: 'Buka Setiap Hari',
      timeRangeText,
    };
  } else {
    return {
      isAllowed: false,
      statusBadge: 'DITUTUP_JAM',
      activeDomain: 'none',
      dayIndex,
      dayName,
      currentHHMM,
      reasonTitle: 'Di Luar Jam Pengerjaan',
      reasonMessage: `Pengerjaan dibuka pada jam ${timeRangeText} (Waktu saat ini: ${currentHHMM} WIB).`,
      isTuesday,
      isWednesday,
      scheduledDaysText: 'Buka Setiap Hari',
      timeRangeText,
    };
  }
}

/**
 * Official default questions and stimulus reading passages for SMAN 3 Tumijajar Literasi & Numerasi
 */
export const DEFAULT_LITERASI_PASSAGE: ReadingPassage = {
  id: 'wacana-lit-1',
  judul: 'Konservasi Air Tanah dan Kearifan Lokal di Kawasan Tulang Bawang Barat',
  nomorAwal: 1,
  nomorAkhir: 5,
  nomorSoalTerkait: [1, 2, 3, 4, 5],
  teks: `Air tanah merupakan sumber daya vital bagi keberlangsungan ekosistem dan kehidupan masyarakat di Kabupaten Tulang Bawang Barat, khususnya di sekitar wilayah Tumijajar. Dalam beberapa dekade terakhir, peningkatan alih fungsi lahan perkebunan karet dan sawit serta percepatan urbanisasi telah mengubah pola resapan air permukaan. Berdasarkan riset hidrologi terapan, koefisien limpasan permukaan mengalami lonjakan hingga 35%, yang memicu penurunan muka air sumur warga secara bertahap saat musim kemarau panjang.

Menghadapi tantangan tersebut, masyarakat bersama komunitas pendidikan di SMAN 3 Tumijajar mempelopori gerakan konservasi terpadu berbasis sumur resapan biopori mandiri dan penanaman vegetasi berakar tunjang seperti pohon trembesi dan beringin karet. Gerakan ini mengintegrasikan kearifan lokal "Piil Pesenggiri" yang menjunjung tinggi kehormatan, kepedulian sosial, serta tanggung jawab menjaga kelestarian bumi pertiwi.

Melalui pendekatan Deep Learning (pembelajaran mendalam yang bermakna dan berkesadaran), para peserta didik tidak hanya menghitung debit resapan air, tetapi juga menganalisis korelasi antara kerapatan kanopi pohon dengan kelembapan tanah mikro. Dampak nyata dari inisiatif ini mulai terasa: muka air tanah sumur observasi sekolah berhasil stabil pada kedalaman 4,2 meter sepanjang tahun, menjadi percontohan nyata bagi desa-desa penyangga di sekitarnya.`,
  konten: `Air tanah merupakan sumber daya vital bagi keberlangsungan ekosistem dan kehidupan masyarakat di Kabupaten Tulang Bawang Barat, khususnya di sekitar wilayah Tumijajar. Dalam beberapa dekade terakhir, peningkatan alih fungsi lahan perkebunan karet dan sawit serta percepatan urbanisasi telah mengubah pola resapan air permukaan. Berdasarkan riset hidrologi terapan, koefisien limpasan permukaan mengalami lonjakan hingga 35%, yang memicu penurunan muka air sumur warga secara bertahap saat musim kemarau panjang.

Menghadapi tantangan tersebut, masyarakat bersama komunitas pendidikan di SMAN 3 Tumijajar mempelopori gerakan konservasi terpadu berbasis sumur resapan biopori mandiri dan penanaman vegetasi berakar tunjang seperti pohon trembesi dan beringin karet. Gerakan ini mengintegrasikan kearifan lokal "Piil Pesenggiri" yang menjunjung tinggi kehormatan, kepedulian sosial, serta tanggung jawab menjaga kelestarian bumi pertiwi.

Melalui pendekatan Deep Learning (pembelajaran mendalam yang bermakna dan berkesadaran), para peserta didik tidak hanya menghitung debit resapan air, tetapi juga menganalisis korelasi antara kerapatan kanopi pohon dengan kelembapan tanah mikro. Dampak nyata dari inisiatif ini mulai terasa: muka air tanah sumur observasi sekolah berhasil stabil pada kedalaman 4,2 meter sepanjang tahun, menjadi percontohan nyata bagi desa-desa penyangga di sekitarnya.`,
};

export const DEFAULT_LITERASI_QUESTIONS: MCQQuestionItem[] = [
  {
    nomor: 1,
    modelSoal: 'PG',
    domainLitNum: 'literasi',
    wacanaId: 'wacana-lit-1',
    soal: 'Berdasarkan wacana di atas, faktor utama apakah yang menyebabkan terjadinya lonjakan koefisien limpasan permukaan air tanah di wilayah Tulang Bawang Barat?',
    pilihan: {
      A: 'Peningkatan curah hujan ekstrem yang berlangsung terus-menerus',
      B: 'Alih fungsi lahan perkebunan serta percepatan laju urbanisasi',
      C: 'Penggunaan pompa air tanah berdaya tinggi oleh sektor industri besar',
      D: 'Penanaman massal pohon trembesi dan beringin karet di tepi jalan',
      E: 'Penurunan drastis populasi vegetasi semak di lahan gambut basah',
    },
    kunci: 'B',
    skor: 4,
    penjelasan: 'Teks secara eksplisit menyebutkan peningkatan alih fungsi lahan perkebunan karet dan sawit serta percepatan urbanisasi telah mengubah pola resapan air permukaan.',
  },
  {
    nomor: 2,
    modelSoal: 'PG_KOMPLEKS',
    domainLitNum: 'literasi',
    wacanaId: 'wacana-lit-1',
    soal: 'Pilihlah DUA atau LEBIH tindakan nyata yang dipelopori civitas akademika SMAN 3 Tumijajar dalam menjaga stabilitas muka air tanah:',
    pilihan: {
      A: 'Pembangunan sumur resapan biopori mandiri di lingkungan sekolah',
      B: 'Penanaman vegetasi berakar tunjang seperti pohon trembesi',
      C: 'Penebangan pohon tua untuk memperluas area resapan pasir terbuka',
      D: 'Penerapan nilai kearifan lokal Piil Pesenggiri dalam konservasi lingkungan',
      E: 'Pengalihan aliran sungai utama menuju saluran drainase beton tertutup',
    },
    kunci: 'A, B, D',
    kunciMulti: ['A', 'B', 'D'],
    skor: 5,
    penjelasan: 'Upaya yang dilakukan meliputi pembuatan sumur biopori, penanaman vegetasi berakar tunjang, serta pengintegrasian nilai Piil Pesenggiri.',
  },
  {
    nomor: 3,
    modelSoal: 'BS',
    domainLitNum: 'literasi',
    wacanaId: 'wacana-lit-1',
    soal: 'Tentukan kebenaran pernyataan berikut: "Penerapan pembelajaran Deep Learning di SMAN 3 Tumijajar membuat siswa hanya menghafal teori debit air tanpa menganalisis hubungan lingkungan nyata."',
    pilihan: {
      A: 'BENAR',
      B: 'SALAH',
      C: '',
      D: '',
      E: '',
    },
    kunci: 'Salah',
    skor: 3,
    penjelasan: 'Pernyataan SALAH karena Deep Learning mendorong siswa menganalisis korelasi kanopi pohon dan kelembapan secara bermakna.',
  },
  {
    nomor: 4,
    modelSoal: 'PG',
    domainLitNum: 'literasi',
    wacanaId: 'wacana-lit-1',
    soal: 'Apa indikator keberhasilan paling nyata yang tercatat dari program konservasi air yang dilakukan di SMAN 3 Tumijajar?',
    pilihan: {
      A: 'Jumlah sumur observasi bertambah hingga mencapai 100 titik di kecamatan',
      B: 'Muka air tanah di sumur observasi sekolah stabil pada kedalaman 4,2 meter',
      C: 'Curah hujan tahunan di Tumijajar meningkat sebesar 25 persen',
      D: 'Biaya tagihan air PDAM sekolah berkurang secara drastis',
      E: 'Terbentuknya waduk buatan baru di perbatasan kabupaten',
    },
    kunci: 'B',
    skor: 4,
    penjelasan: 'Paragraf terakhir menegaskan bahwa muka air tanah sumur observasi sekolah berhasil stabil pada kedalaman 4,2 meter sepanjang tahun.',
  },
  {
    nomor: 5,
    modelSoal: 'PG',
    domainLitNum: 'literasi',
    wacanaId: 'wacana-lit-1',
    soal: 'Makna tersirat dari keterlibatan nilai "Piil Pesenggiri" dalam proyek konservasi air adalah...',
    pilihan: {
      A: 'Pelestarian alam merupakan bagian tak terpisahkan dari martabat dan tanggung jawab moral masyarakat',
      B: 'Konservasi lingkungan hanya boleh dipimpin oleh tokoh adat setempat',
      C: 'Setiap sumur resapan harus dinamai menggunakan gelar kebangsawanan Lampung',
      D: 'Nilai budaya bersifat kaku dan tidak dapat dihubungkan dengan riset ilmiah modern',
      E: 'Upaya lingkungan hidup harus mendapatkan sertifikasi adat sebelum dijalankan',
    },
    kunci: 'A',
    skor: 4,
    penjelasan: 'Piil Pesenggiri diposisikan sebagai fondasi martabat dan tanggung jawab sosial dalam menjaga kelestarian bumi.',
  },
];

export const DEFAULT_NUMERASI_QUESTIONS: MCQQuestionItem[] = [
  {
    nomor: 1,
    modelSoal: 'PG',
    domainLitNum: 'numerasi',
    soal: 'Sebuah tangki penampung air hujan berbentuk silinder di laboratorium biologi SMAN 3 Tumijajar memiliki jari-jari alas $r = 1{,}4\\text{ m}$ dan tinggi $h = 2{,}5\\text{ m}$. Jika debit air resapan yang masuk adalah $Q = 308\\text{ liter/menit}$, waktu yang dibutuhkan untuk mengisi tangki dari keadaan kosong hingga penuh adalah... (Gunakan $\\pi = \\frac{22}{7}$ dan $1\\text{ m}^3 = 1.000\\text{ liter}$)',
    pilihan: {
      A: '35 menit',
      B: '45 menit',
      C: '50 menit',
      D: '55 menit',
      E: '60 menit',
    },
    kunci: 'C',
    skor: 4,
    penjelasan: 'Volume silinder $V = \\pi r^2 h = \\frac{22}{7} \\times (1{,}4)^2 \\times 2{,}5 = 15{,}4\\text{ m}^3 = 15.400\\text{ liter}$. Waktu $t = \\frac{15.400}{308} = 50\\text{ menit}$.',
  },
  {
    nomor: 2,
    modelSoal: 'PG_KOMPLEKS',
    domainLitNum: 'numerasi',
    soal: 'Data hasil panen melon hidroponik siswa Fase F selama 5 pekan berturut-turut adalah: $40\\text{ kg}, 45\\text{ kg}, 50\\text{ kg}, 55\\text{ kg}, 60\\text{ kg}$. Tentukan pernyataan numerasi statistika berikut yang bernilai BENAR:',
    pilihan: {
      A: 'Rata-rata (mean) hasil panen mingguan adalah 50 kg',
      B: 'Nilai median hasil panen berada pada pekan ke-3 yaitu 50 kg',
      C: 'Jangkauan (range) hasil panen dari pekan pertama ke kelima adalah 20 kg',
      D: 'Simpangan baku hasil panen bernilai nol karena data berurutan',
      E: 'Jika pekan ke-6 panen mencapai 70 kg, maka rata-rata baru menjadi 53,3 kg',
    },
    kunci: 'A, B, C, E',
    kunciMulti: ['A', 'B', 'C', 'E'],
    skor: 5,
    penjelasan: 'Semua benar kecuali D karena ada variasi selisih 5 kg sehingga simpangan baku bukan nol.',
  },
  {
    nomor: 3,
    modelSoal: 'PG',
    domainLitNum: 'numerasi',
    soal: 'Panel surya di atap gedung perpustakaan SMAN 3 Tumijajar mampu menghasilkan energi listrik sebesar $E = P \\times t$. Jika daya terpasang adalah $P = 2{,}4\\text{ kW}$ dan efisiensi konversi sinar matahari adalah $80\\%$, berapakah total energi bersih yang dihasilkan selama 5 jam penyinaran terik?',
    pilihan: {
      A: '7,2 kWh',
      B: '8,4 kWh',
      C: '9,6 kWh',
      D: '12,0 kWh',
      E: '14,4 kWh',
    },
    kunci: 'C',
    skor: 4,
    penjelasan: 'Energi total = 2,4 kW x 5 jam = 12 kWh. Energi bersih = 80% x 12 kWh = 9,6 kWh.',
  },
  {
    nomor: 4,
    modelSoal: 'BS',
    domainLitNum: 'numerasi',
    soal: 'Sebuah mobil listrik milik sekolah bergerak lurus dengan percepatan konstan $a = 2\\text{ m/s}^2$ dari keadaan diam ($v_0 = 0$). Tentukan kebenaran pernyataan berikut: "Dalam waktu $t = 6\\text{ detik}$, jarak yang telah ditempuh mobil tersebut tepat berjarak $36\\text{ meter}$."',
    pilihan: {
      A: 'BENAR',
      B: 'SALAH',
      C: '',
      D: '',
      E: '',
    },
    kunci: 'Benar',
    skor: 3,
    penjelasan: 'Rumus GLBB: $s = v_0 t + \\frac{1}{2} a t^2 = 0 + \\frac{1}{2} (2) (6^2) = 36\\text{ meter}$. Pernyataan BENAR.',
  },
  {
    nomor: 5,
    modelSoal: 'PG',
    domainLitNum: 'numerasi',
    soal: 'Dalam survei minat literasi siswa SMAN 3 Tumijajar terhadap 120 responden, diperoleh rasio peminat buku sains fiksi terhadap non-fiksi adalah $5 : 3$. Berapakah selisih jumlah siswa yang memilih buku sains fiksi dibandingkan buku non-fiksi?',
    pilihan: {
      A: '15 siswa',
      B: '20 siswa',
      C: '25 siswa',
      D: '30 siswa',
      E: '35 siswa',
    },
    kunci: 'D',
    skor: 4,
    penjelasan: 'Total rasio = 5 + 3 = 8 bagian. 1 bagian = 120 / 8 = 15 siswa. Selisih = (5 - 3) bagian = 2 x 15 = 30 siswa.',
  },
];
