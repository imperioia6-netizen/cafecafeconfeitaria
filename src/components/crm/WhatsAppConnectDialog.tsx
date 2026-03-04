import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Wifi, WifiOff, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCrmSettings } from '@/hooks/useCrmSettings';

const EVOLUTION_BASE_URL_KEY = 'evolution_base_url';
const EVOLUTION_API_KEY_KEY = 'evolution_api_key';
const EVOLUTION_INSTANCE_KEY = 'evolution_instance';
const EVOLUTION_WEBHOOK_SECRET_KEY = 'evolution_webhook_secret';
const OWNER_PHONES_KEY = 'owner_phones';
const OWNER_PHONE_OVERRIDE_KEY = 'owner_phone_override';
const ATENDENTE_PHONE_KEY = 'atendente_phone';

interface WhatsAppConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WhatsAppConnectDialog = ({ open, onOpenChange }: WhatsAppConnectDialogProps) => {
  const { toast } = useToast();
  const { data: settings, getSetting, upsertSettingsBatch } = useCrmSettings();
  const [evolutionBaseUrl, setEvolutionBaseUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [evolutionWebhookSecret, setEvolutionWebhookSecret] = useState('');
  const [ownerPhones, setOwnerPhones] = useState('');
  const [atendentePhone, setAtendentePhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);

  const webhookUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')}/functions/v1/evolution-webhook`
    : 'https://SEU_PROJETO.supabase.co/functions/v1/evolution-webhook';

  useEffect(() => {
    if (open && settings) {
      setEvolutionBaseUrl(getSetting(EVOLUTION_BASE_URL_KEY) || '');
      setEvolutionApiKey(getSetting(EVOLUTION_API_KEY_KEY) || '');
      setEvolutionInstance(getSetting(EVOLUTION_INSTANCE_KEY) || '');
      setEvolutionWebhookSecret(getSetting(EVOLUTION_WEBHOOK_SECRET_KEY) || '');
      setOwnerPhones(getSetting(OWNER_PHONES_KEY) || getSetting(OWNER_PHONE_OVERRIDE_KEY) || '');
      setAtendentePhone(getSetting(ATENDENTE_PHONE_KEY) || '');
      setConnected(!!(getSetting(EVOLUTION_BASE_URL_KEY) && getSetting(EVOLUTION_API_KEY_KEY)));
    }
  }, [open, settings, getSetting]);

  const handleSave = async () => {
    const baseUrl = evolutionBaseUrl.trim().replace(/\/$/, '');
    if (!baseUrl || !evolutionApiKey.trim()) {
      toast({ title: 'Preencha a URL base e a API Key da Evolution', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const ownerPhonesTrim = ownerPhones.trim();
      const firstOwner = ownerPhonesTrim.split(/[\n,;]+/)[0]?.trim() || '';
      await upsertSettingsBatch.mutateAsync([
        { key: EVOLUTION_BASE_URL_KEY, value: baseUrl },
        { key: EVOLUTION_API_KEY_KEY, value: evolutionApiKey.trim() },
        { key: EVOLUTION_INSTANCE_KEY, value: evolutionInstance.trim() },
        { key: EVOLUTION_WEBHOOK_SECRET_KEY, value: evolutionWebhookSecret.trim() },
        { key: OWNER_PHONES_KEY, value: ownerPhonesTrim },
        { key: OWNER_PHONE_OVERRIDE_KEY, value: firstOwner },
        { key: ATENDENTE_PHONE_KEY, value: atendentePhone.trim() },
      ]);
      setConnected(true);
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      setEvolutionBaseUrl('');
      setEvolutionApiKey('');
      setEvolutionInstance('');
      setEvolutionWebhookSecret('');
      setOwnerPhones('');
      setAtendentePhone('');
      await upsertSettingsBatch.mutateAsync([
        { key: EVOLUTION_BASE_URL_KEY, value: '' },
        { key: EVOLUTION_API_KEY_KEY, value: '' },
        { key: EVOLUTION_INSTANCE_KEY, value: '' },
        { key: EVOLUTION_WEBHOOK_SECRET_KEY, value: '' },
        { key: OWNER_PHONES_KEY, value: '' },
        { key: OWNER_PHONE_OVERRIDE_KEY, value: '' },
        { key: ATENDENTE_PHONE_KEY, value: '' },
      ]);
      setConnected(false);
      toast({ title: 'WhatsApp desconectado e configurações limpas.' });
    } catch {
      toast({ title: 'Erro ao limpar configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden glass-card border-border/30 min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg min-w-0">
            <MessageCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            Conectar WhatsApp (Evolution API)
          </DialogTitle>
          <DialogDescription>
            Configure a Evolution API. Um único agente: atende os leads nesse número e, quando um dono manda mensagem, informa relatórios, dados de compra, faturamento e estoque. Vincule os números dos donos e o número do atendente (IA).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 min-w-0 max-w-full">
          {/* Espaço para QR / status quando a Evolution expuser via API */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center gap-2">
              <QrCode className="h-16 w-16 text-emerald-400/60" />
              <span className="text-xs text-muted-foreground text-center px-4">
                QR Code e status na sua instância Evolution
              </span>
            </div>
            <Badge
              variant="outline"
              className={connected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
              }
            >
              {connected ? <Wifi className="h-3 w-3 mr-1.5" /> : <WifiOff className="h-3 w-3 mr-1.5" />}
              {connected ? 'Configurado' : 'Não configurado'}
            </Badge>
          </div>

            <div className="space-y-3 min-w-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Evolution API – URL base</Label>
              <Input
                placeholder="https://sua-evolution.com"
                value={evolutionBaseUrl}
                onChange={e => setEvolutionBaseUrl(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Evolution API – Chave (API Key)</Label>
              <Input
                type="password"
                placeholder="Sua API Key da Evolution"
                value={evolutionApiKey}
                onChange={e => setEvolutionApiKey(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome da instância (opcional)</Label>
              <Input
                placeholder="ex: cafe-confeitaria"
                value={evolutionInstance}
                onChange={e => setEvolutionInstance(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Segredo do webhook (opcional)</Label>
              <Input
                type="password"
                placeholder="Header x-webhook-secret na Evolution"
                value={evolutionWebhookSecret}
                onChange={e => setEvolutionWebhookSecret(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL do webhook na Evolution</Label>
              <p className="text-xs text-muted-foreground break-all font-mono bg-muted/50 p-2 rounded min-w-0">{webhookUrl}</p>
              <p className="text-[10px] text-muted-foreground">Configure na sua instância Evolution o evento MESSAGES_UPSERT apontando para esta URL.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Números dos donos/proprietários (relatórios, dados, estoque)</Label>
              <Textarea
                placeholder="Um por linha ou vírgula. Ex: 5511999999999, +5511888888888"
                value={ownerPhones}
                onChange={e => setOwnerPhones(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full resize-y min-h-[72px]"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground">Quem mandar mensagem de um desses números recebe do mesmo agente: relatórios, dados de compra, faturamento, estoque.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Número do atendente (IA) – WhatsApp que atende os leads</Label>
              <Input
                placeholder="Ex.: 5511999999999 ou +5511999999999"
                value={atendentePhone}
                onChange={e => setAtendentePhone(e.target.value)}
                className="input-glow text-sm w-full min-w-0 max-w-full"
              />
              <p className="text-[10px] text-muted-foreground">Número da instância em que a IA atende clientes e leads (pedidos, cardápio, encomendas).</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {connected ? (
            <Button variant="outline" onClick={handleDisconnect} className="w-full sm:w-auto">
              Limpar config local
            </Button>
          ) : null}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppConnectDialog;
