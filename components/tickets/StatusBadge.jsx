"use client";

const styles = {
  QUOTE: "bg-secondary text-muted-foreground border-border",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  "PAYMENT RECEIVED": "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-primary text-primary-foreground border-primary",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${styles[status] || styles.QUOTE}`}>
      {status}
    </span>
  );
}
