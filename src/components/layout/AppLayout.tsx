import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileBottomNav from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading, viewAs } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On mobile, sidebar starts closed
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Coffee className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full animate-glow-pulse" style={{ boxShadow: '0 0 24px hsl(36 70% 50% / 0.3)' }} />
          </div>
          <p className="text-sm text-muted-foreground animate-glow-pulse font-light tracking-wide">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (viewAs === 'client') return <Navigate to="/cardapio" replace />;

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-background hero-gradient">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          !isMobile && sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <AppHeader onToggleSidebar={toggleSidebar} />
        <main className="flex-1 p-3 md:p-8 pb-20 md:pb-8 animate-fade-in">
          {children}
        </main>
      </div>
      {isMobile && (
        <MobileBottomNav onOpenMore={() => setSidebarOpen(true)} />
      )}
    </div>
  );
};

export default AppLayout;
