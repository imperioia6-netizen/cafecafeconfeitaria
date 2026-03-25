import { useState, useRef, useEffect } from 'react';
import { useLiveChats, type ChatConversation } from '@/hooks/useLiveChats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Send, UserCheck, Search } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM', { locale: ptBR });
}

/** Returns true if string looks like a raw phone number */
function isPhoneNumber(str: string) {
  return /^\+?\d{8,}$/.test(str.replace(/[\s\-().]/g, ''));
}

/** Format phone for display */
function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return phone;
}

/** Get display name — use name if it's a real name, otherwise format as phone */
function getDisplayName(conv: ChatConversation) {
  if (conv.customer_name && !isPhoneNumber(conv.customer_name)) {
    return conv.customer_name;
  }
  return formatPhone(conv.customer_phone || conv.remote_jid || conv.customer_name);
}

/** Get initials for avatar */
function getInitials(name: string) {
  if (isPhoneNumber(name.replace(/[\s\-()+ ]/g, ''))) return '#';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Conversation List Item ───
const ConversationItem = ({
  conv,
  isSelected,
  onSelect,
}: {
  conv: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const displayName = getDisplayName(conv);
  const initials = getInitials(displayName);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 transition-all duration-150 ${
        isSelected
          ? 'bg-accent/10 border-l-2 border-accent'
          : 'hover:bg-muted/50 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatTime(conv.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {conv.ia_lock_at && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-warning/50 text-warning shrink-0">
                Manual
              </Badge>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message_type === 'whatsapp_saida' && (
                <span className="text-muted-foreground/50">Você: </span>
              )}
              {conv.last_message?.slice(0, 50) || '...'}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
};

// ─── Chat Messages ───
const ChatMessages = ({
  messages,
  isLoading,
  scrollRef,
}: {
  messages: { id: string; message_type: string; message_content: string | null; created_at: string }[];
  isLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-12">Sem mensagens</p>;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
      {messages.map((msg, i) => {
        const isOutgoing = msg.message_type === 'whatsapp_saida';
        const prevMsg = messages[i - 1];
        const showTime = !prevMsg || 
          new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000;

        return (
          <div key={msg.id}>
            {showTime && (
              <p className="text-center text-[10px] text-muted-foreground/50 py-2">
                {isToday(new Date(msg.created_at))
                  ? format(new Date(msg.created_at), 'HH:mm')
                  : format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  isOutgoing
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card text-foreground border border-border/50 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message_content}</p>
                <p className={`text-[10px] mt-1 text-right ${isOutgoing ? 'text-primary-foreground/50' : 'text-muted-foreground/40'}`}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Panel ───
const LiveChatsPanel = () => {
  const { conversations, isLoading, hasInstance, useCustomerMessages, toggleIaLock, sendMessage } = useLiveChats();
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useCustomerMessages(selected?.customer_id ?? null);
  const messages = messagesQuery?.data || [];
  const isLocked = selected && !!selected.ia_lock_at;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (selected) {
      const updated = conversations.find(c => c.customer_id === selected.customer_id);
      if (updated) setSelected(updated);
    }
  }, [conversations]);

  const filteredConversations = conversations.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.customer_phone?.toLowerCase().includes(q) ||
      c.remote_jid?.toLowerCase().includes(q)
    );
  });

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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '480px' }}>
      <div className="flex h-full">
        {/* ─── Left: Conversation List ─── */}
        <div className={`w-full md:w-80 lg:w-96 md:border-r border-border/30 shrink-0 flex flex-col ${selected ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="pl-9 h-9 text-sm bg-muted/30 border-transparent focus:border-border"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 px-1">
              {filteredConversations.length} conversa{filteredConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Bot className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {search ? 'Nenhum resultado' : !hasInstance ? 'Nenhuma instância conectada. Configure o Evolution na aba Config.' : 'Nenhuma conversa nos últimos 7 dias'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filteredConversations.map(conv => (
                  <ConversationItem
                    key={conv.customer_id}
                    conv={conv}
                    isSelected={selected?.customer_id === conv.customer_id}
                    onSelect={() => setSelected(conv)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ─── Right: Chat View ─── */}
        <div className={`flex-1 min-w-0 flex flex-col ${!selected ? 'hidden md:flex' : 'flex'}`}>
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/60">Selecione uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between gap-3 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelected(null)} className="md:hidden shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(getDisplayName(selected))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{getDisplayName(selected)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selected.customer_phone ? formatPhone(selected.customer_phone) : formatPhone(selected.remote_jid)}
                    </p>
                  </div>
                </div>
                <div>
                  {isLocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-success/40 text-success hover:bg-success/5"
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
                      className="gap-1.5 text-xs border-warning/40 text-warning hover:bg-warning/5"
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
              <ChatMessages
                messages={messages}
                isLoading={messagesQuery?.isLoading || false}
                scrollRef={scrollRef}
              />

              {/* Input */}
              <div className="px-4 py-3 border-t border-border/30 bg-card">
                {!isLocked ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30">
                    <Bot className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <p className="text-xs text-muted-foreground">IA respondendo · Clique "Retomar" para intervir</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 h-10 bg-muted/20"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveChatsPanel;
