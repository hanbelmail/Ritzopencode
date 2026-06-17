"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, STATUSES, useSettings, useSettingsActions, useTickets } from "@/lib/store";

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
    <div className="min-h-screen bg-[#f7f7f7] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">API test console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ticket API Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Test the demo REST endpoints backed by Convex tickets. Price and date updates recalculate ticket totals.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <form onSubmit={saveWebhookSettings} className="space-y-4 rounded-xl border bg-secondary/40 p-4">
              <div>
                <h2 className="text-lg font-semibold">Quote webhook</h2>
                <p className="text-sm text-muted-foreground">Send every home page quote ticket to n8n after it is created.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url">n8n webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://n9n.aquaskals.com/webhook-test/get-a-quota"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <Label htmlFor="webhook-enabled" className="text-sm font-medium">Webhook active</Label>
                <Switch id="webhook-enabled" checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>
              <Button type="submit" className="w-full">{webhookSaved ? "Webhook saved" : "Save webhook settings"}</Button>
            </form>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Request example</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {examples.map((example) => (
                  <button
                    key={example.method}
                    type="button"
                    onClick={() => setMethod(example.method)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      method === example.method ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"
                    }`}
                  >
                    <span className="block font-medium">{example.label}</span>
                    <span className="text-xs opacity-80">{example.method}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="ticket-id">Ticket ID</label>
              <Input
                id="ticket-id"
                value={ticketId}
                onChange={(event) => setTicketId(event.target.value)}
                placeholder={firstTicketId || "Paste a ticket ID"}
              />
              {firstTicketId && !ticketId && (
                <p className="text-xs text-muted-foreground">Using first reservation ID: {firstTicketId}</p>
              )}
            </div>

            {selected.needsStatus && (
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="ticket-status">Status</label>
                <select
                  id="ticket-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            {method.startsWith("PATCH") && (
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="request-body">JSON body</label>
                <Textarea
                  id="request-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-40 font-mono text-xs"
                />
              </div>
            )}

            <div className="rounded-xl bg-secondary p-3 font-mono text-xs">
              <div>{method.split(" ")[0]} {endpoint}</div>
            </div>

            <Button onClick={runRequest} disabled={loading} className="w-full">
              {loading ? "Running..." : "Run request"}
            </Button>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Response</h2>
              <p className="text-sm text-muted-foreground">Output includes HTTP status, ok flag, and JSON response body.</p>
            </div>
            <pre className="min-h-96 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
