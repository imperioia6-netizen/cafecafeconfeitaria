import { useState, useEffect } from 'react';
import { useCrmSettings } from '@/hooks/useCrmSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageCircle, ChevronDown, ChevronRight, Copy, Check, Loader2, Database } from 'lucide-react';

const SETUP_SQL = `-- Setup completo: WhatsApp + IA
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_entrada';
ALTER TYPE public.crm_message_type ADD VALUE IF NOT EXISTS 'whatsapp_saida';
CREATE TABLE IF NOT EXISTS public.webhook_processed_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_processed_events ENABLE ROW LEVEL SECURITY;`;

const KEYS = [
  'evolution_base_url',
  'evolution_api_key',
  'evolution_instance',
  'evolution_webhook_secret',
  'owner_phones',
  'atendente_phone',
  'payment_pix_key',
  'payment_instructions',
] as const;

const LABELS: Record<string, string> = {
  evolution_base_url: 'Evolution API – URL base',
  evolution_api_key: 'Evolution API – Chave',
  evolution_instance: 'Nome da instância',
  evolution_webhook_secret: 'Segredo do webhook (opcional)',
  owner_phones: 'Números dos donos/proprietários (relatórios, dados, estoque)',
  atendente_phone: 'Número do atendente (IA) – WhatsApp que atende leads',
  payment_pix_key: 'Chave PIX (atendente)',
  payment_instructions: 'Instruções de pagamento',
};

export default function SetupWhatsAppIA() {
  const { data: settings, getSetting, upsertSettingsBatch } = useCrmSettings();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      const next: Record<string, string> = {};
      KEYS.forEach((k) => { next[k] = getSetting(k) || ''; });
      if (!next.owner_phones && getSetting('owner_phone_override')) {
        next.owner_phones = getSetting('owner_phone_override') || '';
      }
      setValues(next);
      setLoaded(true);
    }
  }, [settings, getSetting, loaded]);

  const webhookUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
      ? `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')}/functions/v1/evolution-webhook`
      : 'https://SEU_PROJETO.supabase.co/functions/v1/evolution-webhook';

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setSqlCopied(true);
      toast({ title: 'SQL copiado! Cole no Supabase > SQL Editor e execute.' });
      setTimeout(() => setSqlCopied(false), 2000);
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setUrlCopied(true);
      toast({ title: 'URL copiada!' });
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = KEYS.map((key) => ({ key, value: (values[key] ?? '').trim() }));
      const ownerPhonesRaw = (values.owner_phones ?? '').trim();
      const firstOwner = ownerPhonesRaw.split(/[\n,;]+/)[0]?.trim() || '';
      if (firstOwner) payload.push({ key: 'owner_phones' as any, value: firstOwner });
      await upsertSettingsBatch.mutateAsync(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="card-cinematic rounded-xl border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          Configuração completa WhatsApp + IA
        </CardTitle>
        <CardDescription>
          Um único lugar: migração do banco (uma vez), Evolution, pagamento e webhook. Salve tudo ao final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fluxo: mesmo agente para leads e para donos */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Como funciona</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Número do atendente (IA):</strong> é o WhatsApp que atende clientes e leads (pedidos, cardápio, encomendas).</li>
            <li><strong>Números dos donos/proprietários:</strong> quando <strong>um dono</strong> manda mensagem nesse mesmo número, o <strong>mesmo agente</strong> informa relatórios, dados de compra, faturamento, estoque etc. — sem precisar entrar na plataforma.</li>
            <li><strong>Na plataforma:</strong> use principalmente para <strong>anotar pedidos</strong> combinados no WhatsApp (menu Pedidos).</li>
          </ul>
          <p className="text-[11px] text-muted-foreground pt-1">
            Configure abaixo os <strong>números dos donos</strong> (um ou mais) e o <strong>número do atendente</strong> (IA). Donos = quem recebe relatórios/dados/estoque; atendente = o número que atende os leads.
          </p>
        </div>

        {/* 1. Migração (uma vez) */}
        <Collapsible open={migrateOpen} onOpenChange={setMigrateOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                {migrateOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Database className="h-4 w-4" />
                1. Migração do banco (execute uma vez)
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                No Supabase Dashboard: SQL Editor → New query → cole o SQL abaixo → Run.
              </p>
              <pre className="text-[10px] font-mono overflow-x-auto p-2 bg-background rounded border max-h-40 overflow-y-auto whitespace-pre">
                {SETUP_SQL}
              </pre>
              <Button size="sm" variant="secondary" onClick={copySql} className="gap-1.5">
                {sqlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {sqlCopied ? 'Copiado' : 'Copiar SQL'}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 2. Formulário único */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">2. Dados da Evolution e atendimento</Label>
          {KEYS.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{LABELS[key] || key}</Label>
              {key === 'owner_phones' ? (
                <Textarea
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder="Um por linha ou vírgula. Ex: 5511999999999, +5511888888888"
                  className="input-glow text-sm min-h-[72px] resize-y"
                  rows={3}
                />
              ) : (
                <Input
                  type={key.includes('key') || key.includes('secret') ? 'password' : 'text'}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={
                    key === 'evolution_base_url' ? 'https://sua-evolution.com' :
                    key === 'atendente_phone' ? '5511999999999 – número que atende os leads' :
                    key === 'payment_instructions' ? 'Aceitamos PIX, cartão...' : ''
                  }
                  className="input-glow text-sm"
                />
              )}
            </div>
          ))}
        </div>

        {/* URL do webhook */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">URL do webhook (configure na Evolution – evento MESSAGES_UPSERT)</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted/50" />
            <Button size="icon" variant="outline" onClick={copyUrl} title="Copiar URL">
              {urlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button onClick={saveAll} disabled={saving || upsertSettingsBatch.isPending} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500">
          {(saving || upsertSettingsBatch.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar tudo
        </Button>
      </CardContent>
    </Card>
  );
}
