import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coffee, Eye, EyeOff, ShieldCheck, BarChart3, Package, Phone, Cake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AccountType = 'client' | 'employee';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative">
          <Coffee className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 animate-glow-pulse" style={{ boxShadow: '0 0 30px hsl(36 70% 50% / 0.3)' }} />
        </div>
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
      const { error } = await signUp(email, password, name, {
        phone: phone || undefined,
        birthday: birthday || undefined,
        role: accountType,
      });
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
          background: 'linear-gradient(135deg, hsl(24, 55%, 20%) 0%, hsl(24, 45%, 12%) 30%, hsl(24, 40%, 6%) 60%, hsl(24, 35%, 10%) 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 8s ease-in-out infinite',
        }}
      >
        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, hsl(36 70% 50% / 0.06), transparent 70%)', animationDelay: '0s' }} />
          <div className="absolute bottom-20 -right-24 w-[400px] h-[400px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, hsl(36 70% 50% / 0.08), transparent 70%)', animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, hsl(24 60% 23% / 0.05), transparent 70%)', animationDelay: '3s' }} />
        </div>

        <div className="relative z-10 text-center px-16 max-w-lg">
          <div className="flex items-center justify-center mb-10 opacity-0 animate-scale-in">
            <div className="relative animate-float">
              <Coffee className="h-20 w-20 text-accent" style={{ filter: 'drop-shadow(0 0 20px hsl(36 70% 50% / 0.4))' }} />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight opacity-0 animate-fade-in text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", animationDelay: '200ms' }}>
            Café Café
          </h1>
          <p className="text-lg font-light mb-14 opacity-0 animate-fade-in tracking-wide" style={{ animationDelay: '400ms', color: 'hsl(36 30% 70%)' }}>
            Confeitaria & Gestão Inteligente
          </p>

          <div className="space-y-6">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-4 opacity-0 animate-fade-in"
                style={{ animationDelay: `${600 + i * 150}ms`, color: 'hsl(36 30% 70%)' }}
              >
                <div className="rounded-xl p-3 animate-float" style={{ background: 'hsl(36 70% 50% / 0.08)', animationDelay: `${i * 0.5}s` }}>
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8"
        style={{
          background: 'linear-gradient(160deg, hsl(24, 45%, 14%) 0%, hsl(24, 40%, 10%) 50%, hsl(24, 35%, 8%) 100%)',
          color: 'hsl(36 40% 95%)',
        }}
      >
        <Card className="w-full max-w-md border-0 shadow-none bg-transparent" style={{ color: 'inherit' }}>
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
              <Coffee className="h-9 w-9 text-accent" />
              <span className="text-2xl font-bold text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Café Café</span>
            </div>
            <CardTitle className="text-2xl" style={{ color: 'hsl(36 40% 95%)' }}>
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </CardTitle>
            <CardDescription style={{ color: 'hsl(36 30% 65%)' }}>
              {isLogin ? 'Entre com suas credenciais' : 'Preencha os dados para começar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  {/* Account type selector */}
                  <div className="space-y-2">
                    <Label style={{ color: 'hsl(36 30% 75%)' }}>Tipo de conta</Label>
                    <div className="flex gap-2">
                      {([
                        { value: 'client' as AccountType, label: 'Cliente' },
                        { value: 'employee' as AccountType, label: 'Funcionário' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAccountType(opt.value)}
                          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300"
                          style={{
                            background: accountType === opt.value
                              ? 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))'
                              : 'hsl(0 0% 100% / 0.05)',
                            color: accountType === opt.value
                              ? 'hsl(36 40% 95%)'
                              : 'hsl(36 30% 65%)',
                            border: `1px solid ${accountType === opt.value ? 'hsl(36 70% 40% / 0.5)' : 'hsl(0 0% 100% / 0.1)'}`,
                            boxShadow: accountType === opt.value ? '0 2px 12px hsl(24 60% 23% / 0.3)' : 'none',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" style={{ color: 'hsl(36 30% 75%)' }}>Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required className="h-11 input-glow bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone" style={{ color: 'hsl(36 30% 75%)' }}>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />Telefone</span>
                      </Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" className="h-11 input-glow bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday" style={{ color: 'hsl(36 30% 75%)' }}>
                        <span className="flex items-center gap-1"><Cake className="h-3 w-3" />Aniversário</span>
                      </Label>
                      <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="h-11 input-glow bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: 'hsl(36 30% 75%)' }}>Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="h-11 input-glow bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: 'hsl(36 30% 75%)' }}>Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11 pr-10 input-glow bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold shine-effect transition-all duration-500"
                style={{
                  background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%), hsl(24 60% 23%))',
                  boxShadow: '0 4px 20px hsl(24 60% 23% / 0.3)',
                }}
                disabled={submitting}
              >
                <span className="relative z-10">
                  {submitting ? <Coffee className="h-4 w-4 animate-spin" /> : isLogin ? 'Entrar' : 'Criar conta'}
                </span>
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-accent transition-colors duration-300">
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
