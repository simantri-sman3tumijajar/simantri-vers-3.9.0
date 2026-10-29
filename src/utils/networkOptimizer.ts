/**
 * Comprehensive Network Speed & Data Quota Optimization Utility
 * Specifically designed for mobile hotspot / tethering with limited bandwidth (600 kb/s - 1200 kb/s / 1.2 MB/s)
 * and varying internet conditions across diverse devices.
 */

export type DataSaverMode = 'auto' | 'high_saver' | 'balanced' | 'full_speed';

export interface NetworkSpeedStatus {
  effectiveType: string; // 'slow-2g' | '2g' | '3g' | '4g' | 'wifi'
  downlinkMbps: number; // e.g. 0.6 = 600 kb/s, 1.2 = 1.2 MB/s
  rttMs: number; // Round trip time in ms
  saveDataEnabled: boolean;
  userPreference: DataSaverMode;
  activeMode: 'ULTRA_SAVER' | 'BALANCED_SAVER' | 'HIGH_SPEED';
  speedLabel: string;
  isHotspotLikely: boolean;
  suggestedDimension: number;
  suggestedQuality: number;
  maxUploadSizeBytes: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latencyMs: number;
  effectiveType: string;
  isLiteMode: boolean;
}

const STORAGE_KEY = 'smantri_data_saver_mode';
const LITE_MODE_KEY = 'smantri_lite_mode';

let cachedPreference: DataSaverMode = (typeof localStorage !== 'undefined' 
  ? (localStorage.getItem(STORAGE_KEY) as DataSaverMode) || 'auto' 
  : 'auto');

let cachedLiteMode: boolean = (typeof localStorage !== 'undefined'
  ? localStorage.getItem(LITE_MODE_KEY) === 'true'
  : false);

let currentLatencyMs: number = 42;

const listeners: Array<(status: NetworkSpeedStatus) => void> = [];
const legacyListeners: Array<(status: NetworkStatus) => void> = [];

export function getDataSaverPreference(): DataSaverMode {
  return cachedPreference;
}

export function setDataSaverPreference(mode: DataSaverMode): NetworkSpeedStatus {
  cachedPreference = mode;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  const status = getNetworkSpeedStatus();
  notifyAll();
  return status;
}

export function subscribeNetworkStatus(callback: (status: NetworkSpeedStatus) => void): () => void {
  listeners.push(callback);
  callback(getNetworkSpeedStatus());

  if (typeof window !== 'undefined') {
    const handleConnChange = () => notifyAll();
    window.addEventListener('online', handleConnChange);
    window.addEventListener('offline', handleConnChange);

    const conn = (navigator as any)?.connection;
    if (conn) {
      conn.addEventListener?.('change', handleConnChange);
    }

    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
      window.removeEventListener('online', handleConnChange);
      window.removeEventListener('offline', handleConnChange);
      if (conn) {
        conn.removeEventListener?.('change', handleConnChange);
      }
    };
  }

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyAll() {
  const speedStat = getNetworkSpeedStatus();
  listeners.forEach((fn) => fn(speedStat));
  
  const legacyStat = getLegacyNetworkStatus();
  legacyListeners.forEach((fn) => fn(legacyStat));
}

export function getNetworkSpeedStatus(): NetworkSpeedStatus {
  let downlinkMbps = 10;
  let rttMs = 50;
  let effectiveType = '4g';
  let saveDataEnabled = false;

  if (typeof navigator !== 'undefined') {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        if (typeof conn.downlink === 'number') downlinkMbps = conn.downlink;
        if (typeof conn.rtt === 'number') rttMs = conn.rtt;
        if (conn.effectiveType) effectiveType = conn.effectiveType;
        saveDataEnabled = !!conn.saveData;
      }
    }
    if (!navigator.onLine) {
      downlinkMbps = 0;
      effectiveType = 'offline';
    }
  }

  // Hotspot detection heuristics (downlink between 0.3 and 2.0 Mbps with medium-high RTT)
  const isHotspotLikely = saveDataEnabled || (downlinkMbps >= 0.3 && downlinkMbps <= 2.0 && rttMs > 80);

  let activeMode: 'ULTRA_SAVER' | 'BALANCED_SAVER' | 'HIGH_SPEED' = 'BALANCED_SAVER';

  if (cachedPreference === 'high_saver' || cachedLiteMode) {
    activeMode = 'ULTRA_SAVER';
  } else if (cachedPreference === 'full_speed') {
    activeMode = 'HIGH_SPEED';
  } else if (cachedPreference === 'balanced') {
    activeMode = 'BALANCED_SAVER';
  } else {
    // Auto Mode
    if (downlinkMbps < 0.8 || effectiveType === '2g' || effectiveType === 'slow-2g' || saveDataEnabled) {
      activeMode = 'ULTRA_SAVER';
    } else if (downlinkMbps <= 2.0 || effectiveType === '3g' || isHotspotLikely) {
      activeMode = 'BALANCED_SAVER';
    } else {
      activeMode = 'HIGH_SPEED';
    }
  }

  let speedLabel = `${downlinkMbps.toFixed(1)} Mbps`;
  if (downlinkMbps < 1) {
    speedLabel = `${Math.round(downlinkMbps * 1000)} kb/s`;
  }

  let suggestedDimension = 1400;
  let suggestedQuality = 0.78;
  let maxUploadSizeBytes = 300 * 1024; // 300KB

  if (activeMode === 'ULTRA_SAVER') {
    suggestedDimension = 1024;
    suggestedQuality = 0.65;
    maxUploadSizeBytes = 180 * 1024; // ~180KB for super fast transmission on 600 kb/s hotspot
  } else if (activeMode === 'BALANCED_SAVER') {
    suggestedDimension = 1360;
    suggestedQuality = 0.78;
    maxUploadSizeBytes = 350 * 1024; // ~350KB for 600 kb/s - 1200 kb/s
  } else {
    suggestedDimension = 1800;
    suggestedQuality = 0.88;
    maxUploadSizeBytes = 800 * 1024; // ~800KB
  }

  return {
    effectiveType,
    downlinkMbps,
    rttMs,
    saveDataEnabled,
    userPreference: cachedPreference,
    activeMode,
    speedLabel,
    isHotspotLikely,
    suggestedDimension,
    suggestedQuality,
    maxUploadSizeBytes,
  };
}

function getLegacyNetworkStatus(): NetworkStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const speed = getNetworkSpeedStatus();
  
  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (!isOnline) quality = 'poor';
  else if (speed.downlinkMbps > 3.0) quality = 'excellent';
  else if (speed.downlinkMbps >= 1.0) quality = 'good';
  else if (speed.downlinkMbps >= 0.4) quality = 'fair';
  else quality = 'poor';

  return {
    isOnline,
    quality,
    latencyMs: currentLatencyMs,
    effectiveType: speed.effectiveType,
    isLiteMode: cachedLiteMode || speed.activeMode === 'ULTRA_SAVER',
  };
}

export const networkOptimizer = {
  getStatus: (): NetworkStatus => getLegacyNetworkStatus(),
  subscribe: (callback: (s: NetworkStatus) => void) => {
    legacyListeners.push(callback);
    callback(getLegacyNetworkStatus());
    return () => {
      const idx = legacyListeners.indexOf(callback);
      if (idx !== -1) legacyListeners.splice(idx, 1);
    };
  },
  measureLatency: async (): Promise<number> => {
    const start = Date.now();
    try {
      await fetch('/api/mobile-sync/session/list?_t=' + Date.now());
      currentLatencyMs = Math.max(10, Date.now() - start);
    } catch (e) {
      currentLatencyMs = 120;
    }
    notifyAll();
    return currentLatencyMs;
  },
  toggleLiteMode: () => {
    cachedLiteMode = !cachedLiteMode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LITE_MODE_KEY, String(cachedLiteMode));
    }
    notifyAll();
  },
};
