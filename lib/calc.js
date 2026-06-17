export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(ms / 86400000));
}

export function discountForNights(nights, tiers) {
  if (!nights) return 0;
  const sorted = [...tiers].sort((a, b) => b.nights - a.nights);
  const tier = sorted.find((t) => nights >= t.nights);
  return tier ? Number(tier.discount) : 0;
}

export function computeTicket({ checkIn, checkOut, retailPrice, adjustment }, settings) {
  const nights = calcNights(checkIn, checkOut);
  const discountPct = discountForNights(nights, settings.discountTiers);
  const hasPrice = retailPrice !== null && retailPrice !== undefined && retailPrice !== "" && !isNaN(retailPrice);
  const rateOffered = hasPrice
    ? Number(retailPrice) * (1 - discountPct / 100) + Number(adjustment || 0)
    : null;
  const costPerNight = rateOffered != null && nights ? rateOffered / nights : null;
  return { nights, discountPct, rateOffered, costPerNight };
}

export const fmtMoney = (n) =>
  n === null || n === undefined || n === "" || isNaN(n)
    ? "—"
    : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
};

export const shortId = (id) => (id ? id.slice(0, 8).toUpperCase() : "—");
