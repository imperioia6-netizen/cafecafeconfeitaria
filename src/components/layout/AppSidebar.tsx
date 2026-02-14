import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ChefHat, Package, ShoppingCart, LogOut, Coffee,
  Users, AlertTriangle, CreditCard, BarChart3, UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const navGroups = [
  {
    label: 'Gestão',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/', ownerOnly: true },
      { label: 'Receitas', icon: ChefHat, path: '/recipes', ownerOnly: true },
      { label: 'Relatórios', icon: BarChart3, path: '/reports', ownerOnly: true },
      { label: 'Alertas', icon: AlertTriangle, path: '/alerts', ownerOnly: true },
    ],
  },
  {
    label: 'Operação',
    items: [
      { label: 'Produção', icon: Coffee, path: '/production', ownerOnly: false },
      { label: 'Estoque', icon: Package, path: '/inventory', ownerOnly: false },
      { label: 'Vendas', icon: ShoppingCart, path: '/sales', ownerOnly: false },
      { label: 'Caixas', icon: CreditCard, path: '/cash-register', ownerOnly: false },
    ],
  },
  {
    label: 'Pessoal',
    items: [
      { label: 'Equipe', icon: Users, path: '/team', ownerOnly: true },
      { label: 'Meu Perfil', icon: UserCircle, path: '/profile', ownerOnly: false },
    ],
  },
];

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  employee: 'Funcionário',
  client: 'Cliente',
};

const AppSidebar = () => {
  const { signOut, isOwner, user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.name) setProfileName(data.name); });
  }, [user]);

  const initials = profileName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col sidebar-gradient text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="relative">
          <Coffee className="h-9 w-9 text-sidebar-primary glow-gold" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Café Café
          </h1>
          <p className="text-[11px] text-sidebar-foreground/50 tracking-wider uppercase">Confeitaria</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => {
          const filteredItems = group.items.filter(item => !item.ownerOnly || isOwner);
          if (filteredItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary pl-[10px]'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5'
                      )}
                    >
                      <item.icon className={cn('h-[18px] w-[18px] transition-colors', isActive ? 'text-sidebar-primary' : '')} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground/90">{profileName || 'Usuário'}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sidebar-primary/30 text-sidebar-primary">
              {roleLabels[roles[0]] || 'Sem role'}
            </Badge>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
