// Smart Adaptive Network & Bandwidth Management Engine
// Penyesuaian pintar secara berkala untuk meminimalkan bitrate & konsumsi kuota

export type NetworkTier = 'eco' | 'balanced' | 'standard';
export type UserNetworkPreference = 'auto' | 'eco' | 'balanced' | 'standard';

export interface NetworkProfile {
  tier: NetworkTier;
  effectiveType: string;
  downlink: number; // in Mbps
  rtt: number; // in ms
  saveData: boolean;
  pollIntervalMs: number;
  autosaveDebounceMs: number;
  isWeakConnection: boolean;
  description: string;
}

class SmartNetworkAdapter {
  private userPreference: UserNetworkPreference = 'auto';
  private currentProfile: NetworkProfile;
  private listeners: Set<(profile: NetworkProfile) => void> = new Set();
  private rollingLatency: number[] = [60];
  private periodicCheckTimer: any = null;

  constructor() {
    this.userPreference = this.loadPreference();
    this.currentProfile = this.calculateProfile();
    this.initListeners();
    this.startPeriodicCheck();
  }

  private loadPreference(): UserNetworkPreference {
    if (typeof window === 'undefined') return 'auto';
    const saved = localStorage.getItem('smantri_network_preference') as UserNetworkPreference;
    if (saved === 'eco' || saved === 'balanced' || saved === 'standard' || saved === 'auto') {
      return saved;
    }
    return 'auto';
  }

  public setPreference(pref: UserNetworkPreference) {
    this.userPreference = pref;
    if (typeof window !== 'undefined') {
      localStorage.setItem('smantri_network_preference', pref);
    }
    this.recalculateAndNotify();
  }

  public getPreference(): UserNetworkPreference {
    return this.userPreference;
  }

  public getProfile(): NetworkProfile {
    return this.currentProfile;
  }

  public recordLatency(latencyMs: number) {
    if (latencyMs <= 0 || latencyMs > 30000) return;
    this.rollingLatency.push(latencyMs);
    if (this.rollingLatency.length > 5) {
      this.rollingLatency.shift();
    }
  }

  public getAverageLatency(): number {
    if (this.rollingLatency.length === 0) return 80;
    const sum = this.rollingLatency.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.rollingLatency.length);
  }

  private calculateProfile(): NetworkProfile {
    if (typeof window === 'undefined') {
      return {
        tier: 'balanced',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        pollIntervalMs: 20000,
        autosaveDebounceMs: 2500,
        isWeakConnection: false,
        description: 'Penyesuaian Standar',
      };
    }

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const effectiveType = conn?.effectiveType || '4g';
    const downlink = typeof conn?.downlink === 'number' ? conn.downlink : 10;
    const rtt = typeof conn?.rtt === 'number' ? conn.rtt : this.getAverageLatency();
    const saveData = Boolean(conn?.saveData);
    const avgLatency = this.getAverageLatency();

    // Determine tier based on user preference or automatic detection
    let tier: NetworkTier = 'balanced';

    if (this.userPreference !== 'auto') {
      tier = this.userPreference;
    } else {
      // Smart Auto-adaptation:
      // If 2g/slow-2g, high latency (> 250ms), low bandwidth (< 1 Mbps), or saveData flag is on -> ECO
      if (
        saveData ||
        effectiveType === '2g' ||
        effectiveType === 'slow-2g' ||
        (downlink > 0 && downlink <= 1.2) ||
        rtt >= 300 ||
        avgLatency >= 350
      ) {
        tier = 'eco';
      } else if (
        effectiveType === '3g' ||
        (downlink > 1.2 && downlink <= 5) ||
        rtt >= 120 ||
        avgLatency >= 150
      ) {
        tier = 'balanced';
      } else {
        tier = 'standard';
      }
    }

    // Configure smart relaxed intervals to eliminate excessive bitrate
    let pollIntervalMs = 18000;
    let autosaveDebounceMs = 2500;
    let isWeakConnection = false;
    let description = 'Koneksi Normal (Seimbang)';

    if (tier === 'eco') {
      // Eco mode: ultra-lightweight, poll only every 35s, debounce 4.5s
      pollIntervalMs = 35000;
      autosaveDebounceMs = 4500;
      isWeakConnection = true;
      description = 'Koneksi Lemah / Mode Hemat Bitrate Aktif';
    } else if (tier === 'balanced') {
      // Balanced mode: relaxed 20s polling, debounce 3s
      pollIntervalMs = 20000;
      autosaveDebounceMs = 3000;
      isWeakConnection = false;
      description = 'Koneksi Sedang (Optimal Hemat Kuota)';
    } else {
      // Standard mode: relaxed 12s polling (not 4s!), debounce 1.8s
      pollIntervalMs = 12000;
      autosaveDebounceMs = 1800;
      isWeakConnection = false;
      description = 'Koneksi Cepat & Stabil';
    }

    return {
      tier,
      effectiveType,
      downlink,
      rtt,
      saveData,
      pollIntervalMs,
      autosaveDebounceMs,
      isWeakConnection,
      description,
    };
  }

  private recalculateAndNotify() {
    const oldTier = this.currentProfile.tier;
    const newProfile = this.calculateProfile();
    this.currentProfile = newProfile;

    if (oldTier !== newProfile.tier) {
      console.log(`[SmartNetworkAdapter] Penyesuaian pintar beralih ke: ${newProfile.tier.toUpperCase()} (${newProfile.description})`);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(newProfile);
      } catch (e) {}
    });
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    // React to online/offline transitions
    window.addEventListener('online', () => this.recalculateAndNotify());
    window.addEventListener('offline', () => this.recalculateAndNotify());

    // React to Network Information API changes
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', () => this.recalculateAndNotify());
    }
  }

  // Periodic smart background check every 30 seconds
  private startPeriodicCheck() {
    if (typeof window === 'undefined') return;
    if (this.periodicCheckTimer) clearInterval(this.periodicCheckTimer);

    this.periodicCheckTimer = setInterval(() => {
      this.recalculateAndNotify();
    }, 30000);
  }

  public subscribe(listener: (profile: NetworkProfile) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentProfile);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const smartNetworkAdapter = new SmartNetworkAdapter();
