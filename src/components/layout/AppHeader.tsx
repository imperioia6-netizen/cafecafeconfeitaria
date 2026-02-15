import { useAuth } from '@/hooks/useAuth';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, UserCircle, LogOut, Eye, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const viewLabels: Record<string, string> = {
  owner: 'Proprietário',
  employee: 'Funcionário',
  client: 'Cliente',
};

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

const AppHeader = ({ onToggleSidebar }: AppHeaderProps) => {
  const { user, roles, signOut, isOwner, viewAs, setViewAs } = useAuth();
  const realIsOwner = roles.includes('owner');
  const { data: alerts } = useActiveAlerts();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 backdrop-blur-2xl bg-background/80 border-b border-border/30">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger - hidden on mobile since bottom nav handles navigation */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-xl hover:bg-muted/50 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="animate-fade-in min-w-0">
          <h2 className="text-lg md:text-xl font-bold tracking-tight truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isMobile ? (
              <span className="text-gradient-gold">{firstName}</span>
            ) : (
              <>
                {getGreeting()}, <span className="text-gradient-gold">{firstName}</span>
              </>
            )}
          </h2>
          {!isMobile && (
            <p className="text-sm text-muted-foreground/70 font-mono text-xs tracking-wide">
              {clock.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Simulated view badge */}
        {viewAs && (
          <Badge
            variant="outline"
            className="cursor-pointer gap-1 px-2 md:px-3 py-1 md:py-1.5 border-accent/40 text-accent animate-fade-in text-[10px] md:text-xs"
            onClick={() => setViewAs(null)}
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline">Visão:</span> {viewLabels[viewAs]}
            <span className="text-[10px] ml-0.5 opacity-60">✕</span>
          </Badge>
        )}

        {/* System status badge - hidden on small mobile */}
        {!isMobile && (
          alertCount > 0 ? (
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
          )
        )}

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-xl transition-all duration-300 hover:bg-muted/50 active:scale-90"
        >
          <Bell className="h-[22px] w-[22px] text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-glow-pulse">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 group outline-none">
              <div className="relative">
                <Avatar className="h-9 w-9 md:h-9 md:w-9 ring-2 ring-border transition-all duration-500 group-hover:ring-accent/40 group-hover:shadow-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full ring-2 ring-accent/0 group-hover:ring-accent/30 transition-all duration-500 group-hover:scale-110" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-popover border-border shadow-xl z-50">
            <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
              <UserCircle className="h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>

            {realIsOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                    <Eye className="h-4 w-4" />
                    Trocar Visão
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover border-border shadow-xl z-50">
                    {(['owner', 'employee', 'client'] as const).map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setViewAs(role === 'owner' ? null : role)}
                        className={`cursor-pointer ${(!viewAs && role === 'owner') || viewAs === role ? 'bg-accent/20 font-semibold' : ''}`}
                      >
                        {viewLabels[role]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
