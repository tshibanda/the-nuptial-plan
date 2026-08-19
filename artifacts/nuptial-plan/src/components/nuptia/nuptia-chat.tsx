/**
 * NuptiaChat — Floating AI assistant widget
 *
 * Jardin Parisien brand · plum gradient panel · streaming SSE responses
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, RotateCcw, ChevronDown } from 'lucide-react';
import { useListWeddings, useGetWeddingSummary } from '@workspace/api-client-react';
import { useActiveWedding } from '@/lib/wedding-context';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';

/* ── Types ── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

type TokenGetter = () => Promise<string | null>;

interface NuptiaChatProps {
  getToken: TokenGetter;
}

/* ── API helpers (accept token getter to avoid stale closures) ── */
async function apiCreateConversation(getToken: TokenGetter): Promise<number> {
  const token = await getToken();
  const res = await fetch('/api/openai/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ title: 'Nuptia' }),
  });
  if (!res.ok) throw new Error('Impossible de créer la conversation');
  const data = await res.json() as { id: number };
  return data.id;
}

async function apiLoadHistory(convId: number, getToken: TokenGetter): Promise<ChatMessage[]> {
  const token = await getToken();
  const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json() as Array<{ id: number; role: string; content: string }>;
  return data.map((m) => ({ id: String(m.id), role: m.role as 'user' | 'assistant', content: m.content }));
}

/* ── Constants ── */
const CONV_KEY = 'nuptia:conversation_id';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour\u202f! Je suis **Nuptia**, votre assistante de mariage. Posez-moi vos questions sur l\u2019organisation, le budget, les prestataires, les tendances ou tout ce qui touche \u00e0 votre grand jour\u202f\u2728',
};

/* ── Markdown-lite renderer (bold only) ── */
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ── Avatar ── */
function NuptiaAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #3C1A3C, #7A4A7A)',
        border: '1px solid rgba(200,169,110,0.30)',
      }}
    >
      <Sparkles size={size * 0.42} color="#C8A96E" />
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && <NuptiaAvatar size={26} />}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-[1.55] ${
          isUser ? 'rounded-tr-sm text-white' : 'rounded-tl-sm text-foreground'
        }`}
        style={
          isUser
            ? { background: 'linear-gradient(135deg, #5D2D5D, #3C1A3C)', border: '1px solid rgba(200,169,110,0.18)' }
            : { background: 'rgba(245,239,245,0.90)', border: '1px solid rgba(200,180,200,0.35)' }
        }
      >
        {msg.streaming && msg.content === '' ? (
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          renderMarkdown(msg.content)
        )}
        {msg.streaming && msg.content !== '' && (
          <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary/60 align-middle" />
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export function NuptiaChat({ getToken }: NuptiaChatProps) {
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { activeWeddingId } = useActiveWedding();
  const { data: weddings = [] } = useListWeddings();
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const { data: weddingSummary } = useGetWeddingSummary(activeWeddingId ?? 0);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [premiumPrompt, setPremiumPrompt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  /* Create/restore conversation on first open */
  useEffect(() => {
    if (!open || initialized) return;
    setInitialized(true);
    const saved = localStorage.getItem(CONV_KEY);
    if (saved) {
      const id = Number(saved);
      setConvId(id);
      apiLoadHistory(id, getToken).then((history) => {
        if (history.length > 0) setMessages(history);
      }).catch(() => {});
    } else {
      apiCreateConversation(getToken).then((id) => {
        setConvId(id);
        localStorage.setItem(CONV_KEY, String(id));
      }).catch(() => {});
    }
  }, [open, initialized, getToken]);

  /* Wedding context passed to the API for personalised responses */
  const buildWeddingContext = useCallback(() => {
    if (!activeWedding) return undefined;
    return {
      names: activeWedding.names,
      weddingDate: activeWedding.weddingDate,
      venue: activeWedding.venue ?? undefined,
      daysUntil: weddingSummary?.daysUntil,
      budgetTotal: weddingSummary?.budgetTotal,
      budgetSpent: weddingSummary?.budgetSpent,
      totalGuests: weddingSummary?.totalGuests,
      confirmedGuests: weddingSummary?.confirmedGuests,
    };
  }, [activeWedding, weddingSummary]);

  /* Send a message and stream the response */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    let cid = convId;
    if (!cid) {
      try {
        cid = await apiCreateConversation(getToken);
        setConvId(cid);
        localStorage.setItem(CONV_KEY, String(cid));
      } catch {
        return;
      }
    }

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed };
    const assistantId = `asst-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const token = await getToken();
      const res = await fetch(`/api/openai/conversations/${cid}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: trimmed, weddingId: activeWeddingId, weddingContext: buildWeddingContext() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('network');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
            if (payload.content) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + payload.content } : m)
              );
            }
            if (payload.done || payload.error) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)
              );
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: aborted ? m.content : 'D\u00e9sol\u00e9e, une erreur s\u2019est produite. R\u00e9essayez\u202f!', streaming: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [convId, streaming, getToken, buildWeddingContext, activeWeddingId]);

  /* New conversation */
  const resetConversation = useCallback(async () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([WELCOME]);
    setInput('');
    try {
      const id = await apiCreateConversation(getToken);
      setConvId(id);
      localStorage.setItem(CONV_KEY, String(id));
    } catch { /* ignore */ }
  }, [getToken]);

  /* Keyboard handling */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  /* Auto-resize textarea */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        onClick={() => {
          if (!premiumLoading && !isPremium) {
            setPremiumPrompt(true);
          } else {
            setOpen(true);
          }
        }}
        className={`fixed bottom-6 right-6 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full transition-all duration-300 ${
          open ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          background: 'linear-gradient(135deg, #5D2D5D, #3C1A3C)',
          boxShadow: '0 4px 20px rgba(93,45,93,0.45), 0 1px 4px rgba(93,45,93,0.30), inset 0 1px 0 rgba(255,255,255,0.14)',
          border: '1px solid rgba(200,169,110,0.35)',
        }}
        aria-label="Ouvrir Nuptia"
        data-testid="button-nuptia-open"
      >
        <Sparkles size={22} color="#C8A96E" />
        {!premiumLoading && !isPremium && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E2B93B] text-[9px] font-bold text-[#3C1A3C]">★</span>
        )}
      </button>

      {premiumPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#3C1A3C]/35 p-5" onClick={() => setPremiumPrompt(false)}>
          <div className="w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
            <PremiumPageGate featureLabel="Nuptia, votre assistante IA" />
            <button className="mx-auto mt-3 block text-xs text-white/90 underline" onClick={() => setPremiumPrompt(false)}>Fermer</button>
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-95 opacity-0'
        }`}
        style={{
          width: 'min(380px, calc(100vw - 24px))',
          height: 'min(560px, calc(100dvh - 110px))',
          background: 'rgba(253,249,253,0.97)',
          border: '1px solid rgba(200,180,200,0.45)',
          boxShadow: '0 16px 60px rgba(93,45,93,0.22), 0 4px 16px rgba(93,45,93,0.12)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div
          className="relative flex shrink-0 items-center gap-3 overflow-hidden px-4 py-3.5"
          style={{ background: 'linear-gradient(135deg, #3C1A3C 0%, #5D2D5D 60%, #7A4A7A 100%)' }}
        >
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full" style={{ background: 'rgba(200,169,110,0.14)' }} />
          <div className="pointer-events-none absolute -bottom-3 left-8 h-10 w-10 rounded-full" style={{ background: 'rgba(204,140,148,0.10)' }} />
          <div className="absolute inset-x-0 top-0 h-[1.5px]" style={{ background: 'rgba(200,169,110,0.40)' }} />

          <NuptiaAvatar size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-none text-white">Nuptia</p>
            <p className="mt-1 text-[10px] text-white/50">Assistante de planification IA</p>
          </div>
          <button
            onClick={resetConversation}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/70"
            title="Nouvelle conversation"
            aria-label="Nouvelle conversation"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/70"
            aria-label="Fermer Nuptia"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Wedding context chip */}
        {activeWedding && (
          <div className="shrink-0 border-b border-border/30 bg-[#f5eff5]/80 px-4 py-2">
            <p className="text-[10px] text-muted-foreground/70">
              <span className="font-medium text-primary/70">{activeWedding.names}</span>
              {activeWedding.weddingDate && (
                <>{' · '}{new Date(activeWedding.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
              )}
            </p>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3.5 py-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(93,45,93,0.15) transparent' }}
        >
          <div className="flex flex-col gap-3">
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border/40 bg-white/60 px-3 py-2.5">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question \u00e0 Nuptia\u2026"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-border/60 bg-white/80 px-3.5 py-2.5 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              style={{ minHeight: 40, maxHeight: 120, lineHeight: 1.5 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, #5D2D5D, #3C1A3C)',
                border: '1px solid rgba(200,169,110,0.25)',
                boxShadow: '0 2px 8px rgba(93,45,93,0.25)',
              }}
              aria-label="Envoyer"
            >
              <Send size={15} color="#C8A96E" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[9.5px] text-muted-foreground/40">
            Nuptia peut se tromper. V\u00e9rifiez les informations importantes.
          </p>
        </div>
      </div>

      {/* Backdrop — closes on outside click */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </>
  );
}
