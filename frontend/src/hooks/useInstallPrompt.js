import { useEffect, useState } from 'react';

/**
 * Captures the browser's beforeinstallprompt event so we can show a custom
 * "Add to Home Screen" UI instead of the default mini-infobar.
 *
 * Returns:
 *   canInstall   – true when the prompt is ready and app is not yet installed
 *   triggerInstall – call to show the native install dialog
 *   isInstalled  – true once the app has been installed this session
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running as an installed PWA — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      // Prevent Chrome's default mini-infobar; save the event for later
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    triggerInstall,
    isInstalled,
  };
}
