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
    <nav className="fixed bottom-0 left-0 right-0 z-[60] md:hidden safe-area-bottom"
      style={{
        background: 'linear-gradient(180deg, hsl(24 28% 13% / 0.96), hsl(24 32% 9% / 0.98), hsl(24 38% 5% / 0.99))',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 -6px 28px hsl(24 30% 4% / 0.6), 0 -1px 6px hsl(24 30% 8% / 0.3)',
      }}
    >
      {/* Gold gradient top border — more pronounced */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, hsl(36 70% 50% / 0.2) 25%, hsl(36 80% 55% / 0.5) 50%, hsl(36 70% 50% / 0.2) 75%, transparent 95%)',
        }}
      />

      <div className="flex items-stretch justify-around px-1" style={{ height: '76px' }}>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-[6px] flex-1 relative transition-transform duration-150 active:scale-[0.85]"
            >
              {/* Active pill glow behind icon */}
              <div
                className={`flex items-center justify-center transition-all duration-500 ${
                  isActive ? 'w-14 h-9 rounded-[14px]' : 'w-10 h-8 rounded-2xl'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, hsl(36 70% 50% / 0.15), hsl(36 80% 55% / 0.08))',
                  boxShadow: '0 0 12px hsl(36 70% 50% / 0.2), 0 2px 8px hsl(36 70% 50% / 0.15)',
                  border: '1px solid hsl(36 70% 50% / 0.1)',
                } : undefined}
              >
                <item.icon
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'h-6 w-6 nav-icon-active'
                      : 'h-[18px] w-[18px]'
                  }`}
                  style={isActive ? {
                    color: 'hsl(36 80% 60%)',
                    filter: 'drop-shadow(0 0 8px hsl(36 70% 50% / 0.45))',
                  } : {
                    color: 'hsl(36 18% 40%)',
                  }}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
              </div>
              <span
                className="text-[10px] leading-none tracking-wide transition-all duration-300"
                style={isActive ? {
                  fontWeight: 700,
                  color: 'hsl(36 80% 60%)',
                } : {
                  fontWeight: 500,
                  color: 'hsl(36 15% 38%)',
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
          className="flex flex-col items-center justify-center gap-[6px] flex-1 transition-transform duration-150 active:scale-[0.85]"
        >
          <div className="flex items-center justify-center w-10 h-8 rounded-2xl">
            <MoreHorizontal className="h-[18px] w-[18px]" style={{ color: 'hsl(36 18% 40%)' }} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] leading-none tracking-wide font-medium" style={{ color: 'hsl(36 15% 38%)' }}>
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
