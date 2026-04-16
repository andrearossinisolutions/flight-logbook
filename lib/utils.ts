export function eur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDateInput(date: Date | string) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDisplay(date: Date | string) {
  return new Intl.DateTimeFormat("it-IT").format(new Date(date));
}

export function formatTimeDisplay(date: Date | string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTimeInput(date: Date | string | null | undefined) {
  if (!date) return "";

  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function minutesToHoursMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
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

export function daysFromDate(date: Date) {
  const days = Math.ceil((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 giorno" : days + " giorni";
}
