import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Brain } from 'lucide-react';
import AutoPromotionsPanel from '@/components/smart/AutoPromotionsPanel';
import AiReportsPanel from '@/components/smart/AiReportsPanel';

const SmartHub = () => {
  const { loading, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('promotions');

  if (!loading && !user) { navigate('/auth'); return null; }
  if (!loading && !isOwner) { navigate('/'); return null; }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="opacity-0 animate-fade-in animate-stagger-1">
          <h1 className="page-title-gradient">Inteligência</h1>
          <p className="text-sm text-muted-foreground mt-1">Promoções automáticas e relatórios com IA</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex gap-2 bg-transparent p-0 h-auto overflow-x-auto no-scrollbar mobile-tabs">
            {[
              { value: 'promotions', label: 'Promoções 12h+', icon: Zap },
              { value: 'reports', label: 'Relatórios IA', icon: Brain },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-500 gap-1 md:gap-1.5 border-0 ${
                  activeTab === tab.value
                    ? 'text-primary-foreground depth-shadow scale-105'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
                style={activeTab === tab.value ? {
                  background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
                } : { background: 'hsl(var(--muted) / 0.5)' }}
              >
                <tab.icon className="h-3 w-3 md:h-3.5 md:w-3.5" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="promotions">
            <AutoPromotionsPanel />
          </TabsContent>

          <TabsContent value="reports">
            <AiReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SmartHub;
