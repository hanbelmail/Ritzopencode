"use client";

const styles = {
  QUOTE: "bg-[#efe9de] text-[#6c6a64] border-[#e6dfd8]",
  PENDING: "bg-[#fff4df] text-[#9a681f] border-[#ecd3a6]",
  CONFIRMED: "bg-[#e7f4f1] text-[#2f7f71] border-[#baded7]",
  "PAYMENT RECEIVED": "bg-[#e9f5eb] text-[#3f8b51] border-[#c7e4ce]",
  COMPLETED: "bg-[#cc785c] text-white border-[#cc785c]",
  CANCELLED: "bg-[#f7e7e3] text-[#a33d32] border-[#e9c4bb]",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${styles[status] || styles.QUOTE}`}>
      {status}
    </span>
  );
}
