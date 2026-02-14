import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import AppSidebar from './AppSidebar';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Coffee className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
