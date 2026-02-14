import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

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

  return (
    <div className="min-h-screen bg-background hero-gradient">
      <AppSidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
