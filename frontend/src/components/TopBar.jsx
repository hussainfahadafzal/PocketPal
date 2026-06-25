import { useAuth } from '../context/AuthContext';

export default function TopBar({ showLogout = false }) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/30"
      style={{ background: 'rgba(7, 9, 26, 0.85)', backdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">
        {/* Gradient wordmark */}
        <span className="text-grad-primary font-display font-bold text-base tracking-tight select-none">
          PocketPal
        </span>

        {showLogout && (
          <button
            onClick={logout}
            className="text-muted text-xs font-medium px-3 py-1.5 rounded-xl
              border border-border hover:border-border-bright hover:text-text
              active:opacity-60 transition-all duration-150"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
