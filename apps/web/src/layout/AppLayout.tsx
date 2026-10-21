import { Brain, LayoutDashboard, LineChart, LogOut, Moon, Settings, Sparkles, Sun, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { SuggestModal } from '@/components/suggest/SuggestModal';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { FormatUtils } from '@/utils/FormatUtils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/positions', label: 'Positions', icon: LineChart },
  { to: '/smart-wallets', label: 'Smart wallets', icon: Users },
  { to: '/brain', label: 'Brain', icon: Brain },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const ITEM_CLASS = 'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const themeButton = (
    <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg border p-2 text-muted-foreground hover:text-foreground">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r md:border-sidebar-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold tracking-tight">Kestrel</p>
            <p className="hidden text-xs text-muted-foreground md:block">Self-healing meme coin desk</p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            {themeButton}
            <button type="button" onClick={logout} aria-label="Disconnect wallet" className="rounded-lg border p-2 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-2 md:pb-3">
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className={cn(ITEM_CLASS, 'w-full justify-center bg-primary font-semibold text-primary-foreground hover:opacity-85 md:justify-start')}
          >
            <Sparkles className="h-4 w-4" />
            Suggest a token
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:pb-0">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(ITEM_CLASS, isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t px-4 py-4 md:block">
          <p className="truncate text-sm font-semibold">{user?.displayName}</p>
          <p className="text-xs text-muted-foreground">{user ? FormatUtils.shortAddress(user.walletAddress) : ''}</p>
          <div className="mt-3 flex gap-2">
            {themeButton}
            <button type="button" onClick={logout} aria-label="Disconnect wallet" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
      {suggestOpen && <SuggestModal onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}
