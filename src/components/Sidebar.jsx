import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  BarChart3,
  Bike,
  Bot,
  CreditCard,
  History,
  Package,
  Palette,
  ShoppingCart,
  Store,
  UserCheck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { path: '/dashboard/pdv', label: 'PDV', icon: ShoppingCart },
    { path: '/dashboard/pessoas', label: 'Pessoas', icon: Users },
    { path: '/dashboard/pessoas/funcionarios', label: 'Funcionários', icon: UserCheck },
    { path: '/dashboard/motoboys', label: 'Motoboys', icon: Bike },
    { path: '/dashboard/produtos', label: 'Produtos', icon: Package },
    { path: '/dashboard/estoque', label: 'Estoque', icon: Archive },
    { path: '/dashboard/contas-pagar', label: 'Contas a Pagar', icon: AlertCircle },
    { path: '/dashboard/contas-receber', label: 'Contas a Receber', icon: CreditCard },
    { path: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
    { path: '/dashboard/relatorios/historico-vendas', label: 'Histórico de Vendas', icon: History },
    { path: '/dashboard/chatbot', label: 'CHATBOT', icon: Bot },
    { path: '/dashboard/cores-layout', label: 'Mudar as cores do layout', icon: Palette },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--layout-border)] bg-[var(--layout-bg)] md:flex">
      <div className="border-b border-[var(--layout-border)] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--layout-surface-2)]">
            <img src="/pedidoflow.png" alt="PedidoFlow" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">PedidoFlow</h1>
            <p className="text-xs font-medium text-[var(--layout-text-muted)]">Gestão Comercial</p>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                isActive
                  ? 'bg-[var(--layout-accent)] text-white shadow-md shadow-black/20'
                  : 'text-[var(--layout-text-muted)] hover:bg-[var(--layout-surface-2)] hover:text-white',
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', isActive ? 'scale-105' : '')} />
              <span className="font-medium">{item.label}</span>
              {isActive ? <div className="absolute right-2 h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--layout-border)] bg-[var(--layout-surface-2)] p-4">
        <div className="flex items-center justify-between px-2 text-xs text-[var(--layout-text-muted)]">
          <span>Versão 1.0.0</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--layout-accent)]" title="Online" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
