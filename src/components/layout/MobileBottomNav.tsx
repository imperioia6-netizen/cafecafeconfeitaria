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
        background: 'linear-gradient(180deg, hsl(24 30% 11% / 0.97), hsl(24 35% 6% / 0.99))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -4px 20px hsl(24 30% 5% / 0.5)',
      }}
    >
      {/* Gold gradient top border */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, hsl(36 70% 50% / 0.25) 30%, hsl(36 80% 55% / 0.4) 50%, hsl(36 70% 50% / 0.25) 70%, transparent 95%)',
        }}
      />

      <div className="flex items-stretch justify-around px-1" style={{ height: '72px' }}>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1.5 flex-1 relative transition-all active:scale-90"
            >
              {/* Active top indicator bar */}
              {isActive && (
                <div
                  className="absolute top-0 w-10 h-[2px] rounded-full"
                  style={{
                    background: 'hsl(36 75% 55%)',
                    boxShadow: '0 0 8px hsl(36 70% 50% / 0.5)',
                  }}
                />
              )}
              <div
                className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive ? 'w-12 h-8' : 'w-10 h-8'
                }`}
                style={isActive ? {
                  background: 'hsl(36 70% 50% / 0.12)',
                  border: '1px solid hsl(36 70% 50% / 0.08)',
                } : undefined}
              >
                <item.icon
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'h-[22px] w-[22px]'
                      : 'h-5 w-5'
                  }`}
                  style={isActive ? {
                    color: 'hsl(36 75% 55%)',
                    filter: 'drop-shadow(0 0 6px hsl(36 70% 50% / 0.4))',
                  } : {
                    color: 'hsl(36 25% 45%)',
                  }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className="text-[11px] leading-none transition-all duration-300"
                style={isActive ? {
                  fontWeight: 600,
                  color: 'hsl(36 75% 55%)',
                } : {
                  fontWeight: 500,
                  color: 'hsl(36 20% 42%)',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-1.5 flex-1 transition-all active:scale-90"
        >
          <div className="flex items-center justify-center w-10 h-8 rounded-2xl">
            <MoreHorizontal className="h-5 w-5" style={{ color: 'hsl(36 25% 45%)' }} strokeWidth={1.8} />
          </div>
          <span className="text-[11px] leading-none font-medium" style={{ color: 'hsl(36 20% 42%)' }}>
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
