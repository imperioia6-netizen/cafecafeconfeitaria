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
  onCloseSidebar: () => void;
}

const MobileBottomNav = ({ onOpenMore, onCloseSidebar }: MobileBottomNavProps) => {
  const { isOwner } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = isOwner ? ownerNav : employeeNav;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden safe-area-bottom nav-cinema-bg"
      style={{
        background: 'linear-gradient(180deg, hsl(24 26% 14% / 0.94), hsl(24 30% 8% / 0.97), hsl(24 36% 4% / 0.99))',
        backdropFilter: 'blur(32px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
        boxShadow:
          '0 -8px 32px hsl(24 30% 3% / 0.7), 0 -2px 8px hsl(24 30% 6% / 0.4), 0 -1px 2px hsl(24 30% 10% / 0.2)',
      }}
    >
      {/* ── Dual-layer golden light bar ── */}
      {/* Sharp gold line */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent 5%, hsl(36 65% 48% / 0.15) 20%, hsl(36 80% 55% / 0.6) 50%, hsl(36 65% 48% / 0.15) 80%, transparent 95%)',
        }}
      />
      {/* Diffused glow beneath */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '6px',
          background:
            'linear-gradient(90deg, transparent 10%, hsl(36 70% 50% / 0.06) 25%, hsl(36 80% 58% / 0.14) 50%, hsl(36 70% 50% / 0.06) 75%, transparent 90%)',
          filter: 'blur(3px)',
        }}
      />

      <div className="flex items-stretch justify-around px-1" style={{ height: '80px' }}>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { onCloseSidebar(); navigate(item.path); }}
              className="flex flex-col items-center justify-center gap-[5px] flex-1 relative transition-transform duration-150 active:scale-[0.82]"
            >
              {/* Spotlight glow behind active item */}
              {isActive && (
                <div
                  className="absolute nav-spotlight"
                  style={{
                    width: '52px',
                    height: '52px',
                    top: '6px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, hsl(36 75% 52% / 0.18) 0%, hsl(36 70% 50% / 0.06) 50%, transparent 75%)',
                    filter: 'blur(8px)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Active notch indicator — golden dot above icon */}
              {isActive && (
                <div
                  className="absolute"
                  style={{
                    top: '2px',
                    width: '16px',
                    height: '3px',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, hsl(36 80% 55% / 0.3), hsl(36 85% 60% / 0.8), hsl(36 80% 55% / 0.3))',
                    boxShadow: '0 0 6px hsl(36 80% 55% / 0.5)',
                  }}
                />
              )}

              {/* Icon pill */}
              <div
                className={`flex items-center justify-center transition-all duration-500 ${
                  isActive ? 'w-[56px] h-[38px] rounded-[16px]' : 'w-10 h-8 rounded-2xl'
                }`}
                style={isActive ? {
                  background: 'radial-gradient(ellipse at 50% 40%, hsl(36 75% 52% / 0.18), hsl(36 70% 48% / 0.06) 70%, transparent)',
                  boxShadow:
                    '0 0 16px hsl(36 75% 52% / 0.22), 0 2px 10px hsl(36 70% 50% / 0.16), inset 0 1px 0 hsl(36 80% 60% / 0.08)',
                  border: '1px solid hsl(36 70% 52% / 0.12)',
                } : undefined}
              >
                <item.icon
                  className={`transition-all duration-300 ${
                    isActive ? 'h-6 w-6 nav-icon-active' : 'h-[18px] w-[18px]'
                  }`}
                  style={isActive ? {
                    color: 'hsl(36 82% 62%)',
                    filter: 'drop-shadow(0 0 6px hsl(36 75% 52% / 0.5)) drop-shadow(0 0 14px hsl(36 70% 50% / 0.25))',
                  } : {
                    color: 'hsl(24 12% 32%)',
                  }}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
              </div>

              <span
                className="text-[10px] leading-none tracking-wide transition-all duration-300"
                style={isActive ? {
                  fontWeight: 700,
                  color: 'hsl(36 82% 62%)',
                  textShadow: '0 0 10px hsl(36 70% 50% / 0.3)',
                } : {
                  fontWeight: 500,
                  color: 'hsl(24 10% 30%)',
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
          className="flex flex-col items-center justify-center gap-[5px] flex-1 transition-transform duration-150 active:scale-[0.82]"
        >
          <div className="flex items-center justify-center w-10 h-8 rounded-2xl">
            <MoreHorizontal className="h-[18px] w-[18px]" style={{ color: 'hsl(24 12% 32%)' }} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] leading-none tracking-wide font-medium" style={{ color: 'hsl(24 10% 30%)' }}>
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
