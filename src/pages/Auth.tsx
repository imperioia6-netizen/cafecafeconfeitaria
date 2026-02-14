import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coffee, Eye, EyeOff, ShieldCheck, BarChart3, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Coffee className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cadastro realizado!', description: 'Verifique seu email para confirmar.' });
      }
    }
    setSubmitting(false);
  };

  const features = [
    { icon: BarChart3, label: 'Dashboard executivo em tempo real' },
    { icon: Package, label: 'Controle de produção e estoque' },
    { icon: ShieldCheck, label: 'Gestão financeira completa' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(24, 60%, 18%) 0%, hsl(24, 40%, 8%) 50%, hsl(24, 35%, 12%) 100%)',
        }}
      >
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accent/5 animate-glow-pulse" />
          <div className="absolute bottom-32 -right-16 w-72 h-72 rounded-full bg-accent/8 animate-glow-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-primary-foreground/3 animate-glow-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center px-16 max-w-lg">
          <div className="flex items-center justify-center mb-10 opacity-0 animate-scale-in">
            <Coffee className="h-20 w-20 text-accent glow-gold" />
          </div>
          <h1 className="text-5xl font-bold text-primary-foreground mb-4 tracking-tight opacity-0 animate-fade-in" style={{ fontFamily: "'Playfair Display', serif", animationDelay: '200ms' }}>
            Café Café
          </h1>
          <p className="text-lg text-primary-foreground/60 font-light mb-14 opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
            Confeitaria & Gestão Inteligente
          </p>

          <div className="space-y-5">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-4 text-primary-foreground/70 opacity-0 animate-fade-in"
                style={{ animationDelay: `${600 + i * 150}ms` }}
              >
                <div className="rounded-lg bg-accent/10 p-2.5">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background bg-pattern">
        <Card className="w-full max-w-md border-0 shadow-none lg:glass-strong lg:border lg:border-border/30 lg:shadow-xl">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
              <Coffee className="h-9 w-9 text-primary" />
              <span className="text-2xl font-bold text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Café Café</span>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Entre com suas credenciais' : 'Preencha os dados para começar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required={!isLogin} className="h-11" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/20"
                disabled={submitting}
              >
                {submitting ? <Coffee className="h-4 w-4 animate-spin" /> : isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
