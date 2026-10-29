import Peer, { DataConnection } from 'peerjs';
import QRCode from 'qrcode';

export type WebRtcStatus = 'idle' | 'initializing' | 'listening' | 'connected' | 'disconnected' | 'error';

export interface WebRtcListener {
  onStatusChange?: (status: WebRtcStatus, message?: string) => void;
  onImageReceived?: (base64Image: string) => void;
  onImagesReceived?: (base64Images: string[]) => void;
  onMobileDisconnect?: (reason: string) => void;
}

class WebRtcSessionManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private peerId: string = '';
  private qrCodeUrl: string = '';
  private status: WebRtcStatus = 'idle';
  private errorMsg: string = '';
  private listeners: Set<WebRtcListener> = new Set();
  private receivedImagesHistory: string[] = [];
  private processedSignatures: Set<string> = new Set();
  private isExplicitlyDisconnectedByLaptop: boolean = false;
  private hasNotifiedMobileDisconnect: boolean = false;
  private relayPollTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.peerId) {
          try {
            const url = `/api/mobile-sync/session/${encodeURIComponent(this.peerId)}/close`;
            const data = JSON.stringify({ reason: 'laptop_reloaded' });
            if (navigator.sendBeacon) {
              navigator.sendBeacon(url, data);
            } else {
              fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true,
              }).catch(() => {});
            }
          } catch (e) {}
        }
      });
    }
  }

  private getImageSig(img: string): string {
    if (!img) return '';
    return `${img.length}-${img.slice(0, 30)}-${img.slice(-30)}`;
  }

  private processIncomingImages(incoming: string[]) {
    if (!incoming || incoming.length === 0) return;
    const uniqueNew: string[] = [];
    for (const img of incoming) {
      if (!img) continue;
      const sig = this.getImageSig(img);
      if (!this.processedSignatures.has(sig)) {
        this.processedSignatures.add(sig);
        uniqueNew.push(img);
      }
    }

    if (uniqueNew.length === 0) return;

    this.receivedImagesHistory.push(...uniqueNew);
    this.listeners.forEach((l) => {
      if (l.onImagesReceived) {
        l.onImagesReceived(uniqueNew);
      } else if (l.onImageReceived) {
        uniqueNew.forEach((img) => l.onImageReceived?.(img));
      }
    });
  }

  public getStatus(): WebRtcStatus {
    return this.status;
  }

  public getPeerId(): string {
    return this.peerId;
  }

  public getQrCodeUrl(): string {
    return this.qrCodeUrl;
  }

  public getErrorMessage(): string {
    return this.errorMsg;
  }

  public getReceivedImages(): string[] {
    return [...this.receivedImagesHistory];
  }

  public isConnected(): boolean {
    return this.status === 'connected';
  }

  public subscribe(listener: WebRtcListener): () => void {
    this.listeners.add(listener);
    // Immediately notify current status
    if (listener.onStatusChange) {
      listener.onStatusChange(this.status, this.errorMsg);
    }
    // Resume polling only when there is an active subscriber (e.g. upload modal is open)
    if (this.peerId && !this.relayPollTimer) {
      this.startRelayPolling(this.peerId);
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopRelayPolling();
      }
    };
  }

  public stopRelayPolling() {
    if (this.relayPollTimer) {
      clearTimeout(this.relayPollTimer);
      this.relayPollTimer = null;
    }
  }

  private notifyStatus(status: WebRtcStatus, msg: string = '') {
    this.status = status;
    this.errorMsg = msg;
    this.listeners.forEach((l) => {
      if (l.onStatusChange) {
        l.onStatusChange(status, msg);
      }
    });
  }

  private startRelayPolling(roomId: string) {
    this.stopRelayPolling();

    const runPoll = async () => {
      // Keep running if peerId matches current active session
      if (!this.peerId || this.peerId !== roomId) {
        this.stopRelayPolling();
        return;
      }

      try {
        // 1. Check room status (Is mobile phone connected or disconnected?)
        const statusRes = await fetch(`/api/mobile-sync/session/${encodeURIComponent(roomId)}/status?client=laptop&_t=${Date.now()}`);
        if (statusRes.ok) {
          const sJson = await statusRes.json();
          if (sJson && sJson.success) {
            if (sJson.status === 'disconnected-by-mobile') {
              this.isExplicitlyDisconnectedByLaptop = true;
              this.notifyStatus('listening');
              if (!this.hasNotifiedMobileDisconnect) {
                this.hasNotifiedMobileDisconnect = true;
                this.listeners.forEach((l) => {
                  if (l.onMobileDisconnect) {
                    l.onMobileDisconnect(sJson.disconnectMessage || 'Koneksi diputuskan oleh perangkat HP Android / iOS.');
                  }
                });
              }
            } else if (sJson.hpConnected && this.status !== 'connected') {
              this.hasNotifiedMobileDisconnect = false;
              this.isExplicitlyDisconnectedByLaptop = false;
              this.notifyStatus('connected');
            } else if (!sJson.hpConnected && this.status === 'connected' && (!this.conn || !this.conn.open)) {
              if (!this.isExplicitlyDisconnectedByLaptop) {
                this.notifyStatus('listening');
              }
            }
          }
        }

        // 2. Always poll newly uploaded images from mobile relay (do not skip even if conn.open is true)
        const imagesRes = await fetch(`/api/mobile-sync/session/${encodeURIComponent(roomId)}/poll-images?_t=${Date.now()}`);
        if (imagesRes.ok) {
          const iJson = await imagesRes.json();
          if (iJson && iJson.success && Array.isArray(iJson.images) && iJson.images.length > 0) {
            this.processIncomingImages(iJson.images);
          }
        }
      } catch (e) {
        // Silent network retry
      }

      // Fast polling interval (1500ms) for real-time camera photo reception
      if (this.peerId === roomId) {
        this.relayPollTimer = setTimeout(runPoll, 1500);
      }
    };

    runPoll();
  }

  public async initSession(forceNew: boolean = false): Promise<void> {
    // If already initialized and not forcing new, reuse existing connection/listening state
    if (!forceNew && this.peer && !this.peer.destroyed && this.peerId && this.qrCodeUrl) {
      if (this.status === 'connected' || (this.conn && this.conn.open)) {
        this.notifyStatus('connected');
      } else {
        this.notifyStatus('listening');
      }
      return;
    }

    // Clean up previous peer if existing
    if (this.peer && !this.peer.destroyed) {
      try {
        if (this.conn) {
          this.conn.close();
        }
        this.peer.destroy();
      } catch (e) {
        console.warn('[WebRTC Manager] Cleanup error:', e);
      }
    }

    if (this.relayPollTimer) {
      clearInterval(this.relayPollTimer);
      this.relayPollTimer = null;
    }

    this.conn = null;
    this.isExplicitlyDisconnectedByLaptop = false;
    this.hasNotifiedMobileDisconnect = false;
    this.notifyStatus('initializing');

    const randomRoomId = `smantri-peer-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.peerId = randomRoomId;

    // Register room proactively on server relay
    try {
      fetch('/api/mobile-sync/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: randomRoomId }),
      }).catch(() => {});
    } catch (e) {}

    // Start background high-speed server relay polling immediately
    this.startRelayPolling(randomRoomId);

    try {
      const peer = new Peer(randomRoomId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ],
        },
      });

      this.peer = peer;

      peer.on('open', async (id) => {
        this.peerId = id;
        await this.generateQr(id);
        if (this.status !== 'connected') {
          this.notifyStatus('listening');
        }
      });

      peer.on('connection', (conn) => {
        this.conn = conn;
        this.isExplicitlyDisconnectedByLaptop = false;

        // When connection actually opens, declare connected and send confirmation
        conn.on('open', () => {
          this.notifyStatus('connected');
          try {
            conn.send({ type: 'CONNECTION_CONFIRMED' });
          } catch (e) {
            console.warn('[WebRTC] Connection confirm signal warning:', e);
          }
        });

        conn.on('data', (data: any) => {
          if (!data) return;

          if (data.type === 'BATCH_PHOTO_UPLOAD' && Array.isArray(data.payload)) {
            this.processIncomingImages(data.payload as string[]);
          } else if (data.type === 'PHOTO_UPLOAD' && data.payload) {
            this.processIncomingImages([data.payload as string]);
          }
        });

        conn.on('close', () => {
          this.conn = null;
          // If not disconnected by laptop, return to listening mode so HP can reconnect
          if (!this.isExplicitlyDisconnectedByLaptop) {
            this.notifyStatus('listening');
          }
        });

        conn.on('error', (err) => {
          console.error('[WebRTC DataConnection Error]:', err);
          this.conn = null;
        });
      });

      peer.on('error', (err) => {
        console.error('[WebRTC Peer Error]:', err);
        // Do not break if server relay is functioning
        if (this.status !== 'connected') {
          this.notifyStatus('listening');
        }
      });

      peer.on('disconnected', () => {
        if (!this.isExplicitlyDisconnectedByLaptop && this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('[WebRTC] Reconnect failed:', e);
          }
        }
      });
    } catch (err: any) {
      console.error('[WebRTC Init Exception]:', err);
      // Fallback gracefully: server relay will still work seamlessly
      this.generateQr(randomRoomId).then(() => {
        this.notifyStatus('listening');
      });
    }
  }

  private async generateQr(id: string): Promise<void> {
    try {
      const mobileUploadUrl = `${window.location.origin}${window.location.pathname}?mode=mobile-upload&target=${encodeURIComponent(id)}`;
      const url = await QRCode.toDataURL(mobileUploadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      });
      this.qrCodeUrl = url;
    } catch (err: any) {
      console.error('[QR Generation Error]:', err);
      this.notifyStatus('error', 'Gagal menghasilkan QR Code.');
    }
  }

  /**
   * Explicitly disconnect the connected mobile device from Laptop/PC.
   * Sends real-time DISCONNECT_FROM_LAPTOP signals via both Server Relay & WebRTC.
   */
  public disconnectMobile(): void {
    this.isExplicitlyDisconnectedByLaptop = true;

    // 1. Notify Server Relay
    if (this.peerId) {
      fetch(`/api/mobile-sync/session/${encodeURIComponent(this.peerId)}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Koneksi ke perangkat HP Android / Tablet telah diputuskan oleh Guru dari Laptop/PC.',
        }),
      }).catch(() => {});
    }

    // 2. Notify WebRTC DataConnection
    if (this.conn && this.conn.open) {
      try {
        this.conn.send({
          type: 'DISCONNECT_FROM_LAPTOP',
          message: 'Koneksi ke perangkat HP Android / Tablet telah diputuskan oleh Guru dari Laptop/PC.',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[WebRTC] Error sending disconnect notice:', e);
      }

      setTimeout(() => {
        try {
          if (this.conn) {
            this.conn.close();
            this.conn = null;
          }
        } catch (e) {
          console.warn('[WebRTC] Error closing conn:', e);
        }
        this.notifyStatus('listening');
      }, 200);
    } else {
      this.notifyStatus('listening');
    }

    this.listeners.forEach((l) => {
      if (l.onMobileDisconnect) {
        l.onMobileDisconnect('Diputuskan oleh Laptop');
      }
    });
  }

  public clearHistory(): void {
    this.receivedImagesHistory = [];
  }
}

// Global Singleton Instance to keep WebRTC connection active across modal opens/closes
export const webrtcSession = new WebRtcSessionManager();
