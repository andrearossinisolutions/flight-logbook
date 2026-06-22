export function eur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export const ROME_TIME_ZONE = "Europe/Rome";

export function getRomeDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const formattedParts = formatter.formatToParts(new Date(date));

  return {
    year: Number(formattedParts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(formattedParts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(formattedParts.find((part) => part.type === "day")?.value ?? "0"),
    hour: Number(formattedParts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(formattedParts.find((part) => part.type === "minute")?.value ?? "0"),
    second: Number(formattedParts.find((part) => part.type === "second")?.value ?? "0"),
  };
}

export function romeLocalDateTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const romePartsAtGuess = getRomeDateTimeParts(utcGuess);
  const expectedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const actualAsUtc = Date.UTC(
    romePartsAtGuess.year,
    romePartsAtGuess.month - 1,
    romePartsAtGuess.day,
    romePartsAtGuess.hour,
    romePartsAtGuess.minute,
    romePartsAtGuess.second,
  );

  return new Date(utcGuess.getTime() + (expectedAsUtc - actualAsUtc));
}

export function hasTime(date: Date | string) {
  const parts = getRomeDateTimeParts(new Date(date));
  return parts.hour !== 0 || parts.minute !== 0;
}

export function parseRomeDateTime(rawStr: string | null | undefined): Date | null {
  if (!rawStr) return null;
  const cleaned = rawStr.trim();
  if (!cleaned) return null;

  // matches YYYY-MM-DD or YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    const fallback = new Date(cleaned);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");

  return romeLocalDateTimeToUtcDate(year, month, day, hour, minute, second);
}

export function formatDateInput(date: Date | string) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

export function formatDateDisplay(date: Date | string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
  }).format(new Date(date));
}

export function formatTimeDisplay(date: Date | string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTimeInput(date: Date | string | null | undefined) {
  if (!date) return "";

  const d = new Date(date);
  const parts = getRomeDateTimeParts(d);
  const yyyy = parts.year;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function minutesToHoursMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
}

export function formatHoursToHHMM(decimalHours: number | null | undefined): string {
  if (decimalHours === null || decimalHours === undefined || Number.isNaN(Number(decimalHours))) {
    return "";
  }
  const decimalHoursNum = Number(decimalHours);
  const isNegative = decimalHoursNum < 0;
  const absHours = Math.abs(decimalHoursNum);
  const hrs = Math.floor(absHours);
  const mins = Math.round((absHours - hrs) * 60);
  
  let finalHrs = hrs;
  let finalMins = mins;
  if (finalMins === 60) {
    finalHrs += 1;
    finalMins = 0;
  }
  
  const paddedHrs = String(finalHrs).padStart(2, "0");
  const paddedMins = String(finalMins).padStart(2, "0");
  
  return `${isNegative ? "-" : ""}${paddedHrs}:${paddedMins}`;
}

export function defaultWarmupMinutesForDate(date: Date | string) {
  const month = new Date(date).getMonth() + 1;
  return month >= 4 && month <= 10 ? 10 : 15;
}

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", "."));
  return Number(value);
}

export function medicalExamExpirationDate(medicalExamDate: Date) {
  return new Date(medicalExamDate.getTime() + (2 * 365 - 1) * 24 * 60 * 60 * 1000);
}

export function medicalExamRemaining(medicalExamDate: Date) {
  const totDays = Math.ceil((medicalExamDate.getTime() + (2 * 365 - 1) * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

  var years = Math.floor(totDays / 365);
  var months = Math.floor((totDays % 365) / 30);
  var days = totDays - years * 365 - months * 30;

  if (years > 0)
    return `${years > 1 ? years + " anni" : "1 anno"} e ${months > 1 ? months + " mesi" : "1 mese"}`;

  return `${months > 1 ? months + " mesi" : "1 mese"} e ${days > 1 ? days + " giorni" : "1 giorno"}`;
}

function startOfLocalDay(date: Date | string) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function differenceInLocalCalendarDays(from: Date | string, to: Date | string) {
  const fromDay = startOfLocalDay(from);
  const toDay = startOfLocalDay(to);
  return Math.round((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysFromDate(date: Date | string) {
  const days = differenceInLocalCalendarDays(date, new Date());

  if (days <= 0) return "Oggi";
  if (days === 1) return "Ieri";

  return `${days} giorni fa`;
}

export function daysToDate(date: Date | string) {
  const days = differenceInLocalCalendarDays(new Date(), date);

  if (days <= 0) return "Oggi";
  if (days === 1) return "Domani";

  return `Tra ${days} giorni`;
}
