import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentChat } from '@/hooks/useAgentChat';
import { Bot, Send, Sparkles, Calendar, BarChart3, MessageCircle, Settings2, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WELCOME_MESSAGE = 'Oi! Tudo bem? Sou seu assistente e tenho na ponta dos dedos os dados da confeitaria — vendas, estoque, equipe, clientes, leads e pedidos. Pode perguntar em linguagem natural, tipo: "Como foram as vendas na última semana?" ou "Tem algo em falta no estoque?". Estou aqui pra ajudar.';

const Assistant = () => {
  const { isOwner, loading: authLoading } = useAuth();
  const { messages, loading, sendMessage } = useAgentChat();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (authLoading) return null;
  if (!isOwner) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    const text = input?.value.trim() ?? '';
    if (text || pdfFile) {
      sendMessage(text || 'Analise o PDF anexado.', pdfFile);
      input && (input.value = '');
      setPdfFile(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="card-cinematic rounded-xl p-6 border-border/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Assistente pessoal</h1>
                <p className="text-sm text-muted-foreground">
                  Conversa natural. Relatórios, vendas, estoque, equipe, clientes e leads. Mesmo agente do WhatsApp (atendente e assistente).
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/crm?tab=config">
                <Settings2 className="h-4 w-4" />
                Configurar IA (CRM)
              </Link>
            </Button>
          </div>
        </div>

        {/* Chat */}
        <div className="card-cinematic rounded-xl border-border/30 flex flex-col overflow-hidden" style={{ minHeight: '380px' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[440px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex gap-3 justify-start w-full max-w-[85%]">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0 h-9 w-9 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 text-foreground text-sm leading-relaxed shadow-sm">
                    {WELCOME_MESSAGE}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6">Ex: &quot;Resumo das vendas dos últimos 30 dias&quot; · &quot;Quem são os leads em negociação?&quot;</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3 animate-in fade-in duration-200',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="rounded-full bg-primary/10 p-2 shrink-0 h-9 w-9 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground shadow-sm'
                      : 'rounded-tl-sm bg-muted/60 text-foreground shadow-sm'
                  )}
                >
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
                {msg.role === 'user' && <div className="w-9 shrink-0" />}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                <div className="rounded-full bg-primary/10 p-2 shrink-0 h-9 w-9 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-current opacity-70 animate-typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-current opacity-70 animate-typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-current opacity-70 animate-typing-dot" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 flex flex-col gap-2 bg-background/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            {pdfFile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate flex-1">{pdfFile.name}</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setPdfFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                title="Anexar PDF"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                placeholder="Pergunte ou anexe um PDF para analisar..."
                className="flex-1 rounded-xl"
                disabled={loading}
              />
              <Button type="submit" disabled={loading} size="icon" className="shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Outras funções / Em breve */}
        <div className="card-cinematic rounded-xl border-border/30 p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Em breve / Outras funções
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Agendar relatório
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Metas e campanhas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              Mais canais
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Assistant;
