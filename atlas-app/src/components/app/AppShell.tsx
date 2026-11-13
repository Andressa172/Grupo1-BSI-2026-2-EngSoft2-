'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  PackageSearch,
  HandCoins,
  Users,
  Wallet,
  FileSpreadsheet,
  CalendarHeart,
  UtensilsCrossed,
  UserCog,
  Settings,
  UserRound,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import type { PerfilUsuario } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Restrição de acesso por nível/cargo do usuário autenticado:
  // - Sem perfisPermitidos: liberado para todos os níveis
  // - Com perfisPermitidos: restrito aos cargos informados (ex.: Nível ADM = GERENTE)
  perfisPermitidos?: PerfilUsuario[];
}

interface UsuarioSessao {
  id: number;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

const CHAVE_USUARIO_LOGADO = 'atlas-usuario-logado';

const LABEL_PERFIL: Record<PerfilUsuario, string> = {
  GERENTE: 'Gerente (ADM)',
  SECRETARIO: 'Secretário',
  FUNCIONARIO: 'Funcionário',
};

export function podeVisualizarItem(item: NavItem, perfilAtual?: PerfilUsuario): boolean {
  if (!item.perfisPermitidos || item.perfisPermitidos.length === 0) {
    return true;
  }
  if (!perfilAtual) {
    return false;
  }
  return item.perfisPermitidos.includes(perfilAtual);
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/doadores', label: 'Doadores', icon: Users },
  // 2 níveis de acesso: Gerenciar Funcionários é exclusivo do nível Administrador (GERENTE)
  { href: '/funcionarios', label: 'Funcionários', icon: UserCog, perfisPermitidos: ['GERENTE'] },
  { href: '/estoque', label: 'Estoque', icon: PackageSearch },
  { href: '/doacoes', label: 'Doações', icon: HandCoins },
  { href: '/atendidos', label: 'Atendidos', icon: UserRound },
  { href: '/eventos', label: 'Eventos', icon: CalendarHeart },
  { href: '/cardapios', label: 'Cardápios', icon: UtensilsCrossed },
  { href: '/caixa', label: 'Caixa', icon: Wallet },
  // RF_F7 (Abrir cotação - Secretário) e RF_F8 (Aprovar cotação - Gerente)
  { href: '/cotacoes', label: 'Cotações', icon: FileSpreadsheet, perfisPermitidos: ['SECRETARIO', 'GERENTE'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/produtos': 'Produtos',
  '/doadores': 'Doadores',
  '/funcionarios': 'Funcionários',
  '/estoque': 'Estoque',
  '/doacoes': 'Doações',
  '/atendidos': 'Atendidos',
  '/eventos': 'Eventos',
  '/cardapios': 'Cardápios',
  '/caixa': 'Caixa',
  '/cotacoes': 'Cotações',
  '/configuracoes': 'Configurações',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [organizacao, setOrganizacao] = useState({ nomeFantasia: 'ATLAS', caminhoLogo: null as string | null });
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioSessao>({
    id: 1,
    nome: 'Gerente SOS Criança',
    login: 'gerente',
    perfil: 'GERENTE',
    ativo: true,
  });

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_USUARIO_LOGADO);
      if (salvo) {
        const parsed = JSON.parse(salvo) as UsuarioSessao;
        if (parsed && parsed.perfil) {
          setUsuarioAtual(parsed);
        }
      }
    } catch {
      // mantém perfil padrão de demonstração caso localStorage não esteja disponível
    }
  }, []);

  const title = PAGE_TITLES[pathname] ?? 'ATLAS';
  const itensVisiveis = NAV_ITEMS.filter((item) => podeVisualizarItem(item, usuarioAtual.perfil));
  const itemRotaAtual = NAV_ITEMS.find((item) => item.href === pathname);
  const acessoPermitido = !itemRotaAtual || podeVisualizarItem(itemRotaAtual, usuarioAtual.perfil);

  function sair() {
    try {
      window.localStorage.removeItem(CHAVE_USUARIO_LOGADO);
    } catch {
      // ignora
    }
    router.push('/auth');
  }

  const inicial = (usuarioAtual.nome?.trim()?.[0] ?? 'U').toUpperCase();

  useEffect(() => {
    fetch('/api/organizacao')
      .then((res) => (res.ok ? res.json() : null))
      .then((dados) => {
        if (dados) {
          setOrganizacao({
            nomeFantasia: dados.nomeFantasia || 'ATLAS',
            caminhoLogo: dados.caminhoLogo || null,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border-line/20 bg-background px-4 py-6">
        <div className="px-2 mb-8">
          <Logo
            alt={`Logo ${organizacao.nomeFantasia}`}
            src={organizacao.caminhoLogo ?? undefined}
            text={organizacao.nomeFantasia}
            href="/dashboard"
          />
        </div>

        <nav className="flex flex-col gap-1">
          {itensVisiveis.map((item) => {
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
          <button
            type="button"
            onClick={sair}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-line/20 bg-background/90 backdrop-blur px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <span className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
              {inicial}
            </span>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-medium text-foreground">{usuarioAtual.nome}</span>
              <span className="text-xs text-foreground/50">{LABEL_PERFIL[usuarioAtual.perfil]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-background">
          {acessoPermitido ? (
            children
          ) : (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-sm text-primary">
              Acesso restrito: seu nível de acesso ({LABEL_PERFIL[usuarioAtual.perfil]}) não possui permissão para acessar esta funcionalidade.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
