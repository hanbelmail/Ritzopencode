const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^\d{4}-(\d{2})$/;
const YEAR_PATTERN = /(?:^|[^\d])((?:19|20|21)\d{2})(?!\d)/g;
const DATE_CONTEXT_PATTERN = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|date|check[ -]?in|check[ -]?out|stay|book(?:ing)?|reservation|months?|years?)\b|\d{1,2}[/-]\d{1,2}/i;
const HISTORICAL_STAY_PATTERN = /\b(?:stayed|visited|was there|last stay|previous stay)\b/i;
const DAY_MS = 86400000;

export function honoluluToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isCalendarDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateParts(value) {
  const match = String(value || "").match(DATE_PATTERN);
  if (!match) throw new Error("Stay dates must use YYYY-MM-DD format");
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isCalendarDate(`2000-${match[2]}-${match[3]}`)) throw new Error("Stay dates must be valid calendar dates");
  return { month, day, monthDay: `${match[2]}-${match[3]}` };
}

function monthNumber(value) {
  const match = String(value || "").match(MONTH_PATTERN);
  const month = Number(match?.[1]);
  if (!match || month < 1 || month > 12) throw new Error("Month must use YYYY-MM format");
  return month;
}

function formatDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthWindow(year, month) {
  if (year < 1 || year >= 9999) throw new Error("Date is outside the supported calendar range");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    checkIn: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
    checkOut: `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

function mentionsMonth(text, month, names) {
  const numericMonth = month < 10 ? `0?${month}` : String(month);
  return names.test(text) || new RegExp(`(?:^|\\D)(?:\\d{4}[-/])?${numericMonth}[-/]\\d{1,2}(?:\\D|$)`).test(text);
}

function guestYearContext(messages, today) {
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const guestMessages = [...(messages || [])]
    .reverse()
    .filter((message) => message?.direction === "inbound" && (!message.authorType || message.authorType === "guest"));

  let newerYearlessDateRequest = false;
  let pendingCheckOutYear = null;
  for (const message of guestMessages) {
    const text = String(message.content || "").trim();
    const standaloneYear = /^(?:(?:it'?s|year)\s+)?(?:19|20|21)\d{2}(?:\s+please)?[.!?]?$/i.test(text);
    if (!standaloneYear && !DATE_CONTEXT_PATTERN.test(text)) continue;

    if (/\bthis year\b/i.test(text)) return { checkInYear: currentYear, source: "relative" };
    if (/\bnext year\b/i.test(text)) return { checkInYear: currentYear + 1, source: "relative" };
    if (/\bthis month\b/i.test(text)) return { checkInYear: currentYear, month: currentMonth, source: "relative" };
    if (/\bnext month\b/i.test(text)) {
      return {
        checkInYear: currentMonth === 12 ? currentYear + 1 : currentYear,
        month: currentMonth === 12 ? 1 : currentMonth + 1,
        source: "relative",
      };
    }
    const yearsFromNow = text.match(/\bin\s+(\d{1,2})\s+years?\b|\b(\d{1,2})\s+years?\s+from\s+now\b/i);
    if (yearsFromNow) return { checkInYear: currentYear + Number(yearsFromNow[1] || yearsFromNow[2]), source: "relative" };

    const yearMatches = [...text.matchAll(YEAR_PATTERN)];
    const years = yearMatches.map((match) => Number(match[1]));
    const uniqueYears = [...new Set(years)];
    if (uniqueYears.length) {
      if (HISTORICAL_STAY_PATTERN.test(text)) {
        const currentIntent = /\b(?:want|book|looking|need|interested|considering|planning|would like)\b/i.exec(text);
        const currentYears = currentIntent
          ? yearMatches.filter((match) => Number(match.index) > Number(currentIntent.index)).map((match) => Number(match[1]))
          : [];
        if (currentYears.length) {
          return { checkInYear: currentYears[currentYears.length - 1], source: "explicit" };
        }
        continue;
      }

      const checkOutOnly = /\b(?:check[ -]?out|depart|leave)\b/i.test(text) && !/\bcheck[ -]?in\b/i.test(text);
      if (checkOutOnly && uniqueYears.length === 1) {
        if (!newerYearlessDateRequest) pendingCheckOutYear = uniqueYears[0];
        continue;
      }

      const decemberToJanuary = mentionsMonth(text, 12, /\bdec(?:ember)?\b/i) && mentionsMonth(text, 1, /\bjan(?:uary)?\b/i);
      const clearRange = /\b(?:to|through|until)\b/i.test(text) || /\s(?:-|\u2013|\u2014)\s/.test(text) || (
        /\bcheck[ -]?in\b/i.test(text) && /\bcheck[ -]?out\b/i.test(text) && /\band\b/i.test(text)
      );
      if (uniqueYears.length === 1) {
        return {
          checkInYear: uniqueYears[0],
          ...(!newerYearlessDateRequest && pendingCheckOutYear ? { checkOutYear: pendingCheckOutYear } : {}),
          ...(years.length > 1 && decemberToJanuary && clearRange && !newerYearlessDateRequest ? { checkOutYear: uniqueYears[0] } : {}),
          source: "explicit",
        };
      }
      if (uniqueYears.length === 2 && uniqueYears[1] === uniqueYears[0] + 1 && decemberToJanuary && clearRange) {
        return {
          checkInYear: uniqueYears[0],
          ...(!newerYearlessDateRequest ? { checkOutYear: uniqueYears[1] } : {}),
          source: "explicit",
        };
      }
      throw new Error("The guest supplied conflicting years");
    }
    newerYearlessDateRequest = true;
  }
  return pendingCheckOutYear ? { checkOutYear: pendingCheckOutYear, source: "explicit" } : null;
}

export function resolveStayDates({ checkIn, checkOut, messages, today }) {
  if (!isCalendarDate(today)) throw new Error("Current Hawaii date is invalid");
  const context = guestYearContext(messages, today);
  let checkInParts = dateParts(checkIn);
  let checkOutParts = dateParts(checkOut);
  if (context?.month) {
    const sameProposedMonth = checkOutParts.month === checkInParts.month;
    checkInParts = { ...checkInParts, month: context.month, monthDay: `${String(context.month).padStart(2, "0")}-${String(checkInParts.day).padStart(2, "0")}` };
    if (sameProposedMonth) {
      checkOutParts = { ...checkOutParts, month: context.month, monthDay: `${String(context.month).padStart(2, "0")}-${String(checkOutParts.day).padStart(2, "0")}` };
    }
  }
  const anchoredYear = context?.checkInYear || null;
  if (checkOutParts.monthDay === checkInParts.monthDay && !context?.checkOutYear) {
    throw new Error("Check-out must be after check-in");
  }
  const crossesYear = checkOutParts.monthDay < checkInParts.monthDay;
  if (crossesYear && !(checkInParts.month === 12 && checkOutParts.month === 1)) {
    throw new Error("Check-out must be after check-in; only a December-to-January stay rolls into the next year automatically");
  }

  function resolvedStay(checkInYear) {
    const resolvedCheckIn = formatDate(checkInYear, checkInParts.month, checkInParts.day);
    const checkOutYear = context?.checkOutYear || (crossesYear ? checkInYear + 1 : checkInYear);
    const resolvedCheckOut = formatDate(checkOutYear, checkOutParts.month, checkOutParts.day);
    if (!isCalendarDate(resolvedCheckIn) || !isCalendarDate(resolvedCheckOut) || resolvedCheckOut <= resolvedCheckIn) return null;
    return { checkIn: resolvedCheckIn, checkOut: resolvedCheckOut };
  }

  let stay;
  if (anchoredYear) {
    stay = resolvedStay(anchoredYear);
    if (!stay) throw new Error("The requested stay is not valid in the guest's specified year");
    if (stay.checkIn < today) throw new Error("The guest's explicitly requested check-in is in the past in Hawaii");
  } else {
    const currentYear = Number(today.slice(0, 4));
    for (let year = currentYear; year < currentYear + 9 && !stay; year += 1) {
      const candidate = resolvedStay(year);
      if (candidate?.checkIn >= today) stay = candidate;
    }
    if (!stay) throw new Error("Could not resolve the next valid future stay");
  }

  return {
    ...stay,
    nights: Math.round((Date.parse(`${stay.checkOut}T00:00:00Z`) - Date.parse(`${stay.checkIn}T00:00:00Z`)) / DAY_MS),
    yearSource: context?.source || "inferred",
  };
}

export function resolveAvailabilityMonth({ month, messages, today }) {
  if (!isCalendarDate(today)) throw new Error("Current Hawaii date is invalid");
  const context = guestYearContext(messages, today);
  const requestedMonth = context?.month || monthNumber(month);
  let year = context?.checkInYear || Number(today.slice(0, 4));
  let window = monthWindow(year, requestedMonth);

  if (!context && window.checkOut <= today) {
    year += 1;
    window = monthWindow(year, requestedMonth);
  } else if (window.checkOut <= today) {
    throw new Error("The guest's explicitly requested month is in the past in Hawaii");
  }

  return { month: `${String(year).padStart(4, "0")}-${String(requestedMonth).padStart(2, "0")}`, yearSource: context?.source || "inferred" };
}
