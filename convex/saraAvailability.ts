const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

type StayRange = {
  checkIn: string;
  checkOut: string;
};

export type AvailableStayRange = StayRange & {
  nights: number;
};

export function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / DAY_MS);
}

export function monthAvailabilityWindow(month: string, today: string) {
  const match = month.match(MONTH_PATTERN);
  if (!match) throw new Error("Month must use YYYY-MM format");
  if (!isCalendarDate(today)) throw new Error("Current Hawaii date is invalid");

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year >= 9999) throw new Error("Month is outside the supported calendar range");
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const checkIn = `${month}-01`;
  const checkOut = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  if (checkOut <= today) throw new Error("Requested month is entirely in the past in Hawaii");

  return {
    requestedWindow: { checkIn, checkOut },
    evaluatedWindow: { checkIn: checkIn < today ? today : checkIn, checkOut },
  };
}

export function availableRangesForWindow(window: StayRange, stays: StayRange[]): AvailableStayRange[] {
  if (stays.some(({ checkIn, checkOut }) => !isCalendarDate(checkIn) || !isCalendarDate(checkOut) || checkIn >= checkOut)) {
    throw new Error("Finalized reservation data contains invalid stay dates");
  }

  const occupied = stays
    .filter(({ checkIn, checkOut }) =>
      checkIn < window.checkOut &&
      checkOut > window.checkIn
    )
    .map(({ checkIn, checkOut }) => ({
      checkIn: checkIn < window.checkIn ? window.checkIn : checkIn,
      checkOut: checkOut > window.checkOut ? window.checkOut : checkOut,
    }))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut));

  const merged: StayRange[] = [];
  for (const stay of occupied) {
    const previous = merged[merged.length - 1];
    if (previous && stay.checkIn <= previous.checkOut) {
      if (stay.checkOut > previous.checkOut) previous.checkOut = stay.checkOut;
    } else {
      merged.push({ ...stay });
    }
  }

  const available: AvailableStayRange[] = [];
  let cursor = window.checkIn;
  for (const stay of merged) {
    if (cursor < stay.checkIn) {
      available.push({ checkIn: cursor, checkOut: stay.checkIn, nights: nightsBetween(cursor, stay.checkIn) });
    }
    if (stay.checkOut > cursor) cursor = stay.checkOut;
  }
  if (cursor < window.checkOut) {
    available.push({ checkIn: cursor, checkOut: window.checkOut, nights: nightsBetween(cursor, window.checkOut) });
  }
  return available;
}
