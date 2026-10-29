import { useEffect, useState } from 'react';

export type NetworkQuality = 'excellent' | 'fair' | 'poor' | 'offline';

export interface NetworkTelemetry {
  isOnline: boolean;
  quality: NetworkQuality;
  downlinkMbps: number;
  rttMs: number;
  effectiveType: string;
  isEcoBitrateMode: boolean;
  qualityLabel: string;
}

export function useNetworkStatus(): NetworkTelemetry {
  const [telemetry, setTelemetry] = useState<NetworkTelemetry>(() => getNetworkTelemetry());

  useEffect(() => {
    function updateTelemetry() {
      setTelemetry(getNetworkTelemetry());
    }

    window.addEventListener('online', updateTelemetry);
    window.addEventListener('offline', updateTelemetry);

    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (conn) {
      conn.addEventListener('change', updateTelemetry);
    }

    // Ping test interval to ensure latency is evaluated dynamically
    const interval = setInterval(updateTelemetry, 10000);

    return () => {
      window.removeEventListener('online', updateTelemetry);
      window.removeEventListener('offline', updateTelemetry);
      if (conn) {
        conn.removeEventListener('change', updateTelemetry);
      }
      clearInterval(interval);
    };
  }, []);

  return telemetry;
}

function getNetworkTelemetry(): NetworkTelemetry {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    return {
      isOnline: false,
      quality: 'offline',
      downlinkMbps: 0,
      rttMs: 9999,
      effectiveType: 'offline',
      isEcoBitrateMode: true,
      qualityLabel: 'Sinyal Terputus (Mode Offline)',
    };
  }

  const conn =
    typeof navigator !== 'undefined'
      ? (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection
      : null;

  const downlink = conn?.downlink || 10; // Mbps
  const rtt = conn?.rtt || 50; // ms
  const effectiveType = conn?.effectiveType || '4g';

  let quality: NetworkQuality = 'excellent';
  let qualityLabel = 'Koneksi Sangat Cepat (4G/Wi-Fi)';
  let isEcoBitrateMode = false;

  if (effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1 || rtt >= 350) {
    quality = 'poor';
    qualityLabel = 'Sinyal Lemah (Hemat Bitrate & Text Only)';
    isEcoBitrateMode = true;
  } else if (effectiveType === '3g' || downlink <= 4 || rtt >= 150) {
    quality = 'fair';
    qualityLabel = 'Koneksi Sedang (3G/HSPA)';
    isEcoBitrateMode = false;
  }

  return {
    isOnline,
    quality,
    downlinkMbps: downlink,
    rttMs: rtt,
    effectiveType,
    isEcoBitrateMode,
    qualityLabel,
  };
}
