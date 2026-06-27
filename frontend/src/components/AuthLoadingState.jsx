import { motion } from 'framer-motion';

export default function AuthLoadingState({ title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#3B6CFF] border-r-[#8B5CF6]"
          />
          <motion.span
            animate={{ scale: [1, 1.14, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-3 w-3 rounded-full bg-gradient-to-r from-[#3B6CFF] to-[#8B5CF6]"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.12, ease: 'easeInOut' }}
            className="h-2 w-2 rounded-full bg-gradient-to-r from-[#3B6CFF] to-[#8B5CF6]"
          />
        ))}
      </div>
    </motion.div>
  );
}
