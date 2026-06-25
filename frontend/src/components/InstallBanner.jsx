import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, triggerInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {canInstall && !dismissed && (
        <motion.div
          key="install-banner"
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed left-4 right-4 z-50 max-w-sm mx-auto"
          // Sit just above the bottom nav (nav ≈ 68 px + safe-area)
          style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 10px)' }}
        >
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background:
                'linear-gradient(135deg, rgba(59,108,255,0.18) 0%, rgba(139,92,246,0.14) 100%)',
              border: '1px solid rgba(59,108,255,0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* App icon thumbnail */}
            <div
              className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)' }}
              aria-hidden
            >
              👛
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0">
              <p className="text-text text-sm font-semibold font-heading leading-none mb-1">
                Add to Home Screen
              </p>
              <p className="text-muted text-xs leading-snug">
                Install PocketPal for the full experience
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={triggerInstall}
                className="text-white text-xs font-bold px-3.5 py-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)' }}
              >
                Install
              </motion.button>
              <button
                onClick={() => setDismissed(true)}
                className="text-muted p-1.5 rounded-lg hover:text-text/70 transition-colors"
                aria-label="Dismiss install prompt"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
