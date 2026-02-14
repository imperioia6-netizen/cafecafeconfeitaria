import { useState } from 'react';
import { useCrmSettings } from '@/hooks/useCrmSettings';
import { useCrmN8n } from '@/hooks/useCrmN8n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook, Zap, Instagram } from 'lucide-react';

const N8nSettingsPanel = () => {
  const { data: settings, getSetting, upsertSetting } = useCrmSettings();
  const { testConnection } = useCrmN8n();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Load values once
  if (settings && !loaded) {
    setWebhookUrl(getSetting('n8n_webhook_url') || '');
    setMinFollowers(getSetting('influence_min_followers') || '5000');
    setDiscountPercent(getSetting('influence_discount_percent') || '20');
    setLoaded(true);
  }

  const saveWebhook = () => upsertSetting.mutate({ key: 'n8n_webhook_url', value: webhookUrl });
  const saveInfluence = () => {
    upsertSetting.mutate({ key: 'influence_min_followers', value: minFollowers });
    upsertSetting.mutate({ key: 'influence_discount_percent', value: discountPercent });
  };

  return (
    <div className="space-y-6">
      <Card className="card-cinematic rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Webhook className="h-5 w-5 text-accent" />
            <span className="text-gradient-gold" style={{ fontFamily: "'Playfair Display', serif" }}>Webhook n8n</span>
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
              onClick={() => testConnection.mutate(webhookUrl)}
              disabled={testConnection.isPending || !webhookUrl}
              className="border-accent/30 text-accent hover:bg-accent/10"
            >
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default N8nSettingsPanel;
