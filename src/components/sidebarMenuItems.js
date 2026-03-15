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
  UserCheck,
  Users,
} from 'lucide-react';

export const sidebarMenuItems = [
  { path: '/dashboard/pdv', label: 'PDV', icon: ShoppingCart },
  { path: '/dashboard/pessoas', label: 'Pessoas', icon: Users },
  { path: '/dashboard/pessoas/funcionarios', label: 'Funcionarios', icon: UserCheck },
  { path: '/dashboard/motoboys', label: 'Motoboys', icon: Bike },
  { path: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { path: '/dashboard/estoque', label: 'Estoque', icon: Archive },
  { path: '/dashboard/contas-pagar', label: 'Contas a Pagar', icon: AlertCircle },
  { path: '/dashboard/contas-receber', label: 'Contas a Receber', icon: CreditCard },
  { path: '/dashboard/relatorios', label: 'Relatorios', icon: BarChart3 },
  { path: '/dashboard/relatorios/historico-vendas', label: 'Historico de Vendas', icon: History },
  { path: '/dashboard/chatbot', label: 'CHATBOT', icon: Bot },
  { path: '/dashboard/cores-layout', label: 'Mudar as cores do layout', icon: Palette },
];
