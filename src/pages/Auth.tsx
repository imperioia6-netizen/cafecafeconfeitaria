import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Coffee, Eye, EyeOff, Phone, Cake, BarChart3, Package, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AccountType = 'client' | 'employee';

const Auth = () => {
  const { user, loading, signIn, signUp, roles } = useAuth();
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'hsl(24 28% 5%)' }}>
        <Coffee className="h-8 w-8 text-accent opacity-60" />
      </div>
    );
  }

  const getRedirectPath = () => {
    if (roles.includes('owner')) return '/';
    if (roles.includes('employee')) return '/orders';
    return '/cardapio';
  };

  if (user && roles.length > 0) return <Navigate to={getRedirectPath()} replace />;

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
    <div className="flex min-h-screen" style={{ background: 'hsl(0 0% 100%)' }}>
      {/* ── Left Branding Panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative"
        style={{
          background: 'linear-gradient(160deg, hsl(24 40% 10%) 0%, hsl(24 35% 6%) 50%, hsl(24 30% 4%) 100%)',
        }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 30%, hsl(36 70% 50% / 0.04) 0%, transparent 60%)',
          }}
        />

        {/* Gold vertical line separator */}
        <div
          className="absolute right-0 top-[10%] bottom-[10%] w-px"
          style={{
            background: 'linear-gradient(180deg, transparent, hsl(36 70% 50% / 0.3), hsl(36 70% 50% / 0.5), hsl(36 70% 50% / 0.3), transparent)',
          }}
        />

        <div className="relative z-10 max-w-md px-12">
          {/* Badge */}
          <div className="mb-12">
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-[0.25em] px-4 py-1.5 rounded-full"
              style={{
                color: 'hsl(36 70% 55%)',
                border: '1px solid hsl(36 70% 50% / 0.2)',
                background: 'hsl(36 70% 50% / 0.05)',
              }}
            >
              Sistema de Gestão
            </span>
          </div>

          {/* Title — pure typography, no icon */}
          <h1
            className="text-6xl font-extrabold tracking-tight leading-none mb-3 text-gradient-gold"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Café
            <br />
            Café
          </h1>
          <p
            className="text-sm font-light tracking-[0.3em] uppercase mb-16"
            style={{ color: 'hsl(36 30% 55%)' }}
          >
            Confeitaria & Gestão
          </p>

          {/* Features */}
          <div className="space-y-0">
            {features.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-center gap-4 py-4">
                  <div
                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'hsl(36 70% 50% / 0.08)' }}
                  >
                    <f.icon className="h-4 w-4 text-accent" />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'hsl(36 30% 70%)' }}
                  >
                    {f.label}
                  </span>
                </div>
                {i < features.length - 1 && (
                  <div className="separator-gradient" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div
        className="flex w-full lg:w-1/2 flex-col items-center justify-center relative nav-cinema-bg p-6 sm:p-8"
        style={{
          background: 'linear-gradient(160deg, hsl(24 25% 9%) 0%, hsl(24 28% 6%) 50%, hsl(24 30% 4%) 100%)',
        }}
      >
        <div className="w-full max-w-sm relative z-10">
          {/* Mobile branding */}
          <div className="flex items-center gap-3 lg:hidden mb-10">
            <Coffee className="h-7 w-7 text-accent" />
            <span
              className="text-xl font-bold text-gradient-gold"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Café Café
            </span>
          </div>

          <Card
            className="border rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, hsl(24 30% 12%) 0%, hsl(24 25% 8%) 100%)',
              borderColor: 'hsl(24 20% 18%)',
              boxShadow: '0 8px 40px hsl(24 30% 4% / 0.3)',
            }}
          >
            <CardContent className="p-7 sm:p-8">
              {/* Header */}
              <div className="mb-8">
                <h2
                  className="text-2xl font-bold tracking-tight mb-1"
                  style={{ color: 'hsl(36 40% 93%)' }}
                >
                  {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
                </h2>
                <p className="text-sm" style={{ color: 'hsl(36 20% 50%)' }}>
                  {isLogin ? 'Entre com suas credenciais' : 'Preencha os dados para começar'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <>
                    {/* Account type */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(36 20% 50%)' }}>
                        Tipo de conta
                      </Label>
                      <div className="flex gap-2">
                        {([
                          { value: 'client' as AccountType, label: 'Cliente' },
                          { value: 'employee' as AccountType, label: 'Funcionário' },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setAccountType(opt.value)}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{
                               background: accountType === opt.value
                                 ? 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))'
                                 : 'hsl(0 0% 100% / 0.05)',
                               color: accountType === opt.value
                                 ? 'hsl(36 40% 95%)'
                                 : 'hsl(36 20% 55%)',
                               border: `1px solid ${accountType === opt.value ? 'hsl(36 70% 40% / 0.4)' : 'hsl(0 0% 100% / 0.08)'}`,
                             }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(36 20% 50%)' }}>
                        Nome
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        required
                        className="h-12 rounded-xl border-white/[0.08] text-white placeholder:text-white/25"
                        style={{ background: 'hsl(0 0% 100% / 0.05)' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(24 15% 45%)' }}>
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />Telefone</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(11) 99999-0000"
                          className="h-12 rounded-xl border text-foreground placeholder:text-muted-foreground/50"
                          style={{ background: 'hsl(24 10% 96%)', borderColor: 'hsl(24 10% 88%)' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthday" className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(24 15% 45%)' }}>
                          <span className="flex items-center gap-1"><Cake className="h-3 w-3" />Aniversário</span>
                        </Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={birthday}
                          onChange={(e) => setBirthday(e.target.value)}
                          className="h-12 rounded-xl border text-foreground placeholder:text-muted-foreground/50"
                          style={{ background: 'hsl(24 10% 96%)', borderColor: 'hsl(24 10% 88%)' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(24 15% 45%)' }}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="h-12 rounded-xl border text-foreground placeholder:text-muted-foreground/50"
                    style={{ background: 'hsl(24 10% 96%)', borderColor: 'hsl(24 10% 88%)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(24 15% 45%)' }}>
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 pr-11 rounded-xl border text-foreground placeholder:text-muted-foreground/50"
                      style={{ background: 'hsl(24 10% 96%)', borderColor: 'hsl(24 10% 88%)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'hsl(24 15% 55%)' }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-sm font-bold rounded-full shine-effect transition-all duration-300 mt-2"
                  style={{
                    background: 'linear-gradient(135deg, hsl(24 60% 25%), hsl(36 70% 45%), hsl(24 55% 30%))',
                    color: 'hsl(36 40% 95%)',
                    boxShadow: '0 4px 24px hsl(24 60% 20% / 0.4), 0 0 0 1px hsl(36 70% 50% / 0.1)',
                  }}
                  disabled={submitting}
                >
                  <span className="relative z-10">
                    {submitting ? <Coffee className="h-4 w-4 animate-spin" /> : isLogin ? 'Entrar' : 'Criar conta'}
                  </span>
                </Button>
              </form>

              {/* Separator */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 separator-gradient" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: 'hsl(24 15% 65%)' }}>ou</span>
                <div className="flex-1 separator-gradient" />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm font-medium transition-colors duration-200 hover:underline underline-offset-4"
                  style={{ color: 'hsl(24 60% 40%)' }}
                >
                  {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p
            className="text-center mt-8 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'hsl(36 15% 30%)' }}
          >
            Café Café © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
