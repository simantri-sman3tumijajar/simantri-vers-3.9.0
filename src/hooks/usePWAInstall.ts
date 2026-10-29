import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed or launched from home screen / desktop shortcut)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // 2. Detect Chrome / Chromium / Edge browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isChromeBrowser = /chrome|chromium|crios/i.test(userAgent) && !/edg|opr/i.test(userAgent);
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsChrome(isChromeBrowser);
    setIsIOS(isIOSDevice);

    // 3. Register Service Worker for PWA compliance
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[SiMantri PWA SW]: Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[SiMantri PWA SW]: Service Worker registration failed:', err);
          });
      });
    }

    // 4. Capture beforeinstallprompt event (Google Chrome, Edge, Brave, Opera)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('[PWA Install Error]:', err);
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isChrome,
    install,
    deferredPrompt,
  };
}
