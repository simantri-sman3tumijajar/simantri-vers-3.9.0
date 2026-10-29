import { Submission } from '../types';

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Formats any date string, Date object, or timestamp into official Indonesian date format:
 * [Tanggal angka] [Bulan huruf] [Tahun angka] (e.g. "11 Oktober 2026" or "8 Oktober 2026")
 */
export function formatIndonesianDate(
  dateInput?: string | Date | number | null,
  fallbackDate?: Date
): string {
  if (!dateInput) {
    const defaultD = fallbackDate || new Date();
    const day = defaultD.getDate();
    const month = INDONESIAN_MONTHS[defaultD.getMonth()];
    const year = defaultD.getFullYear();
    return `${day} ${month} ${year}`;
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return formatIndonesianDate(null, fallbackDate);
    const day = dateInput.getDate();
    const month = INDONESIAN_MONTHS[dateInput.getMonth()];
    const year = dateInput.getFullYear();
    return `${day} ${month} ${year}`;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatIndonesianDate(null, fallbackDate);
    return `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  const str = String(dateInput).trim();
  if (!str) return formatIndonesianDate(null, fallbackDate);

  // Match YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31 && year > 1900) {
      return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
    }
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const monthIdx = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31 && year > 1900) {
      return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
    }
  }

  // Fallback try standard Date parsing
  const cleanStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getDate()} ${INDONESIAN_MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  // If already contains Indonesian month word, return clean
  if (INDONESIAN_MONTHS.some((m) => str.toLowerCase().includes(m.toLowerCase()))) {
    return str;
  }

  const fallback = fallbackDate || new Date();
  return `${fallback.getDate()} ${INDONESIAN_MONTHS[fallback.getMonth()]} ${fallback.getFullYear()}`;
}

/**
 * Formats date and time into Indonesian date + time string:
 * e.g. "8 Oktober 2026 08:30:00 WIB"
 */
export function formatIndonesianDateTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return `${formatIndonesianDate(new Date())} 08:00:00 WIB`;

  const str = String(dateInput).trim();
  const dateFormatted = formatIndonesianDate(dateInput);

  // Extract time if available
  const timeMatch = str.match(/(\d{2}:\d{2}(?::\d{2})?)/);
  const timePart = timeMatch ? timeMatch[1] : '08:00:00';
  const fullTime = timePart.length === 5 ? `${timePart}:00` : timePart;

  return `${dateFormatted} ${fullTime} WIB`;
}

/**
 * Gets the official report card date based on the latest correction date (tanggal pengoreksian) from submissions.
 * Fallbacks to current date if no correction date is found.
 */
export function getCorrectionDateFormatted(submissions?: Submission[], defaultDate?: Date): string {
  if (submissions && submissions.length > 0) {
    const validDates = submissions
      .map((s) => s.waktuKoreksi)
      .filter((w): w is string => Boolean(w && w.trim().length > 0))
      .map((w) => {
        const cleanStr = w.includes(' ') && !w.includes('T') ? w.replace(' ', 'T') : w;
        return new Date(cleanStr);
      })
      .filter((d) => !isNaN(d.getTime()));

    if (validDates.length > 0) {
      validDates.sort((a, b) => b.getTime() - a.getTime());
      return formatIndonesianDate(validDates[0]);
    }
  }

  return formatIndonesianDate(defaultDate || new Date());
}
