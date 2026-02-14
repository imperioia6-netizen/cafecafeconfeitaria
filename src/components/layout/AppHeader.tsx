import { useAuth } from '@/hooks/useAuth';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const AppHeader = () => {
  const { user, roles } = useAuth();
  const { data: alerts } = useActiveAlerts();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState('');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.name) setProfileName(data.name); });
  }, [user]);

  const firstName = profileName.split(' ')[0] || 'Usuário';
  const initials = profileName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const alertCount = alerts?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 backdrop-blur-2xl bg-background/80 border-b border-border/30">
      {/* Subtle gradient border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <div className="animate-fade-in">
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          {getGreeting()}, <span className="text-gradient-gold">{firstName}</span>
        </h2>
        <p className="text-sm text-muted-foreground/70 font-mono text-xs tracking-wide">
          {clock.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* System status badge */}
        {alertCount > 0 ? (
          <Badge
            variant="destructive"
            className="cursor-pointer gap-1.5 px-3 py-1.5 animate-glow-pulse glow-destructive"
            onClick={() => navigate('/alerts')}
          >
            <Bell className="h-3.5 w-3.5" />
            {alertCount} alerta{alertCount > 1 ? 's' : ''}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-success/10 text-success border-success/20 glow-success">
            <CheckCircle className="h-3.5 w-3.5" />
            Tudo certo
          </Badge>
        )}

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-xl transition-all duration-300 hover:bg-muted/50 hover:shadow-md"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-glow-pulse">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 group">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-border transition-all duration-500 group-hover:ring-accent/40 group-hover:shadow-lg">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full ring-2 ring-accent/0 group-hover:ring-accent/30 transition-all duration-500 group-hover:scale-110" />
          </div>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
