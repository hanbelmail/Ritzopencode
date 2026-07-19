"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Headphones, Loader2, MessageCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/lib/store";

function newMessageId() {
  if (globalThis.crypto?.randomUUID) return `web:${globalThis.crypto.randomUUID()}`;
  return `web:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Message({ message }) {
  const guest = message.role === "guest";
  const staff = message.role === "staff";
  return (
    <div className={`flex gap-2.5 ${guest ? "justify-end" : "justify-start"}`}>
      {!guest && (
        <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${staff ? "bg-[#252320] text-white" : "bg-[#f3d8ce] text-[#a9583e]"}`}>
          {staff ? <Headphones className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
        </span>
      )}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${guest ? "rounded-br-md bg-[#252320] text-white" : "rounded-bl-md border border-[#e6dfd8] bg-white text-[#252523]"}`}>
        {staff && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8e8b82]">Reservations team</p>}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {guest && (
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#efe9de] text-[#6c6a64]">
          <UserRound className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

export default function GuestChatWidget() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("open");
  const [ticketId, setTicketId] = useState(null);
  const transcriptRef = useRef(null);
  const agentName = settings?.saraAgentName || "Sara";
  const enabled = Boolean(settings?.saraWebEnabled);

  useEffect(() => {
    if (!open || !enabled) return;
    let cancelled = false;
    async function refresh() {
      if (loading) return;
      if (!loaded) setInitializing(true);
      try {
        const response = await fetch("/api/sara/chat", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Chat is unavailable");
        if (!cancelled) {
          setMessages(data.messages || []);
          setStatus(data.status || "open");
          setTicketId(data.ticketId || null);
          setLoaded(true);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, loaded, loading, open]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [loading, messages]);

  if (!enabled) return null;

  const paused = status === "human_required" || status === "closed";

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading || initializing || paused) return;
    const messageId = newMessageId();
    const optimistic = { id: messageId, role: "guest", content, createdAt: new Date().toISOString() };
    setDraft("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, optimistic]);

    try {
      const response = await fetch("/api/sara/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, messageId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message failed");
      setMessages(data.messages || []);
      setStatus(data.status || "open");
      setTicketId(data.ticketId || null);
    } catch (sendError) {
      setError(sendError.message || "Message failed. Your text is still shown above.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Chat with ${agentName}, AI reservations assistant`}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom)+12px)] right-4 z-[60] flex h-14 items-center gap-2 rounded-full bg-[#252320] px-4 text-sm font-medium text-white shadow-[0_16px_40px_rgba(24,23,21,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#141413] focus:outline-none focus:ring-2 focus:ring-[#cc785c] focus:ring-offset-2 md:bottom-6 md:right-6"
        >
          <MessageCircle className="h-5 w-5 text-[#f0a48a]" />
          <span>Ask {agentName}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="inset-0 z-[80] flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-0 bg-[#faf9f5] p-0 shadow-2xl sm:rounded-none md:inset-auto md:bottom-6 md:right-6 md:left-auto md:top-auto md:h-[min(720px,calc(100dvh-3rem))] md:w-[420px] md:max-w-[calc(100vw-3rem)] md:rounded-[20px] md:border md:border-[#e6dfd8] [&>button]:right-4 [&>button]:top-4 [&>button]:z-10 [&>button]:text-white [&>button]:opacity-90">
        <div className="bg-[#181715] px-5 pb-4 pt-5 text-white">
          <div className="flex items-center gap-3 pr-9">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cc785c]">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-medium">{agentName}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-[#b8b4ac]">AI reservations assistant</DialogDescription>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#d8d2c9]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f0a48a]" />
            Independent private residence service, not the official hotel reservations desk. Human help is always available.
          </div>
        </div>

        <div ref={transcriptRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-[#e6dfd8] bg-white p-4 text-sm leading-relaxed text-[#4d4b46]">
              <p className="font-medium text-[#252523]">Aloha, I&apos;m {agentName}.</p>
              <p className="mt-2">I can answer approved property questions, check dates, and collect the details for a private quote. What check-in and check-out dates are you considering?</p>
            </div>
          )}
          {messages.map((message) => <Message key={message.id} message={message} />)}
          {(loading || initializing) && (
            <div className="flex items-center gap-2 pl-10 text-xs text-[#6c6a64]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#cc785c]" /> {initializing ? "Loading conversation..." : `${agentName} is checking...`}
            </div>
          )}
        </div>

        <div className="border-t border-[#e6dfd8] bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          {ticketId && (
            <a href={`/ticket/${ticketId}`} className="mb-2 block text-xs font-medium text-[#a9583e] hover:underline">
              Open quote ticket {ticketId.slice(0, 8)}...
            </a>
          )}
          {paused && (
            <p className="mb-2 rounded-lg bg-[#efe9de] px-3 py-2 text-xs leading-relaxed text-[#5b554d]">
              AI replies are paused. A reservations team member will continue this conversation.
            </p>
          )}
          {error && <p className="mb-2 text-xs text-red-700" role="alert">{error}</p>}
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <label htmlFor="sara-message" className="sr-only">Message {agentName}</label>
            <Textarea
              id="sara-message"
              value={draft}
              disabled={loading || initializing || paused}
              maxLength={2000}
              rows={1}
              placeholder={paused ? "Waiting for staff" : "Type your message..."}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="max-h-32 min-h-11 resize-none rounded-xl border-[#d9cfc2] bg-[#faf9f5] text-base shadow-none focus-visible:ring-[#cc785c]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading || initializing || paused}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#cc785c] text-white transition-colors hover:bg-[#a9583e] focus:outline-none focus:ring-2 focus:ring-[#cc785c] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#8e8b82]">Do not share card numbers, passwords, or banking credentials.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
