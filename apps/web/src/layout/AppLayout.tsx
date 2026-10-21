import { Brain, LayoutDashboard, LineChart, LogOut, Moon, Settings, Sun, Wallet } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { FormatUtils } from '@/utils/FormatUtils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/positions', label: 'Positions', icon: LineChart },
  { to: '/brain', label: 'Brain', icon: Brain },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:border-sidebar-border">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <div>
            <p className="font-display text-xl font-bold tracking-tight">Kestrel</p>
            <p className="text-xs text-muted-foreground">Self-healing meme coin desk</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 pt-6 md:absolute md:bottom-0 md:block md:w-60 md:pb-5">
          <p className="truncate text-sm font-semibold">{user?.displayName}</p>
          <p className="text-xs text-muted-foreground">{user ? FormatUtils.shortAddress(user.walletAddress) : ''}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg border p-2 text-muted-foreground hover:text-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={logout} aria-label="Disconnect wallet" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
