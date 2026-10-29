import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';

export interface UseWebNotificationResult {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isRoleAllowed: boolean;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  triggerBrowserNotification: (notif: AppNotification) => void;
}

/**
 * Custom Hook for HTML5 Web Push / Browser Notification API.
 * Strict Role Gating: Active ONLY for 'admin', 'operator', and 'guru' (GTK).
 * Students ('siswa') are strictly forbidden from triggering or receiving browser notifications.
 */
export function useWebNotification(): UseWebNotificationResult {
  const { currentUser, state, setCurrentView, setSelectedModule } = useApp();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const isRoleAllowed = Boolean(
    currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.role === 'operator' ||
        currentUser.role === 'guru' ||
        (currentUser.role as string) === 'kesiswaan') &&
      currentUser.role !== ('siswa' as any)
  );

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Initialize permission state
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  // Request browser notification permission explicitly
  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!isSupported) return 'unsupported';
    if (!isRoleAllowed) return 'denied';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.warn('[WebNotification] Failed to request notification permission:', err);
      return 'denied';
    }
  }, [isSupported, isRoleAllowed]);

  // Trigger browser notification native dialog
  const triggerBrowserNotification = useCallback(
    (notif: AppNotification) => {
      if (!isSupported || !isRoleAllowed) return;
      if (Notification.permission !== 'granted') return;

      try {
        const iconUrl = '/public/assets/aistudio/Screenshot__214__a0f4b25d.png';
        const browserNotification = new Notification(notif.title, {
          body: notif.message,
          icon: iconUrl,
          tag: notif.id || `notif-${Date.now()}`,
          badge: iconUrl,
          lang: 'id-ID',
          silent: false,
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();

          if (notif.targetModule) {
            setSelectedModule(notif.targetModule as any);
          }
          if (notif.targetView) {
            setCurrentView(notif.targetView);
          }
        };
      } catch (err) {
        // Fallback for environments where new Notification() without ServiceWorker throws
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(notif.title, {
                body: notif.message,
                tag: notif.id,
                icon: '/public/assets/aistudio/Screenshot__214__a0f4b25d.png',
              });
            })
            .catch(() => {});
        }
      }
    },
    [isSupported, isRoleAllowed, setCurrentView, setSelectedModule]
  );

  // Track notifications already shown to prevent duplicate native popups
  const notifiedIdsRef = useRef<Set<string>>(new Set<string>());

  // Auto-listen to newly received unread notifications for this user
  useEffect(() => {
    if (!isRoleAllowed || !isSupported || permission !== 'granted' || !currentUser) {
      return;
    }

    const notifications = state?.notifications || [];
    const now = Date.now();

    notifications.forEach((notif) => {
      // Must be unread
      if (notif.read) return;
      // Skip if already notified in this session
      if (notifiedIdsRef.current.has(notif.id)) return;

      // Filter by recipient
      const isForUser =
        notif.recipientId === currentUser.id ||
        (currentUser.role === 'admin' && (notif.recipientId === 'ROLE_ADMIN' || notif.recipientRole === 'admin')) ||
        (currentUser.role === 'operator' && (notif.recipientId === 'ROLE_OPERATOR' || notif.recipientRole === 'operator')) ||
        ((currentUser.role === 'guru' || currentUser.isGuruMapel) &&
          (notif.recipientId === 'ALL_TEACHERS' || notif.recipientRole === 'guru'));

      if (!isForUser) return;

      // Only popup notifications created in the last 10 minutes to avoid flooding on fresh login
      const createdTime = new Date(notif.createdAt).getTime();
      if (!isNaN(createdTime) && now - createdTime < 10 * 60 * 1000) {
        notifiedIdsRef.current.add(notif.id);
        triggerBrowserNotification(notif);
      } else {
        notifiedIdsRef.current.add(notif.id);
      }
    });
  }, [state?.notifications, currentUser, isRoleAllowed, isSupported, permission, triggerBrowserNotification]);

  return {
    isSupported,
    permission,
    isRoleAllowed,
    requestPermission,
    triggerBrowserNotification,
  };
}
