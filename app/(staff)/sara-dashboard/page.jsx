"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SETTINGS, useSaraSettingsActions, useSettings } from "@/lib/store";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { Bot, BookOpen, Check, ExternalLink, Inbox, Loader2, Pause, Play, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const tabs = [
  { id: "controls", label: "Controls", icon: Bot },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "inbox", label: "Inbox", icon: Inbox },
];

const emptyKnowledge = {
  id: null,
  slug: "",
  question: "",
  answer: "",
  category: "General",
  status: "draft",
  audience: "guest",
  source: "",
};

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function ControlsPanel() {
  const savedSettings = useSettings();
  const { saveSaraSettings } = useSaraSettingsActions();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  function set(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (settings.saraSmsEnabled && settings.saraSmsTestMode && !(settings.saraSmsAllowlist || []).length) {
      setError("Add at least one E.164 test number before enabling Sara SMS test mode.");
      return;
    }
    const invalidAllowlist = (settings.saraSmsAllowlist || []).find((phone) => !isE164Phone(normalizePhone(phone)));
    if (invalidAllowlist) {
      setError(`SMS allowlist number must use E.164 format: ${invalidAllowlist}`);
      return;
    }
    setSaving(true);
    try {
      await saveSaraSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      setError(saveError.message || "Failed to save Sara settings");
    } finally {
      setSaving(false);
    }
  }

  if (savedSettings === undefined) {
    return <div className="flex items-center gap-2 rounded-[14px] border border-[#e6dfd8] bg-white p-5 text-sm text-[#6c6a64]"><Loader2 className="h-4 w-4 animate-spin" /> Loading Sara settings...</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Website concierge</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6c6a64]">Show Sara on all public pages and allow live CRM tools.</p>
            </div>
            <Switch checked={settings.saraWebEnabled} onCheckedChange={(value) => set("saraWebEnabled", value)} aria-label="Enable Sara website chat" />
          </div>
          <Badge className={`mt-4 ${settings.saraWebEnabled ? "bg-[#5db872] text-white" : "bg-[#efe9de] text-[#6c6a64]"}`}>
            {settings.saraWebEnabled ? "Web enabled" : "Web disabled"}
          </Badge>
        </div>
        <div className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Quo conversational SMS</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6c6a64]">Keep disabled until webhook verification and allowlist testing pass.</p>
            </div>
            <Switch checked={settings.saraSmsEnabled} onCheckedChange={(value) => set("saraSmsEnabled", value)} aria-label="Enable Sara SMS" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[#faf9f5] px-3 py-2">
            <Label htmlFor="sms-test-mode" className="text-xs text-[#4d4b46]">Allowlist-only test mode</Label>
            <Switch id="sms-test-mode" checked={settings.saraSmsTestMode} onCheckedChange={(value) => set("saraSmsTestMode", value)} />
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
        <h2 className="text-lg font-medium">Agent policy settings</h2>
        <p className="mt-1 text-sm text-[#6c6a64]">Safety and CRM permissions remain code-controlled. These fields configure approved business content.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent name</Label>
            <Input id="agent-name" value={settings.saraAgentName} onChange={(event) => set("saraAgentName", event.target.value)} className="border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model">OpenAI model override</Label>
            <Input id="agent-model" value={settings.saraModel || ""} onChange={(event) => set("saraModel", event.target.value)} placeholder="Uses OPENAI_MODEL or gpt-4.1-mini" className="border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-days">Quote validity days</Label>
            <Input id="quote-days" type="number" min="1" max="30" value={settings.saraQuoteValidityDays} onChange={(event) => set("saraQuoteValidityDays", Number(event.target.value))} className="border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terms-version">Terms version</Label>
            <Input id="terms-version" value={settings.saraTermsVersion} onChange={(event) => set("saraTermsVersion", event.target.value)} className="border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="terms-content">Approved Terms and Conditions</Label>
          <Textarea id="terms-content" value={settings.saraTermsContent || ""} onChange={(event) => set("saraTermsContent", event.target.value)} placeholder="Sara hands off instead of sending payment instructions while this is empty." className="min-h-52 border-[#e6dfd8] bg-[#faf9f5]" />
          {!settings.saraTermsContent?.trim() && <p className="text-xs font-medium text-amber-700">No Terms are published. Sara can qualify guests but will hand off before payment.</p>}
        </div>
      </section>

      <section className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
        <h2 className="text-lg font-medium">Workflow messages</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial-message">Initial disclosure and information message</Label>
            <Textarea id="initial-message" value={settings.saraInitialMessage} onChange={(event) => set("saraInitialMessage", event.target.value)} className="min-h-40 border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handoff-message">Human handoff message</Label>
            <Textarea id="handoff-message" value={settings.saraHandoffMessage} onChange={(event) => set("saraHandoffMessage", event.target.value)} className="min-h-24 border-[#e6dfd8] bg-[#faf9f5]" />
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
        <Label htmlFor="sms-allowlist">Quo SMS test allowlist</Label>
        <Textarea
          id="sms-allowlist"
          value={(settings.saraSmsAllowlist || []).join("\n")}
          onChange={(event) => set("saraSmsAllowlist", event.target.value.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))}
          placeholder={"+18085550123\n+18085550456"}
          className="mt-2 min-h-28 border-[#e6dfd8] bg-[#faf9f5] font-mono"
        />
        <p className="mt-2 text-xs text-[#6c6a64]">In test mode, inbound messages from any other number are stored but receive no paid AI reply.</p>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" target="_blank" className="inline-flex items-center gap-2 text-sm font-medium text-[#a9583e] hover:underline">
          Open public website test <ExternalLink className="h-4 w-4" />
        </Link>
        <Button type="submit" disabled={saving} className="rounded-lg bg-[#cc785c] text-white hover:bg-[#a9583e]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save Sara settings"}
        </Button>
      </div>
    </form>
  );
}

function KnowledgePanel() {
  const entries = useQuery(api.knowledge.listForStaff, {});
  const saveEntry = useMutation(api.knowledge.save);
  const seedDrafts = useMutation(api.knowledge.seedDrafts);
  const [form, setForm] = useState(emptyKnowledge);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const filtered = (entries || []).filter((entry) => `${entry.question} ${entry.answer} ${entry.category}`.toLowerCase().includes(search.toLowerCase()));
  const approved = (entries || []).filter((entry) => entry.status === "approved").length;

  function edit(entry) {
    setForm({
      id: entry._id,
      slug: entry.slug,
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      status: entry.status,
      audience: entry.audience,
      source: entry.source || "",
    });
    setNotice("");
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveEntry({
        id: form.id || undefined,
        slug: form.slug,
        question: form.question,
        answer: form.answer,
        category: form.category,
        status: form.status,
        audience: form.audience,
        source: form.source || undefined,
      });
      setForm(emptyKnowledge);
      setNotice("Knowledge entry saved.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save Knowledge");
    } finally {
      setSaving(false);
    }
  }

  async function seed() {
    setError("");
    try {
      const result = await seedDrafts({});
      setNotice(`${result.inserted} draft entries added. ${result.total} starter entries are available for review.`);
    } catch (seedError) {
      setError(seedError.message || "Failed to seed Knowledge");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="rounded-[14px] border border-[#e6dfd8] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Knowledge library</h2>
            <p className="mt-1 text-sm text-[#6c6a64]">Sara retrieves approved guest entries only. Drafts never reach the model.</p>
          </div>
          <Button type="button" variant="outline" onClick={seed} className="border-[#d9cfc2] bg-[#faf9f5]">
            <BookOpen className="h-4 w-4" /> Add 42 starter drafts
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Knowledge" className="border-[#e6dfd8] bg-[#faf9f5]" />
          <Badge className="shrink-0 bg-[#efe9de] text-[#4d4b46]">{approved} approved</Badge>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">{notice}</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
          {entries === undefined && <div className="flex items-center gap-2 text-sm text-[#6c6a64]"><Loader2 className="h-4 w-4 animate-spin" /> Loading Knowledge</div>}
          {entries !== undefined && filtered.length === 0 && <p className="rounded-lg bg-[#faf9f5] p-4 text-sm text-[#6c6a64]">No entries match. Seed drafts or create one.</p>}
          {filtered.map((entry) => (
            <button key={entry._id} type="button" onClick={() => edit(entry)} className="w-full rounded-xl border border-[#e6dfd8] p-4 text-left transition-colors hover:border-[#cc785c] hover:bg-[#fff8f4]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">{entry.category}</p>
                  <p className="mt-1 text-sm font-medium text-[#252523]">{entry.question}</p>
                </div>
                <Badge className={entry.status === "approved" ? "bg-green-100 text-green-800" : entry.status === "archived" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}>{entry.status}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6c6a64]">{entry.answer}</p>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={save} className="h-fit rounded-[14px] border border-[#e6dfd8] bg-white p-5 xl:sticky xl:top-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{form.id ? "Edit entry" : "New entry"}</h2>
          {form.id && <Button type="button" variant="ghost" size="sm" onClick={() => setForm(emptyKnowledge)}><Plus className="h-4 w-4" /> New</Button>}
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-2"><Label htmlFor="knowledge-question">Question</Label><Input id="knowledge-question" required value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} className="border-[#e6dfd8] bg-[#faf9f5]" /></div>
          <div className="space-y-2"><Label htmlFor="knowledge-slug">Slug</Label><Input id="knowledge-slug" required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="border-[#e6dfd8] bg-[#faf9f5] font-mono text-xs" /></div>
          <div className="space-y-2"><Label htmlFor="knowledge-answer">Approved answer</Label><Textarea id="knowledge-answer" required value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} className="min-h-48 border-[#e6dfd8] bg-[#faf9f5]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="knowledge-category">Category</Label><Input id="knowledge-category" required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="border-[#e6dfd8] bg-[#faf9f5]" /></div>
            <div className="space-y-2"><Label htmlFor="knowledge-status">Status</Label><select id="knowledge-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-[#e6dfd8] bg-[#faf9f5] px-3 text-sm"><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="knowledge-source">Source</Label><Input id="knowledge-source" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} className="border-[#e6dfd8] bg-[#faf9f5]" /></div>
        </div>
        <Button type="submit" disabled={saving} className="mt-5 w-full bg-[#252320] text-white hover:bg-[#141413]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save entry
        </Button>
      </form>
    </div>
  );
}

function InboxPanel() {
  const conversations = useQuery(api.conversations.listForStaff, {});
  const [selectedId, setSelectedId] = useState(null);
  const detail = useQuery(api.conversations.getForStaff, selectedId ? { publicId: selectedId } : "skip");
  const setControl = useMutation(api.conversations.setStaffControl);
  const addReply = useMutation(api.conversations.addStaffReply);
  const deleteConversation = useMutation(api.conversations.deleteForStaff);
  const [reply, setReply] = useState("");
  const [replyMessageId, setReplyMessageId] = useState(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setReply("");
    setReplyMessageId(null);
    setActionError("");
  }, [selectedId]);

  async function toggleAi(conversation, enabled) {
    setActionError("");
    try {
      await setControl({
        publicId: conversation.publicId,
        aiEnabled: enabled,
        status: enabled ? "open" : "human_required",
      });
    } catch (controlError) {
      setActionError(controlError.message || "Failed to update Sara control");
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim() || !detail || detail.conversation.publicId !== selectedId) return;
    setSending(true);
    setActionError("");
    try {
      const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const messageId = replyMessageId || `staff:${suffix}`;
      setReplyMessageId(messageId);
      if (detail.conversation.channel === "sms") {
        const response = await fetch("/api/sara/staff-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: detail.conversation.publicId, messageId, content: reply.trim() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to send SMS reply");
      } else {
        await addReply({ publicId: detail.conversation.publicId, messageId, content: reply.trim() });
      }
      setReply("");
      setReplyMessageId(null);
    } catch (replyError) {
      setActionError(replyError.message || "Failed to send staff reply");
    } finally {
      setSending(false);
    }
  }

  async function removeConversation() {
    if (!selectedId) return;
    setDeleting(true);
    setActionError("");
    try {
      await deleteConversation({ publicId: selectedId });
      setSelectedId(null);
    } catch (deleteError) {
      setActionError(deleteError.message || "Failed to delete conversation");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid min-h-[650px] overflow-hidden rounded-[14px] border border-[#e6dfd8] bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="border-b border-[#e6dfd8] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#e6dfd8] p-4">
          <h2 className="font-medium">Conversation inbox</h2>
          <p className="mt-1 text-xs text-[#6c6a64]">Human-required conversations pause Sara automatically.</p>
        </div>
        <div className="max-h-[590px] overflow-y-auto">
          {conversations === undefined && <p className="p-4 text-sm text-[#6c6a64]">Loading conversations...</p>}
          {conversations?.length === 0 && <p className="p-4 text-sm text-[#6c6a64]">No conversations yet.</p>}
          {(conversations || []).map(({ conversation, contact, lastMessage }) => (
            <button key={conversation._id} type="button" onClick={() => setSelectedId(conversation.publicId)} className={`w-full border-b border-[#eee9e1] p-4 text-left transition-colors ${selectedId === conversation.publicId ? "bg-[#fff4ef]" : "hover:bg-[#faf9f5]"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{contact?.displayName || conversation.externalParticipant || "Website guest"}</p>
                <Badge className={conversation.status === "human_required" ? "bg-red-100 text-red-800" : "bg-[#efe9de] text-[#6c6a64]"}>{conversation.channel}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-[#6c6a64]">{lastMessage?.content || "Conversation opened"}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-[#9a968e]">{conversation.status.replaceAll("_", " ")} · {formatTime(conversation.lastMessageAt)}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[650px] flex-col">
        {!selectedId && <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#6c6a64]">Select a conversation to review the transcript and take control.</div>}
        {selectedId && detail === undefined && <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#cc785c]" /></div>}
        {detail && (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dfd8] p-4">
              <div>
                <p className="font-medium">{detail.contact?.displayName || detail.conversation.externalParticipant || "Website guest"}</p>
                <p className="mt-1 text-xs text-[#6c6a64]">{detail.conversation.stage.replaceAll("_", " ")}{detail.ticket ? ` · Ticket ${detail.ticket.id.slice(0, 8)}...` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={Boolean(detail.smsConsent?.optedOut && !detail.conversation.aiEnabled)} onClick={() => toggleAi(detail.conversation, !detail.conversation.aiEnabled)} className="border-[#d9cfc2]">
                  {detail.conversation.aiEnabled ? <><Pause className="h-4 w-4" /> Pause Sara</> : <><Play className="h-4 w-4" /> Resume Sara</>}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Delete conversation" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the transcript and Sara run history. Linked reservation tickets, contacts, and SMS consent are kept.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={deleting} onClick={removeConversation} className="bg-red-700 text-white hover:bg-red-800">
                        {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete conversation"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf9f5] p-4">
              {detail.messages.map((message) => (
                <div key={message._id} className={`flex ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.direction === "inbound" ? "rounded-bl-md border border-[#e6dfd8] bg-white" : message.authorType === "staff" ? "rounded-br-md bg-[#cc785c] text-white" : "rounded-br-md bg-[#252320] text-white"}`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-65">{message.authorType}</p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-1 text-[10px] opacity-55">{formatTime(message.createdAt)}{message.channel === "sms" && message.direction === "outbound" ? ` · ${message.deliveryStatus}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="border-t border-[#e6dfd8] p-4">
              {actionError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{actionError}</p>}
              {detail.smsConsent?.optedOut && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">This phone opted out. SMS replies and Sara resume are blocked until the guest sends START.</p>}
              {detail.conversation.channel === "sms" && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">This reply is sent through Quo and may incur SMS charges. Keep test mode on during validation.</p>}
              <div className="flex items-end gap-2">
                <label htmlFor="staff-sara-reply" className="sr-only">Reply as the reservations team</label>
                <Textarea id="staff-sara-reply" value={reply} disabled={Boolean(detail.smsConsent?.optedOut)} onChange={(event) => { setReply(event.target.value); setReplyMessageId(null); }} placeholder="Reply as the reservations team" className="min-h-11 border-[#e6dfd8] bg-[#faf9f5]" />
                <Button type="submit" aria-label="Send staff reply" disabled={sending || !reply.trim() || Boolean(detail.smsConsent?.optedOut)} className="h-11 bg-[#cc785c] text-white hover:bg-[#a9583e]"><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function SaraDashboardPage() {
  const [activeTab, setActiveTab] = useState("controls");

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        <section className="rounded-[18px] bg-[#181715] p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]"><Bot className="h-4 w-4 text-[#cc785c]" /> AI concierge operations</p>
              <h1 className={`${serif} mt-3 text-5xl font-medium leading-none tracking-[-0.04em] md:text-6xl`}>Sara</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#b8b4ac]">One governed reservations agent for website chat and Quo SMS, with approved Knowledge, constrained CRM tools, and human handoff.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-[#d8d2c9]"><ShieldCheck className="h-4 w-4 text-[#f0a48a]" /> Assisted booking mode</div>
          </div>
        </section>

        <nav className="mt-5 flex gap-2 overflow-x-auto rounded-xl border border-[#e6dfd8] bg-white p-2" aria-label="Sara dashboard sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === id ? "bg-[#252320] text-white" : "text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#252523]"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          {activeTab === "controls" && <ControlsPanel />}
          {activeTab === "knowledge" && <KnowledgePanel />}
          {activeTab === "inbox" && <InboxPanel />}
        </div>
      </div>
    </div>
  );
}
