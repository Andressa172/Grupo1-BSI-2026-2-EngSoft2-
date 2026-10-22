'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PackageSearch,
  HandCoins,
  Wallet,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/estoque', label: 'Estoque', icon: PackageSearch },
  { href: '/doacoes', label: 'Doações', icon: HandCoins },
  { href: '/caixa', label: 'Caixa', icon: Wallet },
  { href: '/cotacoes', label: 'Cotações', icon: FileSpreadsheet },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/estoque': 'Estoque',
  '/doacoes': 'Doações',
  '/caixa': 'Caixa',
  '/cotacoes': 'Cotações',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'ATLAS';

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border-line/20 bg-background px-4 py-6">
        <div className="px-2 mb-8">
          <Logo src="/logo.svg" alt="Logo ATLAS" text="ATLAS" href="/dashboard" />
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-background shadow-sm'
                    : 'text-foreground/70 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border-line/20">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <LogOut size={18} />
            Sair
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-line/20 bg-background/90 backdrop-blur px-6 py-4">
          <h1 className="text-lg font-medium tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <span className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
              G
            </span>
            <span className="hidden sm:inline">Gerente SOS Criança</span>
          </div>
        </header>

        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
