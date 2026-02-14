import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Save, Loader2, Phone, Cake, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  employee: 'Funcionário',
  client: 'Cliente',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  employee: 'secondary',
  client: 'outline',
};

const Profile = () => {
  const { user, roles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birthday: '',
    family_name: '',
    family_birthday: '',
  });
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setProfileId(data.id);
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          birthday: data.birthday || '',
          family_name: data.family_name || '',
          family_birthday: data.family_birthday || '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: form.name,
        phone: form.phone || null,
        birthday: form.birthday || null,
        family_name: form.family_name || null,
        family_birthday: form.family_birthday || null,
      })
      .eq('id', profileId);

    if (error) {
      toast.error('Erro ao salvar perfil');
    } else {
      toast.success('Perfil atualizado!');
    }
    setSaving(false);
  };

  const initials = form.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      {initials || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-lg">{form.name || 'Sem nome'}</span>
                    <div className="flex gap-1 mt-1">
                      {roles.map(r => (
                        <Badge key={r} variant={roleBadgeVariant[r] || 'secondary'}>
                          {roleLabels[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados pessoais */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados Pessoais
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday" className="flex items-center gap-1">
                      <Cake className="h-3 w-3" /> Aniversário
                    </Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={form.birthday}
                      onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Familiar */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Familiar Próximo
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="family_name">Nome do Familiar</Label>
                    <Input
                      id="family_name"
                      value={form.family_name}
                      onChange={e => setForm(f => ({ ...f, family_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="family_birthday" className="flex items-center gap-1">
                      <Cake className="h-3 w-3" /> Aniversário do Familiar
                    </Label>
                    <Input
                      id="family_birthday"
                      type="date"
                      value={form.family_birthday}
                      onChange={e => setForm(f => ({ ...f, family_birthday: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Profile;
