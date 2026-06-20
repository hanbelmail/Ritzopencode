"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, STATUSES, useSettings, useSettingsActions, useTickets } from "@/lib/store";
import { Code2, Send, Webhook, Terminal } from "lucide-react";

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const inputClass = "h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

const sampleUpdate = {
  status: "CONFIRMED",
  notes: "Updated from API dashboard",
  retailPrice: 3000,
};

const examples = [
  { label: "Fetch all", method: "GET /api/tickets", needsId: false },
  { label: "Fetch by status", method: "GET /api/tickets?status=:status", needsId: false, needsStatus: true },
  { label: "Fetch one", method: "GET /api/tickets/:id", needsId: true },
  { label: "Update one", method: "PATCH /api/tickets/:id", needsId: true },
  { label: "Delete one", method: "DELETE /api/tickets/:id", needsId: true },
];

export default function ApiDashboardPage() {
  const tickets = useTickets();
  const savedSettings = useSettings();
  const { saveSettings } = useSettingsActions();
  const firstTicketId = tickets[0]?.id || "";
  const [ticketId, setTicketId] = useState("");
  const [body, setBody] = useState(JSON.stringify(sampleUpdate, null, 2));
  const [method, setMethod] = useState("GET /api/tickets");
  const [status, setStatus] = useState("CONFIRMED");
  const [response, setResponse] = useState("Run a request to see the response here.");
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_SETTINGS.webhookUrl);
  const [webhookEnabled, setWebhookEnabled] = useState(DEFAULT_SETTINGS.webhookEnabled);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!savedSettings) return;
    setWebhookUrl(savedSettings.webhookUrl || "");
    setWebhookEnabled(Boolean(savedSettings.webhookEnabled));
  }, [savedSettings]);

  const effectiveTicketId = ticketId.trim() || firstTicketId;
  const selected = examples.find((example) => example.method === method) || examples[0];
  const endpoint = selected.needsId
    ? `/api/tickets/${effectiveTicketId || ":id"}`
    : selected.needsStatus
      ? `/api/tickets?status=${encodeURIComponent(status)}`
      : "/api/tickets";

  async function runRequest() {
    if (selected.needsId && !effectiveTicketId) {
      setResponse("Add a ticket ID first, or create a reservation so a sample ID is available.");
      return;
    }

    setLoading(true);
    setResponse("Loading...");

    try {
      const httpMethod = method.split(" ")[0];
      const options = { method: httpMethod };

      if (httpMethod === "PATCH") {
        options.headers = { "Content-Type": "application/json" };
        options.body = body;
      }

      const result = await fetch(endpoint, options);
      const text = await result.text();
      const payload = text ? JSON.parse(text) : null;

      setResponse(JSON.stringify({ status: result.status, ok: result.ok, body: payload }, null, 2));
    } catch (error) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function saveWebhookSettings(event) {
    event.preventDefault();
    const nextSettings = {
      ...(savedSettings || DEFAULT_SETTINGS),
      webhookUrl: webhookUrl.trim(),
      webhookEnabled,
    };

    await saveSettings(nextSettings);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">
                <Code2 className="h-4 w-4 text-[#cc785c]" /> API test console
              </p>
              <h1 className={`${serif} text-5xl font-medium leading-[1.02] tracking-[-0.04em] md:text-6xl`}>Ticket API Dashboard</h1>
              <p className="mt-4 max-w-3xl text-sm leading-[1.65] text-[#a09d96]">
                Test the demo REST endpoints backed by Convex tickets. Price and date updates recalculate ticket totals.
              </p>
            </div>
            <div className="rounded-[12px] bg-[#252320] p-4 font-mono text-xs leading-relaxed text-[#a09d96]">
              <p><span className="text-[#e8a55a]">auth</span>: staff route</p>
              <p><span className="text-[#5db8a6]">source</span>: Convex tickets</p>
              <p><span className="text-[#faf9f5]">console</span>: REST demo</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <form onSubmit={saveWebhookSettings} className="space-y-4 rounded-[12px] bg-[#efe9de] p-5">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#cc785c]">
                  <Webhook className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-medium text-[#252523]">Quote webhook</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Send every home page quote ticket to n8n after it is created.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url" className="text-sm font-medium text-[#252523]">n8n webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://n9n.aquaskals.com/webhook-test/get-a-quota"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-2">
                <Label htmlFor="webhook-enabled" className="text-sm font-medium text-[#252523]">Webhook active</Label>
                <Switch id="webhook-enabled" checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>
              <Button type="submit" className={`${primaryButton} w-full`}>{webhookSaved ? "Webhook saved" : "Save webhook settings"}</Button>
            </form>

            <div className="grid gap-3 rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
              <label className="text-sm font-medium text-[#252523]">Request example</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {examples.map((example) => (
                  <button
                    key={example.method}
                    type="button"
                    onClick={() => setMethod(example.method)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      method === example.method
                        ? "border-[#cc785c] bg-[#cc785c] text-white"
                        : "border-[#e6dfd8] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]"
                    }`}
                  >
                    <span className="block font-medium">{example.label}</span>
                    <span className="text-xs opacity-80">{example.method}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
              <label className="text-sm font-medium text-[#252523]" htmlFor="ticket-id">Ticket ID</label>
              <Input
                id="ticket-id"
                value={ticketId}
                onChange={(event) => setTicketId(event.target.value)}
                placeholder={firstTicketId || "Paste a ticket ID"}
                className={inputClass}
              />
              {firstTicketId && !ticketId && (
                <p className="text-xs text-[#6c6a64]">Using first reservation ID: {firstTicketId}</p>
              )}
            </div>

            {selected.needsStatus && (
              <div className="grid gap-2 rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
                <label className="text-sm font-medium text-[#252523]" htmlFor="ticket-status">Status</label>
                <select
                  id="ticket-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none focus:ring-1 focus:ring-[#cc785c]"
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            {method.startsWith("PATCH") && (
              <div className="grid gap-2 rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
                <label className="text-sm font-medium text-[#252523]" htmlFor="request-body">JSON body</label>
                <Textarea
                  id="request-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-40 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] font-mono text-xs text-[#141413] shadow-none focus-visible:ring-[#cc785c]"
                />
              </div>
            )}

            <div className="rounded-[12px] bg-[#181715] p-4 font-mono text-xs text-[#faf9f5]">
              <div><span className="text-[#e8a55a]">{method.split(" ")[0]}</span> {endpoint}</div>
            </div>

            <Button onClick={runRequest} disabled={loading} className={`${primaryButton} w-full`}>
              <Send className="mr-1.5 h-4 w-4" />
              {loading ? "Running..." : "Run request"}
            </Button>
          </div>

          <div className="space-y-4 rounded-[12px] bg-[#181715] p-5 text-[#faf9f5]">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#252320] text-[#5db8a6]">
                <Terminal className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium">Response</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#a09d96]">Output includes HTTP status, ok flag, and JSON response body.</p>
            </div>
            <pre className="min-h-96 overflow-auto rounded-[12px] bg-[#1f1e1b] p-4 font-mono text-xs leading-relaxed text-[#faf9f5]">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
