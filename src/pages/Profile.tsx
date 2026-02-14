import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, Loader2, Phone, Cake, Heart, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = { owner: 'Proprietário', employee: 'Funcionário', client: 'Cliente' };

const Profile = () => {
  const { user, roles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', family_name: '', family_birthday: '' });
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfileId(data.id);
          setForm({ name: data.name || '', phone: data.phone || '', birthday: data.birthday || '', family_name: data.family_name || '', family_birthday: data.family_birthday || '' });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name, phone: form.phone || null, birthday: form.birthday || null,
      family_name: form.family_name || null, family_birthday: form.family_birthday || null,
    }).eq('id', profileId);
    if (error) { toast.error('Erro ao salvar'); }
    else { toast.success('Perfil atualizado!'); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const initials = form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Profile header */}
            <div className="rounded-t-xl p-8 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, hsl(24, 60%, 23%) 0%, hsl(24, 40%, 15%) 100%)' }}>
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-background shadow-xl animate-scale-in">
                <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
                  {initials || '?'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-primary-foreground mt-4">{form.name || 'Sem nome'}</h2>
              <div className="flex justify-center gap-2 mt-2">
                {roles.map(r => (
                  <Badge key={r} className="bg-accent/20 text-accent border border-accent/30 text-xs">
                    {roleLabels[r] || r}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Form */}
            <Card className="rounded-t-none border-t-0 card-premium">
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Dados Pessoais
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
                      <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday" className="flex items-center gap-1"><Cake className="h-3 w-3" /> Aniversário</Label>
                      <Input id="birthday" type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="h-11" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Heart className="h-3 w-3" /> Familiar Próximo
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="family_name">Nome</Label>
                      <Input id="family_name" value={form.family_name} onChange={e => setForm(f => ({ ...f, family_name: e.target.value }))} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="family_birthday" className="flex items-center gap-1"><Cake className="h-3 w-3" /> Aniversário</Label>
                      <Input id="family_birthday" type="date" value={form.family_birthday} onChange={e => setForm(f => ({ ...f, family_birthday: e.target.value }))} className="h-11" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="h-11 px-8 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2 text-success" /> : <Save className="h-4 w-4 mr-2" />}
                  {saved ? 'Salvo!' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Profile;
