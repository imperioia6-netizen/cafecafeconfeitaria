import { useState, useRef, useEffect } from 'react';
import { useLiveChats, type ChatConversation } from '@/hooks/useLiveChats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Send, User, UserCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM', { locale: ptBR });
}

const LiveChatsPanel = () => {
  const { conversations, isLoading, useCustomerMessages, toggleIaLock, sendMessage } = useLiveChats();
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = selected ? useCustomerMessages(selected.customer_id) : null;
  const messages = messagesQuery?.data || [];
  const isLocked = selected && !!selected.ia_lock_at;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Update selected conversation when conversations refresh
  useEffect(() => {
    if (selected) {
      const updated = conversations.find(c => c.customer_id === selected.customer_id);
      if (updated) setSelected(updated);
    }
  }, [conversations]);

  const handleSend = () => {
    if (!input.trim() || !selected) return;
    sendMessage.mutate({
      remoteJid: selected.remote_jid,
      message: input.trim(),
      customerId: selected.customer_id,
    });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Conversation List ───
  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Conversas ao vivo</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} conversa{conversations.length !== 1 ? 's' : ''}</p>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bot className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {conversations.map(conv => (
              <button
                key={conv.customer_id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${
                  selected?.customer_id === conv.customer_id ? 'bg-muted/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{conv.customer_name}</span>
                      {conv.ia_lock_at && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 shrink-0">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message_type === 'whatsapp_saida' && <span className="text-muted-foreground/60">Você: </span>}
                      {conv.last_message?.slice(0, 60) || '...'}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─── Chat View ───
  const ChatView = () => {
    if (!selected) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Bot className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSelected(null)} className="md:hidden shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selected.customer_name}</p>
              <p className="text-[11px] text-muted-foreground">{selected.customer_phone || selected.remote_jid}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-green-600/40 text-green-700 hover:bg-green-50"
                onClick={() => toggleIaLock.mutate({ customerId: selected.customer_id, lock: false })}
                disabled={toggleIaLock.isPending}
              >
                <Bot className="h-3.5 w-3.5" />
                Voltar para IA
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-50"
                onClick={() => toggleIaLock.mutate({ customerId: selected.customer_id, lock: true })}
                disabled={toggleIaLock.isPending}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Retomar
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messagesQuery?.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Sem mensagens</p>
          ) : (
            messages.map(msg => {
              const isOutgoing = msg.message_type === 'whatsapp_saida';
              return (
                <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      isOutgoing
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message_content}</p>
                    <p className={`text-[10px] mt-1 ${isOutgoing ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border/50">
          {!isLocked ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
              <Bot className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <p className="text-xs text-muted-foreground">IA está respondendo. Clique "Retomar" para intervir.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="flex-1 h-10"
                autoFocus
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card-cinematic rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '450px' }}>
      <div className="flex h-full">
        {/* Left panel - conversation list */}
        <div className={`w-full md:w-80 md:border-r border-border/30 shrink-0 ${selected ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <ConversationList />
        </div>
        {/* Right panel - chat */}
        <div className={`flex-1 min-w-0 ${!selected ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <ChatView />
        </div>
      </div>
    </div>
  );
};

export default LiveChatsPanel;
