import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ChefHat, Package, ShoppingCart, LogOut, Coffee,
  Users, AlertTriangle, CreditCard, BarChart3, Heart, ClipboardList,
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
      { label: 'Produtos', icon: ChefHat, path: '/recipes', ownerOnly: false },
      { label: 'Relatórios', icon: BarChart3, path: '/reports', ownerOnly: true },
      { label: 'CRM', icon: Heart, path: '/crm', ownerOnly: true },
      { label: 'Pedidos', icon: ClipboardList, path: '/orders', ownerOnly: false },
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
      {/* Glow line on right edge */}
      <div className="sidebar-glow-line" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border/50">
        <div className="relative animate-float">
          <Coffee className="h-9 w-9 text-sidebar-primary glow-gold" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Café Café
          </h1>
          <p className="text-[11px] text-sidebar-foreground/40 tracking-[0.2em] uppercase font-light">Confeitaria</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {navGroups.map((group, groupIdx) => {
          const filteredItems = group.items.filter(item => !item.ownerOnly || isOwner);
          if (filteredItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/30">
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
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group',
                        isActive
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:translate-x-0.5'
                      )}
                      style={isActive ? {
                        background: 'linear-gradient(90deg, hsl(36 70% 50% / 0.12), transparent)',
                        borderLeft: '2px solid hsl(36 70% 50%)',
                        paddingLeft: '10px',
                        boxShadow: '-2px 0 12px hsl(36 70% 50% / 0.15)',
                      } : undefined}
                    >
                      <item.icon className={cn(
                        'h-[18px] w-[18px] transition-all duration-300',
                        isActive ? 'text-sidebar-primary drop-shadow-[0_0_6px_hsl(36_70%_50%/0.4)]' : 'group-hover:text-sidebar-primary/70'
                      )} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {groupIdx < navGroups.length - 1 && (
                <div className="separator-gradient mt-4 mx-3" />
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border/30 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full ring-2 ring-sidebar-primary/20 animate-glow-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground/90">{profileName || 'Usuário'}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sidebar-primary/30 text-sidebar-primary">
              {roleLabels[roles[0]] || 'Sem role'}
            </Badge>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-all duration-300"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
