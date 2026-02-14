import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ChefHat,
  Package,
  ShoppingCart,
  LogOut,
  Coffee,
  Users,
  AlertTriangle,
  CreditCard,
  BarChart3,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', ownerOnly: true },
  { label: 'Receitas', icon: ChefHat, path: '/recipes', ownerOnly: true },
  { label: 'Produção', icon: Coffee, path: '/production', ownerOnly: false },
  { label: 'Estoque', icon: Package, path: '/inventory', ownerOnly: false },
  { label: 'Vendas', icon: ShoppingCart, path: '/sales', ownerOnly: false },
  { label: 'Caixas', icon: CreditCard, path: '/cash-register', ownerOnly: false },
  { label: 'Relatórios', icon: BarChart3, path: '/reports', ownerOnly: true },
  { label: 'Alertas', icon: AlertTriangle, path: '/alerts', ownerOnly: true },
  { label: 'Equipe', icon: Users, path: '/team', ownerOnly: true },
  { label: 'Meu Perfil', icon: UserCircle, path: '/profile', ownerOnly: false },
];

const AppSidebar = () => {
  const { signOut, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredItems = navItems.filter(item => !item.ownerOnly || isOwner);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <Coffee className="h-8 w-8 text-sidebar-primary" />
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Café Café
          </h1>
          <p className="text-xs text-sidebar-foreground/60">Confeitaria</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </aside>
  );
};

export default AppSidebar;
