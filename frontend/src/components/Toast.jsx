import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Self-dismissing overlay toast.
 * Slides down from above the TopBar, holds for `duration` ms, then fades out.
 * Calls `onDismiss` after it exits so the parent can unmount it cleanly.
 */
export default function Toast({ message, icon = '🔥', duration = 3500, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(hide);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          className="fixed top-14 left-4 right-4 z-[200] max-w-sm mx-auto pointer-events-none"
          initial={{ y: -20, opacity: 0, scale: 0.93 }}
          animate={{ y: 0,   opacity: 1, scale: 1    }}
          exit={{    y: -16, opacity: 0, scale: 0.94  }}
          transition={{ type: 'spring', damping: 22, stiffness: 340 }}
        >
          <div
            className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.28) 0%, rgba(249,115,22,0.22) 100%)',
              border: '1px solid rgba(236,72,153,0.58)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(236,72,153,0.30), 0 2px 12px rgba(0,0,0,0.45)',
            }}
          >
            <motion.span
              className="text-xl leading-none shrink-0"
              animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              {icon}
            </motion.span>
            <p className="text-white text-sm font-semibold leading-snug">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
