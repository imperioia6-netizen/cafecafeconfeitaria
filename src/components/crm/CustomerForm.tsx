import { useState } from 'react';
import { useCustomers, type CustomerInsert } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerFormProps {
  onSuccess?: () => void;
}

const CustomerForm = ({ onSuccess }: CustomerFormProps) => {
  const { createCustomer } = useCustomers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    instagram_handle: '',
    instagram_followers: 0,
    birthday: '',
    family_name: '',
    family_birthday: '',
    preferred_channel: 'balcao',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer.mutateAsync({
      ...form,
      birthday: form.birthday || null,
      family_birthday: form.family_birthday || null,
      phone: form.phone || null,
      email: form.email || null,
      instagram_handle: form.instagram_handle || null,
      family_name: form.family_name || null,
    } as any);
    setOpen(false);
    setForm({ name: '', phone: '', email: '', instagram_handle: '', instagram_followers: 0, birthday: '', family_name: '', family_birthday: '', preferred_channel: 'balcao' });
    onSuccess?.();
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">+ Novo Cliente</Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Cadastrar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} required className="input-glow" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} className="input-glow" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-glow" />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={form.instagram_handle} onChange={e => update('instagram_handle', e.target.value)} placeholder="@usuario" className="input-glow" />
            </div>
            <div>
              <Label>Seguidores</Label>
              <Input type="number" value={form.instagram_followers} onChange={e => update('instagram_followers', Number(e.target.value))} className="input-glow" />
            </div>
            <div>
              <Label>Aniversário</Label>
              <Input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} className="input-glow" />
            </div>
            <div>
              <Label>Canal Preferido</Label>
              <Select value={form.preferred_channel} onValueChange={v => update('preferred_channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Familiar (nome)</Label>
              <Input value={form.family_name} onChange={e => update('family_name', e.target.value)} className="input-glow" />
            </div>
            <div>
              <Label>Aniversário familiar</Label>
              <Input type="date" value={form.family_birthday} onChange={e => update('family_birthday', e.target.value)} className="input-glow" />
            </div>
          </div>
          <Button type="submit" disabled={createCustomer.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {createCustomer.isPending ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;
