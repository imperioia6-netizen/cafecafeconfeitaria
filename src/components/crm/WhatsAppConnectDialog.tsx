import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Wifi, WifiOff, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WhatsAppConnectDialog = ({ open, onOpenChange }: WhatsAppConnectDialogProps) => {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    if (!webhookUrl || !apiToken) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setConnected(true);
    toast({ title: 'WhatsApp conectado com sucesso!' });
  };

  const handleDisconnect = () => {
    setConnected(false);
    setWebhookUrl('');
    setApiToken('');
    toast({ title: 'WhatsApp desconectado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou configure a API do WhatsApp Business
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* QR Code Area */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center gap-2">
              <QrCode className="h-16 w-16 text-emerald-400/60" />
              <span className="text-xs text-muted-foreground text-center px-4">
                QR Code aparecerá aqui ao conectar a API
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
              {connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>

          {/* API Fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Webhook URL</label>
              <Input
                placeholder="https://api.whatsapp.com/..."
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                className="input-glow text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Token</label>
              <Input
                type="password"
                placeholder="Token de acesso da API"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                className="input-glow text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {connected ? (
            <Button variant="destructive" onClick={handleDisconnect} className="w-full sm:w-auto">
              Desconectar
            </Button>
          ) : (
            <Button onClick={handleConnect} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white">
              Conectar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppConnectDialog;
