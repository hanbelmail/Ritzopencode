"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CalendarDays, Download, Gem, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { STATUSES, useTickets } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

const bookedStatuses = ["PAYMENT VERIFIED", "BOOKING CONFIRMED"];
const revenueStatuses = ["PAYMENT SUBMITTED", ...bookedStatuses];
const pendingStatuses = ["QUOTE REQUESTED", "PRICE SENT", "PAYMENT SUBMITTED"];
const chartColors = ["#cc785c", "#5db8a6", "#e8a55a", "#7d87d9", "#b06ab3", "#8e8b82"];
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-4 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";
const darkInput = "h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none placeholder:text-[#b8b3aa] focus-visible:ring-[#cc785c] [color-scheme:dark]";

function dateStamp(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function monthKey(value) {
  const stamp = dateStamp(value);
  return stamp ? stamp.slice(0, 7) : "Unscheduled";
}

function monthLabel(key) {
  if (key === "Unscheduled") return key;
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inDateRange(ticket, from, to) {
  if (!from && !to) return true;
  const stamp = dateStamp(ticket.checkIn || ticket.createdAt);
  if (!stamp) return false;
  return (!from || stamp >= from) && (!to || stamp <= to);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function groupTickets(tickets, getKey, valueKey = "rateOffered") {
  const map = new Map();
  tickets.forEach((ticket) => {
    const key = getKey(ticket) || "Unknown";
    const current = map.get(key) || { name: key, tickets: 0, revenue: 0, nights: 0, discount: 0, discountCount: 0 };
    const discount = numberValue(ticket.discountPct);
    current.tickets += 1;
    current.revenue += numberValue(ticket[valueKey]);
    current.nights += numberValue(ticket.nights);
    if (discount) {
      current.discount += discount;
      current.discountCount += 1;
    }
    map.set(key, current);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      averageDiscount: item.discountCount ? item.discount / item.discountCount : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.tickets - a.tickets);
}

function exportAnalyticsCsv(summary, tables) {
  const sections = [
    ["Metric", "Value"],
    ["Total Tickets", summary.totalTickets],
    ["Quoted Value", summary.quotedValue],
    ["Booked Revenue", summary.bookedRevenue],
    ["Pending Value", summary.pendingValue],
    ["Average Nightly Rate", summary.averageNightly],
    [],
    ["Room Type", "Tickets", "Revenue", "Avg Discount", "Nights"],
    ...tables.rooms.map((item) => [item.name, item.tickets, item.revenue, `${item.averageDiscount.toFixed(1)}%`, item.nights]),
    [],
    ["Referral Source", "Tickets", "Revenue"],
    ...tables.sources.map((item) => [item.name, item.tickets, item.revenue]),
    [],
    ["Payment Method", "Tickets", "Revenue"],
    ...tables.payments.map((item) => [item.name, item.tickets, item.revenue]),
    [],
    ["Client", "Reservations", "Value", "Email", "Phone"],
    ...tables.clients.map((item) => [item.name, item.reservations, item.value, item.email, item.phone]),
  ];
  const csv = sections.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function KpiCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-[14px] border border-[#e6dfd8] bg-white p-5 shadow-[0_14px_35px_rgba(24,23,21,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8e8b82]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f3ddd4] text-[#a9583e]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-[-0.04em] text-[#181715]">{value}</p>
      {sub && <p className="mt-2 text-sm text-[#6c6a64]">{sub}</p>}
    </div>
  );
}

function DataTable({ title, description, columns, rows }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[#e6dfd8] bg-white p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#181715]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[#6c6a64]">{description}</p>}
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-[#e6dfd8] text-xs uppercase tracking-[0.12em] text-[#8e8b82]">
            <tr>
              {columns.map((column) => <th key={column.key} className="pb-3 font-medium">{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe9de]">
            {rows.map((row) => (
              <tr key={row.name} className="text-[#252523]">
                {columns.map((column) => <td key={column.key} className="py-3 pr-4">{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-[#8e8b82]">No analytics data for this range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const tickets = useTickets();
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });

  const analytics = useMemo(() => {
    const scoped = tickets.filter((ticket) => inDateRange(ticket, dateFilter.from, dateFilter.to));
    const quotedValue = scoped.reduce((sum, ticket) => sum + numberValue(ticket.rateOffered), 0);
    const bookedRevenue = scoped
      .filter((ticket) => bookedStatuses.includes(ticket.status))
      .reduce((sum, ticket) => sum + numberValue(ticket.rateOffered), 0);
    const pendingValue = scoped
      .filter((ticket) => pendingStatuses.includes(ticket.status))
      .reduce((sum, ticket) => sum + numberValue(ticket.rateOffered), 0);
    const revenueTickets = scoped.filter((ticket) => revenueStatuses.includes(ticket.status));
    const revenue = revenueTickets.reduce((sum, ticket) => sum + numberValue(ticket.rateOffered), 0);
    const nights = revenueTickets.reduce((sum, ticket) => sum + numberValue(ticket.nights), 0);

    const statusCounts = STATUSES.map((status, index) => ({
      name: status,
      tickets: scoped.filter((ticket) => ticket.status === status).length,
      fill: chartColors[index % chartColors.length],
    }));

    const monthlyMap = new Map();
    scoped.forEach((ticket) => {
      const key = monthKey(ticket.checkIn || ticket.createdAt);
      const current = monthlyMap.get(key) || { key, month: monthLabel(key), quoted: 0, booked: 0, tickets: 0 };
      current.quoted += numberValue(ticket.rateOffered);
      current.booked += bookedStatuses.includes(ticket.status) ? numberValue(ticket.rateOffered) : 0;
      current.tickets += 1;
      monthlyMap.set(key, current);
    });
    const monthlyRevenue = [...monthlyMap.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-12);

    const rooms = groupTickets(scoped, (ticket) => ticket.roomType).slice(0, 6);
    const sources = groupTickets(scoped, (ticket) => ticket.referredBy || "Direct / Unknown").slice(0, 6);
    const payments = groupTickets(scoped.filter((ticket) => ticket.paymentMethod), (ticket) => ticket.paymentMethod).slice(0, 6);

    const clientMap = new Map();
    scoped.forEach((ticket) => {
      const [primaryGuest] = (ticket.guests || []).filter(Boolean);
      if (!primaryGuest) return;
      const key = ticket.email?.toLowerCase() || ticket.phone || primaryGuest.toLowerCase();
      const client = clientMap.get(key) || { name: primaryGuest, email: ticket.email || "", phone: ticket.phone || "", reservations: 0, value: 0 };
      client.reservations += 1;
      client.value += numberValue(ticket.rateOffered);
      if (ticket.email) client.email = ticket.email;
      if (ticket.phone) client.phone = ticket.phone;
      clientMap.set(key, client);
    });
    const clients = [...clientMap.values()].sort((a, b) => b.value - a.value || b.reservations - a.reservations).slice(0, 8);

    return {
      scoped,
      summary: {
        totalTickets: scoped.length,
        quotedValue,
        bookedRevenue,
        pendingValue,
        averageNightly: nights ? revenue / nights : 0,
      },
      statusCounts,
      monthlyRevenue,
      rooms,
      sources,
      payments,
      clients,
    };
  }, [tickets, dateFilter]);

  const hasDateFilter = Boolean(dateFilter.from || dateFilter.to);
  const clearDates = () => setDateFilter({ from: "", to: "" });

  const currencyFormatter = (value) => fmtMoney(value);
  const roomColumns = [
    { key: "name", label: "Room" },
    { key: "tickets", label: "Tickets" },
    { key: "revenue", label: "Revenue", render: (row) => fmtMoney(row.revenue) },
    { key: "averageDiscount", label: "Avg Discount", render: (row) => `${row.averageDiscount.toFixed(1)}%` },
  ];
  const sourceColumns = [
    { key: "name", label: "Source" },
    { key: "tickets", label: "Tickets" },
    { key: "revenue", label: "Revenue", render: (row) => fmtMoney(row.revenue) },
  ];
  const clientColumns = [
    { key: "name", label: "Client" },
    { key: "reservations", label: "Reservations" },
    { key: "value", label: "Value", render: (row) => fmtMoney(row.value) },
    { key: "email", label: "Email", render: (row) => row.email || "-" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1240px] min-w-0 space-y-6">
        <div className="overflow-hidden rounded-[18px] bg-[#181715] text-[#faf9f5]">
          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">
                <Activity className="h-4 w-4 text-[#cc785c]" /> Staff analytics
              </p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">Reservation Intelligence</h1>
              <p className="mt-4 max-w-3xl text-sm leading-[1.7] text-[#a09d96]">
                Track booked revenue, quote conversion signals, room demand, top clients, and payment mix from the existing Convex ticket data.
              </p>
            </div>
            <div className="rounded-[14px] border border-[#252320] bg-[#1f1e1b] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">Date range</p>
                {hasDateFilter && <button onClick={clearDates} className="text-xs font-medium text-[#cc785c] hover:text-[#e09a82]">Clear</button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a09d96]">
                  From
                  <Input type="date" value={dateFilter.from} onChange={(event) => setDateFilter((current) => ({ ...current, from: event.target.value }))} className={darkInput} />
                </label>
                <label className="space-y-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a09d96]">
                  To
                  <Input type="date" value={dateFilter.to} onChange={(event) => setDateFilter((current) => ({ ...current, to: event.target.value }))} className={darkInput} />
                </label>
              </div>
              <Button
                onClick={() => exportAnalyticsCsv(analytics.summary, analytics)}
                disabled={analytics.scoped.length === 0}
                className={`${primaryButton} mt-4 w-full`}
              >
                <Download className="h-4 w-4" /> Export Analytics CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Quoted Value" value={fmtMoney(analytics.summary.quotedValue)} sub={`${analytics.summary.totalTickets} tickets in range`} icon={TrendingUp} />
          <KpiCard label="Booked Revenue" value={fmtMoney(analytics.summary.bookedRevenue)} sub="verified and confirmed" icon={Gem} />
          <KpiCard label="Pending Value" value={fmtMoney(analytics.summary.pendingValue)} sub="quotes and payments in progress" icon={Activity} />
          <KpiCard label="Avg Nightly" value={fmtMoney(analytics.summary.averageNightly)} sub="submitted, verified, confirmed" icon={CalendarDays} />
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 rounded-[14px] border border-[#e6dfd8] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#181715]">Revenue Trend</h2>
              <p className="mt-1 text-sm text-[#6c6a64]">Last 12 active months by stay date or quote date.</p>
            </div>
            <ChartContainer config={{ quoted: { label: "Quoted", color: "#cc785c" }, booked: { label: "Booked", color: "#5db8a6" } }} className="h-[310px] w-full">
              <AreaChart data={analytics.monthlyRevenue} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="quotedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cc785c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#cc785c" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="bookedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5db8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#5db8a6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#efe9de" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <><span className="text-[#6c6a64]">{name}</span><span className="font-mono font-medium text-[#181715]">{currencyFormatter(value)}</span></>} />} />
                <Area type="monotone" dataKey="quoted" stroke="#cc785c" fill="url(#quotedFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="booked" stroke="#5db8a6" fill="url(#bookedFill)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="min-w-0 rounded-[14px] border border-[#e6dfd8] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#181715]">Status Funnel</h2>
              <p className="mt-1 text-sm text-[#6c6a64]">Ticket count by reservation stage.</p>
            </div>
            <ChartContainer config={{ tickets: { label: "Tickets", color: "#cc785c" } }} className="h-[310px] w-full">
              <BarChart data={analytics.statusCounts} layout="vertical" margin={{ left: 20, right: 30, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} stroke="#efe9de" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={128} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="tickets" radius={[0, 8, 8, 0]}>
                  {analytics.statusCounts.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  <LabelList dataKey="tickets" position="right" className="fill-[#181715]" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 rounded-[14px] border border-[#e6dfd8] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#181715]">Room Type Revenue</h2>
              <p className="mt-1 text-sm text-[#6c6a64]">Top room demand by quoted value.</p>
            </div>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "#cc785c" } }} className="h-[290px] w-full">
              <BarChart data={analytics.rooms} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#efe9de" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <><span className="text-[#6c6a64]">{name}</span><span className="font-mono font-medium text-[#181715]">{currencyFormatter(value)}</span></>} />} />
                <Bar dataKey="revenue" fill="#cc785c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="min-w-0 rounded-[14px] border border-[#e6dfd8] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#181715]">Payment Mix</h2>
              <p className="mt-1 text-sm text-[#6c6a64]">Revenue distribution by payment method.</p>
            </div>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "#cc785c" } }} className="h-[290px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <><span className="text-[#6c6a64]">{name}</span><span className="font-mono font-medium text-[#181715]">{currencyFormatter(value)}</span></>} />} />
                <Pie data={analytics.payments} dataKey="revenue" nameKey="name" innerRadius={62} outerRadius={102} paddingAngle={3}>
                  {analytics.payments.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {analytics.payments.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-[10px] bg-[#faf9f5] px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-[#252523]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}</span>
                  <span className="font-medium text-[#181715]">{fmtMoney(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <DataTable title="Room Performance" description="Revenue, ticket count, and average discount by room type." columns={roomColumns} rows={analytics.rooms} />
          <DataTable title="Referral Sources" description="Where reservation value is coming from." columns={sourceColumns} rows={analytics.sources} />
        </div>

        <DataTable title="Top Clients" description="Highest-value clients in the selected range." columns={clientColumns} rows={analytics.clients} />
      </div>
    </div>
  );
}
