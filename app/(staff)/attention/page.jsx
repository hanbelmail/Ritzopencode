"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function time(value) {
  return value ? new Date(value).toLocaleString("en-US", { timeZone: "Pacific/Honolulu" }) : "—";
}

function AttemptHistory({ id }) {
  const rows = useQuery(api.staffNotifications.attempts, { id });
  return <div className="mt-2 space-y-1 text-xs text-[#6c6a64]">
    {rows === undefined ? "Loading attempts..." : rows.length === 0 ? "No provider call was made." : rows.map((row) => <p key={row._id}>Attempt {row.attempt}: {row.status} · {time(row.createdAt)}{row.error ? ` · ${row.error}` : ""}</p>)}
  </div>;
}

export default function AttentionPage() {
  const attention = useQuery(api.staffNotifications.needsAttention);
  const notifications = useQuery(api.staffNotifications.list);
  const retry = useMutation(api.staffNotifications.retry);
  const resolve = useMutation(api.staffNotifications.resolveDeliveryIssue);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  async function act(id, operation) {
    setBusy(id);
    setError("");
    try { await operation({ id }); }
    catch (err) { setError(err.message || "Action failed"); }
    finally { setBusy(null); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header>
      <h1 className="text-2xl font-semibold text-[#252523]">Needs attention</h1>
      <p className="mt-1 text-sm text-[#6c6a64]">Quote problems, human handoffs, and staff alert delivery. Times are Hawaii time.</p>
      <Link href="/email-dashboard" className="text-sm text-[#a9583e] underline">Manage alert settings and recipients</Link>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Action required</h2>
      {attention === undefined && <p className="text-sm text-[#6c6a64]">Loading attention queue...</p>}
      {attention?.items.length === 0 && <p className="rounded-xl border border-[#e6dfd8] bg-white p-5 text-sm">No outstanding items found.</p>}
      {attention?.limited && <p className="text-sm text-amber-800">Showing up to 200 recent records per category. Use the reservation and Sona dashboards to review older records.</p>}
      {attention?.items.map((item) => <article key={item.key} className="rounded-xl border border-[#e6dfd8] bg-white p-4">
        <h3 className="font-medium">{item.title}</h3>
        <p className="mt-1 break-words text-sm text-[#6c6a64]">{item.reason}</p>
        <p className="mt-1 text-xs text-[#8e8b82]">{time(item.createdAt)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {item.ticketId && <Link className="text-[#a9583e] underline" href={`/new?id=${encodeURIComponent(item.ticketId)}`}>Open reservation</Link>}
          {item.conversationId && <Link className="text-[#a9583e] underline" href={`/sara-dashboard?conversation=${encodeURIComponent(item.conversationId)}`}>Open conversation</Link>}
          {item.canRetry && <Button size="sm" variant="outline" disabled={busy === item.notificationId} onClick={() => act(item.notificationId, retry)}>Retry staff email</Button>}
          {item.resolvable && <Button size="sm" variant="outline" disabled={busy === item.notificationId} onClick={() => act(item.notificationId, resolve)}>Mark reviewed</Button>}
        </div>
      </article>)}
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Recent staff alerts</h2>
      <p className="text-sm text-[#6c6a64]">Latest 100 new-inquiry and attention emails. Accepted means Resend accepted the email, not confirmed inbox delivery. Check the provider ID in Resend for delivery details.</p>
      {notifications === undefined && <p className="text-sm">Loading alerts...</p>}
      {notifications?.length === 0 && <p className="rounded-xl border border-[#e6dfd8] bg-white p-5 text-sm">New alerts will appear here. Historical inquiries are not automatically resent.</p>}
      {notifications?.map((row) => <article key={row._id} className="rounded-xl border border-[#e6dfd8] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">{row.title}</h3>
          <Badge variant="outline">{row.status}{row.status === "pending" && row.attempts ? " · retry scheduled" : ""}</Badge>
        </div>
        <p className="mt-1 text-xs text-[#6c6a64]">{time(row.createdAt)} · {row.attempts} attempt(s) · {row.recipientCount} recipient(s)</p>
        {row.lastError && <p className="mt-2 break-words text-sm text-amber-800">{row.lastError}</p>}
        {row.providerMessageId && <p className="mt-2 break-all text-xs text-[#6c6a64]">Provider ID: {row.providerMessageId}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {row.ticketId && <Link href={`/new?id=${encodeURIComponent(row.ticketId)}`} className="text-[#a9583e] underline">Open reservation</Link>}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === row._id ? null : row._id)}>{expanded === row._id ? "Hide" : "View"} attempts</Button>
          {row.canRetry && <Button variant="outline" size="sm" disabled={busy === row._id} onClick={() => act(row._id, retry)}>Retry staff email</Button>}
        </div>
        {expanded === row._id && <AttemptHistory id={row._id} />}
      </article>)}
    </section>
  </div>;
}
