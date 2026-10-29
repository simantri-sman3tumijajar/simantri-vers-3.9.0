/**
 * Device Policy & Auto-Detection Engine for SiMantri CBT (ASAJ & School Exams)
 * Supports:
 * 1. Mode Khusus HP Android (BYOD - Bring Your Own Device) with Anti-Joki Hardware Binding
 * 2. Mode Khusus Klien Lab (Laptop / Chromebook) with Shared Client multi-session support
 * 3. Mode Hibrida (Semua Perangkat Terpantau)
 */

export type DetectedDeviceType = 'android' | 'chromebook' | 'laptop' | 'desktop' | 'unknown';

export interface DeviceInfoResult {
  deviceType: DetectedDeviceType;
  deviceDetails: string;
  isTouchScreen: boolean;
  screenResolution: string;
  fingerprint: string;
}

const STORAGE_FINGERPRINT_KEY = 'simantri_cbt_device_fingerprint';
const STORAGE_BINDING_KEY = 'simantri_cbt_bound_student';

/**
 * Detects device category from userAgent, platform, and touch capabilities
 */
export function detectDeviceType(): DetectedDeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  const ua = navigator.userAgent || '';
  const appVer = navigator.appVersion || '';

  // 1. Chromebook Detection
  if (/CrOS/i.test(ua) || /CrOS/i.test(appVer)) {
    return 'chromebook';
  }

  // 2. Android Smartphone / Tablet Detection
  if (/Android/i.test(ua)) {
    return 'android';
  }

  // 3. Desktop / Laptop Windows, Mac, Linux
  if (/Windows/i.test(ua) || /Macintosh|Mac OS X/i.test(ua) || (/Linux/i.test(ua) && !/Android/i.test(ua))) {
    // Check if likely a laptop or desktop
    const isTouch = navigator.maxTouchPoints > 0;
    const hasBattery = 'getBattery' in navigator;
    return isTouch && hasBattery ? 'laptop' : 'laptop';
  }

  return 'unknown';
}

/**
 * Generates a descriptive human-readable label for device telemetries
 */
export function getDeviceDetails(type?: DetectedDeviceType): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Perangkat CBT';
  }

  const ua = navigator.userAgent || '';
  const resolvedType = type || detectDeviceType();

  if (resolvedType === 'android') {
    // Attempt to extract Android model
    const match = ua.match(/Android\s+([0-9.]+);?\s*(.*?)(?:\s+Build|\s*;|\))/i);
    const androidVer = match ? `Android ${match[1]}` : 'Android';
    const rawModel = match && match[2] ? match[2].trim() : '';
    const cleanModel = rawModel.replace(/;\s*wv|wv/g, '').trim();
    return cleanModel ? `HP Android (${cleanModel}, ${androidVer})` : `Smartphone (${androidVer})`;
  }

  if (resolvedType === 'chromebook') {
    return 'Google Chromebook (ChromeOS Lab)';
  }

  if (/Windows NT 10.0/i.test(ua)) return 'Laptop / PC (Windows 10/11)';
  if (/Macintosh/i.test(ua)) return 'MacBook / Mac OS';
  if (/Linux/i.test(ua)) return 'Laptop / PC (Linux Desktop)';

  return 'Komputer / Laptop Klien CBT';
}

/**
 * Retrieves or generates a consistent unique device fingerprint token
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server_render_fingerprint';

  try {
    let fp = localStorage.getItem(STORAGE_FINGERPRINT_KEY);
    if (!fp) {
      const screenInfo = `${window.screen.width}x${window.screen.height}_${window.screen.colorDepth}`;
      const lang = navigator.language || 'id';
      const randomSeed = Math.random().toString(36).substring(2, 9);
      const timeStamp = Date.now().toString(36);
      fp = `fp_${screenInfo}_${lang}_${timeStamp}_${randomSeed}`;
      localStorage.setItem(STORAGE_FINGERPRINT_KEY, fp);
    }
    return fp;
  } catch {
    return `fp_session_${Date.now()}`;
  }
}

/**
 * Full device telemetry snapshot
 */
export function getDeviceInfoSnapshot(): DeviceInfoResult {
  const deviceType = detectDeviceType();
  const screenResolution =
    typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  const isTouchScreen = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const deviceDetails = getDeviceDetails(deviceType);
  const fingerprint = getDeviceFingerprint();

  return {
    deviceType,
    deviceDetails,
    isTouchScreen,
    screenResolution,
    fingerprint,
  };
}

/**
 * Validates whether the current student device matches the exam schedule policy
 */
export function validateDevicePolicy(
  policy?: 'android_only' | 'lab_client_only' | 'hybrid',
  detectedType?: DetectedDeviceType
): { isAllowed: boolean; reason?: string; recommendedDevice?: string } {
  const activePolicy = policy || 'hybrid';
  const currentType = detectedType || detectDeviceType();

  // Mode 1: Khusus HP Android (BYOD)
  if (activePolicy === 'android_only') {
    if (currentType !== 'android') {
      return {
        isAllowed: false,
        recommendedDevice: 'HP Android (Smartphone)',
        reason:
          'Ujian ASAJ ini diatur dalam Kebijakan Khusus HP Android Siswa (BYOD). Anda terdeteksi menggunakan Laptop / Komputer / Chromebook. Silakan login kembali menggunakan smartphone Android Anda.',
      };
    }
  }

  // Mode 2: Khusus Klien Lab (Laptop / Chromebook)
  if (activePolicy === 'lab_client_only') {
    if (currentType === 'android') {
      return {
        isAllowed: false,
        recommendedDevice: 'Chromebook / Laptop Lab Sekolah',
        reason:
          'Ujian ASAJ ini diatur dalam Kebijakan Khusus Klien Lab Sekolah (Chromebook / Laptop). Akses melalui HP Android pribadi ditahan. Silakan gunakan komputer lab yang telah disediakan.',
      };
    }
  }

  // Mode 3: Hibrida (Semua Perangkat Diizinkan)
  return { isAllowed: true };
}

/**
 * Anti-Joki Device Binding Engine for HP Android
 * - Binds 1 Android phone to 1 Student ID during an active exam schedule.
 * - Prevents Student B from taking over Student A's phone or vice versa.
 * - Shared Chromebook/Laptops are marked as shared lab clients and exempted from multi-student lockouts across different sessions.
 */
export function checkOrBindStudentDevice(
  studentId: string,
  studentName: string,
  examScheduleId: string,
  detectedType?: DetectedDeviceType
): {
  isSuccess: boolean;
  isConflict: boolean;
  conflictStudentName?: string;
  message?: string;
} {
  if (typeof window === 'undefined') return { isSuccess: true, isConflict: false };

  const currentType = detectedType || detectDeviceType();

  // If Chromebook or Desktop Lab, enable Shared Client Mode (reusable across sessions)
  if (currentType === 'chromebook' || currentType === 'laptop' || currentType === 'desktop') {
    return { isSuccess: true, isConflict: false };
  }

  try {
    const raw = localStorage.getItem(STORAGE_BINDING_KEY);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (raw) {
      const binding = JSON.parse(raw);
      // Check if binding belongs to another student on the same date/schedule
      const isSameDayOrSchedule =
        binding.date === todayStr || binding.examScheduleId === examScheduleId;

      if (isSameDayOrSchedule && binding.studentId !== studentId) {
        return {
          isSuccess: false,
          isConflict: true,
          conflictStudentName: binding.studentName || 'Siswa Lain',
          message: `Proteksi Anti-Joki Aktif: Perangkat HP Android ini telah terikat resmi ke akun siswa "${binding.studentName}". Satu HP tidak dapat digunakan bergantian dengan akun lain pada sesi/hari yang sama. Hubungi Proktor jika membutuhkan pergantian perangkat.`,
        };
      }
    }

    // Bind current student to this Android device
    const newBinding = {
      studentId,
      studentName,
      examScheduleId,
      date: todayStr,
      boundAt: now.toISOString(),
      fingerprint: getDeviceFingerprint(),
      deviceType: currentType,
    };
    localStorage.setItem(STORAGE_BINDING_KEY, JSON.stringify(newBinding));
    return { isSuccess: true, isConflict: false };
  } catch {
    return { isSuccess: true, isConflict: false };
  }
}

/**
 * Proctors can reset device binding so a student whose phone broke/died can switch devices
 */
export function resetDeviceBinding(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_BINDING_KEY);
  } catch {}
}

/**
/**
 * Workstation Metadata & Lab Device Capacity Engine
 * Preserves Workstation ID (e.g. CB-01 s/d CB-30) across student sessions.
 */
export interface WorkstationMetadata {
  workstationId: string; // e.g. "CB-01" or "LAPTOP-01"
  roomName: string; // e.g. "Lab CBT Utama"
  deviceType: DetectedDeviceType;
  assignedAt: string;
}

export const STORAGE_WORKSTATION_KEY = 'simantri_workstation_meta';

export function getWorkstationMeta(): WorkstationMetadata | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check URL parameters for explicit workstation override (e.g., ?ws=05 or ?unit=CB-05)
    const searchParams = new URLSearchParams(window.location.search);
    const urlWs = searchParams.get('ws') || searchParams.get('unit') || searchParams.get('workstation');
    if (urlWs) {
      const type = detectDeviceType();
      const prefix = type === 'chromebook' ? 'CB-' : type === 'android' ? 'HP-' : 'LAPTOP-';
      const cleanWs = urlWs.toUpperCase().startsWith('CB-') || urlWs.toUpperCase().startsWith('LAPTOP-') || urlWs.toUpperCase().startsWith('PC-')
        ? urlWs.toUpperCase()
        : `${prefix}${urlWs.replace(/\D/g, '').padStart(2, '0') || '01'}`;
      
      const meta: WorkstationMetadata = {
        workstationId: cleanWs,
        roomName: 'Lab CBT Utama',
        deviceType: type,
        assignedAt: new Date().toISOString(),
      };
      saveWorkstationMeta(meta);
      return meta;
    }

    const raw = localStorage.getItem(STORAGE_WORKSTATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWorkstationMeta(meta: WorkstationMetadata): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_WORKSTATION_KEY, JSON.stringify(meta));
  } catch {}
}

export function setCustomWorkstationId(
  customId: string,
  roomName: string = 'Lab CBT Utama'
): string {
  if (typeof window === 'undefined') return customId;
  try {
    const type = detectDeviceType();
    const prefix = type === 'chromebook' ? 'CB-' : type === 'android' ? 'HP-' : 'LAPTOP-';
    const cleanId = customId.toUpperCase().startsWith('CB-') || customId.toUpperCase().startsWith('LAPTOP-') || customId.toUpperCase().startsWith('PC-') || customId.toUpperCase().startsWith('UNIT-')
      ? customId.toUpperCase()
      : `${prefix}${customId.replace(/\D/g, '').padStart(2, '0') || '01'}`;

    const newMeta: WorkstationMetadata = {
      workstationId: cleanId,
      roomName,
      deviceType: type,
      assignedAt: new Date().toISOString(),
    };
    saveWorkstationMeta(newMeta);
    return cleanId;
  } catch {
    return customId;
  }
}

export function getOrAssignWorkstationId(
  deviceType?: DetectedDeviceType,
  roomName: string = 'Lab CBT Utama',
  maxQuota: number = 30
): string {
  if (typeof window === 'undefined') return 'CB-01';
  try {
    const existing = getWorkstationMeta();
    if (existing && existing.workstationId) {
      return existing.workstationId;
    }

    const type = deviceType || detectDeviceType();
    const prefix = type === 'chromebook' ? 'CB-' : type === 'android' ? 'HP-' : 'LAPTOP-';
    
    // Assign deterministic unit ID based on device fingerprint hash (1..maxQuota)
    const fp = getDeviceFingerprint();
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      hash = (Math.imul(31, hash) + fp.charCodeAt(i)) | 0;
    }
    const unitIndex = (Math.abs(hash) % Math.max(1, maxQuota)) + 1;
    const initialId = `${prefix}${String(unitIndex).padStart(2, '0')}`;

    const newMeta: WorkstationMetadata = {
      workstationId: initialId,
      roomName,
      deviceType: type,
      assignedAt: new Date().toISOString(),
    };
    saveWorkstationMeta(newMeta);
    return initialId;
  } catch {
    return 'CB-01';
  }
}

/**
 * Clears active student login data, answers, and session cache
 * STRICTLY PRESERVING workstation identity & device fingerprint in localStorage!
 */
export function clearStudentSessionPreservingWorkstation(): void {
  if (typeof window === 'undefined') return;
  try {
    const wsMeta = localStorage.getItem(STORAGE_WORKSTATION_KEY);
    const fp = localStorage.getItem(STORAGE_FINGERPRINT_KEY);

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('simantri_cbt_answers_') ||
          k.startsWith('simantri_cbt_bundle_') ||
          k.startsWith('simantri_cbt_backup_') ||
          k.startsWith('simantri_anticheat_'))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    sessionStorage.removeItem('smantri_active_student_id');
    sessionStorage.removeItem('smantri_exam_entry_type');

    if (wsMeta) localStorage.setItem(STORAGE_WORKSTATION_KEY, wsMeta);
    if (fp) localStorage.setItem(STORAGE_FINGERPRINT_KEY, fp);
  } catch (err) {
    console.warn('Error clearing student session preserving workstation:', err);
  }
}

/**
 * Universal cross-browser fullscreen request for ChromeOS, Windows, macOS, Linux
 */
export async function requestAutoFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    if (document.fullscreenElement) return true;
    const docEl = document.documentElement as any;
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
      return true;
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
      return true;
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
      return true;
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Fullscreen API] User gesture or browser policy notice:', err);
    return false;
  }
}

/**
 * Safely exits fullscreen when returning to login page or finishing exam
 */
export async function exitAutoFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    if (!document.fullscreenElement) return true;
    const doc = document as any;
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return true;
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

