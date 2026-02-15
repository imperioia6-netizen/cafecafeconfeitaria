import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, ShoppingCart, Package, MoreHorizontal, Coffee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const ownerNav: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  { path: '/sales', label: 'Vendas', icon: ShoppingCart },
  { path: '/inventory', label: 'Estoque', icon: Package },
];

const employeeNav: NavItem[] = [
  { path: '/production', label: 'Produção', icon: Coffee },
  { path: '/orders', label: 'Pedidos', icon: ClipboardList },
  { path: '/sales', label: 'Vendas', icon: ShoppingCart },
  { path: '/inventory', label: 'Estoque', icon: Package },
];

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

const MobileBottomNav = ({ onOpenMore }: MobileBottomNavProps) => {
  const { isOwner } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = isOwner ? ownerNav : employeeNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all active:scale-90 ${
                isActive ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              {/* Active indicator dot */}
              <div className={`h-1 w-1 rounded-full mb-0.5 transition-all duration-300 ${isActive ? 'bg-accent scale-100' : 'scale-0'}`} />
              <item.icon className={`h-5 w-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_6px_hsl(36_70%_50%/0.5)] scale-110' : ''}`} />
              <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-all active:scale-90"
        >
          <div className="h-1 w-1 rounded-full mb-0.5 scale-0" />
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
