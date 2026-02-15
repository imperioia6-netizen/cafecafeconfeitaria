import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, ShoppingCart, Package, MoreHorizontal, Coffee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const ownerNav: NavItem[] = [
  { path: '/', label: 'Início', icon: LayoutDashboard },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom"
      style={{
        background: 'linear-gradient(180deg, hsl(24 30% 10% / 0.97), hsl(24 35% 7% / 0.99))',
        borderTop: '1px solid hsl(36 70% 50% / 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-stretch justify-around px-1" style={{ height: '68px' }}>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 relative transition-all active:scale-90"
            >
              {/* Active pill indicator */}
              {isActive && (
                <div
                  className="absolute top-1 w-8 h-1 rounded-full"
                  style={{ background: 'hsl(36 70% 50%)' }}
                />
              )}
              <div
                className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive ? 'w-12 h-8' : 'w-10 h-8'
                }`}
                style={isActive ? {
                  background: 'hsl(36 70% 50% / 0.15)',
                } : undefined}
              >
                <item.icon
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'h-[22px] w-[22px] text-[hsl(36,70%,50%)]'
                      : 'h-5 w-5 text-[hsl(36,30%,55%)]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[11px] leading-none transition-all duration-300 ${
                  isActive
                    ? 'font-bold text-[hsl(36,70%,50%)]'
                    : 'font-medium text-[hsl(36,20%,50%)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-1 flex-1 transition-all active:scale-90"
        >
          <div className="flex items-center justify-center w-10 h-8 rounded-2xl">
            <MoreHorizontal className="h-5 w-5 text-[hsl(36,20%,50%)]" strokeWidth={1.8} />
          </div>
          <span className="text-[11px] leading-none font-medium text-[hsl(36,20%,50%)]">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
