import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import { useCrmSettings } from '@/hooks/useCrmSettings';

const AGENT_API_KEY = 'agent_api_key';
const AGENT_API_BASE = 'agent_api_base';
const AGENT_MODEL = 'agent_model';

interface AgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgentSettingsDialog({ open, onOpenChange }: AgentSettingsDialogProps) {
  const { data: settings, getSetting, upsertSetting } = useCrmSettings();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && settings) {
      setApiKey(getSetting(AGENT_API_KEY) || '');
      setBaseUrl(getSetting(AGENT_API_BASE) || 'https://api.openai.com/v1');
      setModel(getSetting(AGENT_MODEL) || 'gpt-4o');
    }
  }, [open, settings, getSetting]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting.mutateAsync({ key: AGENT_API_KEY, value: apiKey.trim() }),
        upsertSetting.mutateAsync({ key: AGENT_API_BASE, value: (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/$/, '') }),
        upsertSetting.mutateAsync({ key: AGENT_MODEL, value: (model || 'gpt-4o').trim() || 'gpt-4o' }),
      ]);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurar IA do assistente
          </DialogTitle>
          <DialogDescription>
            Use a API do ChatGPT (OpenAI) ou outro provedor compatível para respostas mais naturais e humanizadas. Se deixar em branco, o sistema usa o modelo padrão do painel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">API Key</Label>
            <Input
              type="password"
              placeholder="sk-... (OpenAI) ou chave do seu provedor"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="input-glow text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">URL base (opcional)</Label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="input-glow text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Modelo (opcional)</Label>
            <Input
              placeholder="gpt-4o, gpt-4o-mini, etc."
              value={model}
              onChange={e => setModel(e.target.value)}
              className="input-glow text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
