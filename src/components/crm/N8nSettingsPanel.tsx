import { useState, useEffect } from 'react';
import { useCrmSettings } from '@/hooks/useCrmSettings';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { useCrmMessages } from '@/hooks/useCrmMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Webhook, Zap, CheckCircle2, XCircle, Clock, Headset, CreditCard, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import SetupWhatsAppIA from '@/components/crm/SetupWhatsAppIA';

const N8nSettingsPanel = () => {
  const { data: settings, getSetting, upsertSetting, upsertSettingsBatch } = useCrmSettings();
  const { testConnection } = useCrmN8n();
  const { data: allMessages } = useCrmMessages();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoReturnEnabled, setAutoReturnEnabled] = useState(false);
  const [noResponseMinutes, setNoResponseMinutes] = useState('30');
  const [paymentPixKey, setPaymentPixKey] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [agentApiKey, setAgentApiKey] = useState('');
  const [agentApiBase, setAgentApiBase] = useState('https://api.openai.com/v1');
  const [agentModel, setAgentModel] = useState('gpt-4o');
  const [atendenteInstructions, setAtendenteInstructions] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [connectionTested, setConnectionTested] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!settings || loaded) return;
    setWebhookUrl(getSetting('n8n_webhook_url') || '');
    setAutoReturnEnabled(getSetting('auto_return_enabled') === 'true');
    setNoResponseMinutes(getSetting('no_response_minutes') || '30');
    setPaymentPixKey(getSetting('payment_pix_key') || '');
    setPaymentInstructions(getSetting('payment_instructions') || '');
    setAgentApiKey(getSetting('agent_api_key') || '');
    setAgentApiBase(getSetting('agent_api_base') || 'https://api.openai.com/v1');
    setAgentModel(getSetting('agent_model') || 'gpt-4o');
    setAtendenteInstructions(getSetting('atendente_instructions') || '');
    setLoaded(true);
  }, [settings, getSetting, loaded]);

  const saveWebhook = () => upsertSetting.mutate({ key: 'n8n_webhook_url', value: webhookUrl });

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
      {/* Configuração completa WhatsApp + IA (tudo em um lugar) */}
      <SetupWhatsAppIA />

      {/* IA do agente (ChatGPT / OpenAI) – atendente e assistente no WhatsApp */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>IA do agente (ChatGPT)</span>
          </CardTitle>
          <CardDescription>
            Chave e modelo usados pelo atendente e pelo assistente no WhatsApp. Sem configurar, as respostas automáticas não usam IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key (OpenAI / ChatGPT)</Label>
            <Input
              type="password"
              value={agentApiKey}
              onChange={e => setAgentApiKey(e.target.value)}
              placeholder="sk-... (obtenha em platform.openai.com)"
              className="input-glow text-sm w-full"
            />
          </div>
          <div>
            <Label>URL base (opcional)</Label>
            <Input
              value={agentApiBase}
              onChange={e => setAgentApiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="input-glow text-sm w-full"
            />
          </div>
          <div>
            <Label>Modelo (opcional)</Label>
            <Input
              value={agentModel}
              onChange={e => setAgentModel(e.target.value)}
              placeholder="gpt-4o, gpt-4o-mini, gpt-4-turbo..."
              className="input-glow text-sm w-full"
            />
          </div>
          <div>
            <Label>Instruções do atendente (como deve agir e falar com os clientes)</Label>
            <Textarea
              value={atendenteInstructions}
              onChange={e => setAtendenteInstructions(e.target.value)}
              placeholder="Ex.: Seja sempre cordial e use o nome da pessoa. Não invente preços. Ao falar de encomendas, sempre mencione os 50% de entrada. Evite gírias. Se o cliente reclamar, peça desculpas e ofereça resolver."
              className="input-glow text-sm w-full min-h-[120px] resize-y mt-1"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">A IA do WhatsApp usa essas orientações em toda conversa com o cliente.</p>
          </div>
          <Button
            onClick={() => {
              upsertSettingsBatch.mutate([
                { key: 'agent_api_key', value: agentApiKey.trim() },
                { key: 'agent_api_base', value: (agentApiBase || 'https://api.openai.com/v1').trim().replace(/\/$/, '') },
                { key: 'agent_model', value: (agentModel || 'gpt-4o').trim() || 'gpt-4o' },
                { key: 'atendente_instructions', value: atendenteInstructions.trim() },
              ]);
            }}
            disabled={upsertSettingsBatch.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {upsertSettingsBatch.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      {/* Atendimento Config */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headset className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Atendimento</span>
          </CardTitle>
          <CardDescription>Retorno automático após período sem resposta do cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Retorno automático</Label>
              <p className="text-xs text-muted-foreground">Alterar status para "Voltar contato" após tempo sem resposta</p>
            </div>
            <Switch checked={autoReturnEnabled} onCheckedChange={setAutoReturnEnabled} />
          </div>
          {autoReturnEnabled && (
            <div>
              <Label>Minutos sem resposta</Label>
              <Input type="number" value={noResponseMinutes} onChange={e => setNoResponseMinutes(e.target.value)} className="input-glow w-32 mt-1" />
            </div>
          )}
          <Button
            onClick={() => {
              upsertSettingsBatch.mutate([
                { key: 'auto_return_enabled', value: autoReturnEnabled ? 'true' : 'false' },
                { key: 'no_response_minutes', value: noResponseMinutes },
              ]);
            }}
            disabled={upsertSettingsBatch.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {upsertSettingsBatch.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      {/* Pagamento para atendente WhatsApp */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pagamento (atendente WhatsApp)</span>
          </CardTitle>
          <CardDescription>Dados que a IA usa para informar clientes quando pedirem para pagar ou fazer pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chave PIX</Label>
            <Input
              value={paymentPixKey}
              onChange={e => setPaymentPixKey(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="input-glow text-sm"
            />
          </div>
          <div>
            <Label>Instruções de pagamento (opcional)</Label>
            <Input
              value={paymentInstructions}
              onChange={e => setPaymentInstructions(e.target.value)}
              placeholder="Ex: Aceitamos PIX, cartão e dinheiro. Pedido mínimo R$ 15."
              className="input-glow text-sm"
            />
          </div>
          <Button
            onClick={() => {
              upsertSettingsBatch.mutate([
                { key: 'payment_pix_key', value: paymentPixKey.trim() },
                { key: 'payment_instructions', value: paymentInstructions.trim() },
              ]);
            }}
            disabled={upsertSettingsBatch.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {upsertSettingsBatch.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity Log */}
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Últimas Mensagens</span>
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
