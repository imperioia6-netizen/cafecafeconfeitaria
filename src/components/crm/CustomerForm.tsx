import { useState, useEffect } from 'react';
import { useCustomers, type Customer, type CustomerInsert } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface CustomerFormProps {
  onSuccess?: () => void;
  customer?: Customer;
  mode?: 'create' | 'edit';
}

const emptyForm = {
  name: '', phone: '', email: '',
  birthday: '', family_name: '', family_birthday: '', preferred_channel: 'balcao',
};

const CustomerForm = ({ onSuccess, customer, mode = 'create' }: CustomerFormProps) => {
  const { createCustomer, updateCustomer } = useCustomers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (customer && mode === 'edit') {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        birthday: customer.birthday || '',
        family_name: customer.family_name || '',
        family_birthday: customer.family_birthday || '',
        preferred_channel: customer.preferred_channel || 'balcao',
      });
    }
  }, [customer, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      birthday: form.birthday || null,
      family_birthday: form.family_birthday || null,
      phone: form.phone || null,
      email: form.email || null,
      
      family_name: form.family_name || null,
    };
    if (mode === 'edit' && customer) {
      await updateCustomer.mutateAsync({ id: customer.id, ...payload } as any);
    } else {
      await createCustomer.mutateAsync(payload as any);
    }
    if (mode === 'create') {
      setOpen(false);
      setForm(emptyForm);
    }
    onSuccess?.();
  };

  const isPending = mode === 'edit' ? updateCustomer.isPending : createCustomer.isPending;
  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  // If edit mode, render form inline (no dialog wrapper)
  if (mode === 'edit') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFields form={form} update={update} />
        <Button type="submit" disabled={isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isPending ? 'Salvando...' : 'Atualizar Cliente'}
        </Button>
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
          <Plus className="h-4 w-4" />Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Cadastrar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFields form={form} update={update} />
          <Button type="submit" disabled={isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {isPending ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FormFields = ({ form, update }: { form: typeof emptyForm; update: (k: string, v: any) => void }) => (
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
);

export default CustomerForm;
