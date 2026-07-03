import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { CHAT_QUICK_PROMPTS } from "./chatKnowledge";
import { sendChatMessage, type ChatMessage } from "./chatService";

type ChatAssistantProps = {
  navigate: (page: string) => void;
  hidden?: boolean;
};

function uid() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Bonjour ! Je suis l'assistant SONAPIE. Je vous guide pour découvrir nos biens patrimoniaux, réserver ou utiliser le site. Comment puis-je vous aider ?",
};

export function ChatAssistant({ navigate, hidden }: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendChatMessage([...messages, userMsg], trimmed);
      setMessages(prev => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: reply.text,
          actions: reply.actions,
          mode: reply.mode,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (page: string) => {
    navigate(page);
    setOpen(false);
  };

  if (hidden) return null;

  return (
    <>
      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-[60] flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          style={{ height: "min(32rem, calc(100vh - 7rem))" }}
          role="dialog"
          aria-label="Assistant SONAPIE"
        >
          {/* En-tête */}
          <div className="flex items-center gap-3 bg-[#14261A] px-4 py-3 text-white shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Bot size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">Assistant SONAPIE</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fermer le chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-muted/30">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-primary text-white" : "bg-secondary text-white"
                  }`}
                >
                  {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-white"
                      : "rounded-tl-sm border border-border bg-white text-foreground shadow-sm"
                  }`}
                >
                  {renderText(msg.text)}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.actions.map(action => (
                        <button
                          key={action.page + action.label}
                          type="button"
                          onClick={() => handleAction(action.page)}
                          className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
                  <Bot size={13} />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions rapides */}
          {messages.length <= 1 && !loading && (
            <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border bg-white px-3 py-2">
              {CHAT_QUICK_PROMPTS.map(({ label, message }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => submit(message)}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Saisie */}
          <form
            className="flex shrink-0 items-end gap-2 border-t border-border bg-white p-3"
            onSubmit={e => {
              e.preventDefault();
              submit(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Votre question…"
              rows={1}
              className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-orange-700 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`fixed bottom-5 right-4 sm:right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 ${
          open ? "bg-[#14261A] text-white" : "bg-primary text-white hover:bg-orange-700"
        }`}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant SONAPIE"}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
