import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const NewEmployeeDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', birthday: '' });
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: 'employee',
          ...(form.phone && { phone: form.phone }),
          ...(form.birthday && { birthday: form.birthday }),
        },
      },
    });

    if (error) {
      toast.error('Erro ao cadastrar funcionário: ' + error.message);
    } else {
      toast.success('Funcionário cadastrado com sucesso!');
      setForm({ name: '', email: '', password: '', phone: '', birthday: '' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
    setLoading(false);
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" style={{
          background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
          boxShadow: '0 2px 12px hsl(24 60% 23% / 0.3)',
        }}>
          <UserPlus className="h-4 w-4" />
          Novo Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Cadastrar Funcionário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Nome completo" required className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@exemplo.com" required className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Senha temporária *</Label>
            <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(11) 99999-0000" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Aniversário</Label>
              <Input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} className="bg-white/5 border-white/10" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading} style={{
            background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))',
          }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEmployeeDialog;
