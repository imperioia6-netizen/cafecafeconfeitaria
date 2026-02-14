import { useState } from 'react';
import { useCrmSettings } from '@/hooks/useCrmSettings';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { useCrmMessages } from '@/hooks/useCrmMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Webhook, Zap, Instagram, CheckCircle2, XCircle, Clock, Headset } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const N8nSettingsPanel = () => {
  const { data: settings, getSetting, upsertSetting } = useCrmSettings();
  const { testConnection } = useCrmN8n();
  const { data: allMessages } = useCrmMessages();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [autoAssign, setAutoAssign] = useState(false);
  const [noResponseMinutes, setNoResponseMinutes] = useState('30');
  const [loaded, setLoaded] = useState(false);
  const [connectionTested, setConnectionTested] = useState<'idle' | 'success' | 'error'>('idle');

  if (settings && !loaded) {
    setWebhookUrl(getSetting('n8n_webhook_url') || '');
    setMinFollowers(getSetting('influence_min_followers') || '5000');
    setDiscountPercent(getSetting('influence_discount_percent') || '20');
    setAutoAssign(getSetting('auto_assign_enabled') === 'true');
    setNoResponseMinutes(getSetting('no_response_minutes') || '30');
    setLoaded(true);
  }

  const saveWebhook = () => upsertSetting.mutate({ key: 'n8n_webhook_url', value: webhookUrl });
  const saveInfluence = () => {
    upsertSetting.mutate({ key: 'influence_min_followers', value: minFollowers });
    upsertSetting.mutate({ key: 'influence_discount_percent', value: discountPercent });
  };

  const handleTestConnection = () => {
    testConnection.mutate(webhookUrl, {
      onSuccess: () => setConnectionTested('success'),
      onError: () => setConnectionTested('error'),
    });
  };

  // Recent messages log
  const recentMessages = (allMessages || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Atendimento Config */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headset className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Atendimento</span>
          </CardTitle>
          <CardDescription>Configure o comportamento do sistema de atendimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Atendimento automático</Label>
              <p className="text-xs text-muted-foreground">Distribuir novos clientes automaticamente para atendentes disponíveis</p>
            </div>
            <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
          </div>
          <div>
            <Label>Minutos sem resposta para voltar contato</Label>
            <p className="text-xs text-muted-foreground mb-2">Após este tempo sem resposta do cliente, o status será alterado para "Voltar contato"</p>
            <Input type="number" value={noResponseMinutes} onChange={e => setNoResponseMinutes(e.target.value)} className="input-glow w-32" />
          </div>
          <Button
            onClick={() => {
              upsertSetting.mutate({ key: 'auto_assign_enabled', value: autoAssign ? 'true' : 'false' });
              upsertSetting.mutate({ key: 'no_response_minutes', value: noResponseMinutes });
            }}
            disabled={upsertSetting.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Config */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Webhook className="h-5 w-5 text-accent" />
              <span className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Webhook n8n</span>
            </span>
            {/* Connection status */}
            {connectionTested === 'success' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-0 gap-1">
                <CheckCircle2 className="h-3 w-3" />Conectado
              </Badge>
            )}
            {connectionTested === 'error' && (
              <Badge className="bg-red-500/10 text-red-400 border-0 gap-1">
                <XCircle className="h-3 w-3" />Erro
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Webhook</Label>
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://seu-n8n.app/webhook/..."
              className="input-glow font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveWebhook} disabled={upsertSetting.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Zap className="h-4 w-4 mr-1" />Salvar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnection.isPending || !webhookUrl}
              className="border-accent/30 text-accent hover:bg-accent/10"
            >
              {testConnection.isPending ? 'Testando...' : 'Testar Conexão'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Influence Rules */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Instagram className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Paga com Influência</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mín. Seguidores</Label>
              <Input type="number" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="input-glow" />
            </div>
            <div>
              <Label>% Desconto</Label>
              <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="input-glow" />
            </div>
          </div>
          <Button onClick={saveInfluence} disabled={upsertSetting.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Salvar Regras
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity Log */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Últimas Mensagens</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem registrada.</p>
          ) : (
            <div className="space-y-2">
              {recentMessages.map(msg => (
                <div key={msg.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[9px] capitalize shrink-0">{msg.message_type.replace(/_/g, ' ')}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{msg.message_content?.slice(0, 40) || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={msg.status === 'enviada' ? 'default' : msg.status === 'erro' ? 'destructive' : 'outline'} className="text-[9px]">{msg.status}</Badge>
                    <span className="text-[9px] text-muted-foreground font-mono-numbers">
                      {format(parseISO(msg.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nSettingsPanel;
