import { useAuth } from '../context/AuthContext';

export default function TopBar({ showLogout = false }) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-heading font-bold text-text text-base tracking-tight select-none">
          PocketPal
        </span>
        {showLogout && (
          <button
            onClick={logout}
            className="text-muted text-xs font-medium px-3 py-1.5 rounded-lg
              hover:text-text hover:bg-surface-2 active:opacity-70
              transition-all duration-150"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
