// Utilità per la gestione del carburante (rifornimenti e impostazioni aereo).

export const MAX_TECHNICAL_LITERS = 1000;

/**
 * Legge un numero non negativo da un campo di form.
 * - campo assente o vuoto -> null (mai 0)
 * - virgola decimale accettata
 * - non numerico, non finito o negativo -> lancia un errore con il nome del campo
 */
export function parseNonNegative(
  raw: FormDataEntryValue | null | undefined,
  label: string,
  opts: { max?: number; decimals?: number } = {}
): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(",", ".");
  if (text === "") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error(`${label}: inserisci un numero valido maggiore o uguale a zero.`);
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label}: inserisci un numero valido maggiore o uguale a zero.`);
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new Error(`${label}: il valore massimo è ${opts.max}.`);
  }
  const factor = Math.pow(10, opts.decimals ?? 1);
  return Math.round(value * factor) / factor;
}

export function parseRequiredNonNegative(
  raw: FormDataEntryValue | null | undefined,
  label: string,
  opts: { max?: number; decimals?: number } = {}
): number {
  const value = parseNonNegative(raw, label, opts);
  if (value === null) throw new Error(`${label}: campo obbligatorio.`);
  return value;
}

/** Limite massimo dei litri nelle taniche dell'hangar per un aereo. */
export function tanksLimit(hangarCapacityLiters: number) {
  return hangarCapacityLiters > 0 ? hangarCapacityLiters : MAX_TECHNICAL_LITERS;
}

/** Limite massimo dei litri a bordo dell'aereo. */
export function aircraftLimit(tankCapacityLiters: number) {
  return tankCapacityLiters > 0 ? tankCapacityLiters : MAX_TECHNICAL_LITERS;
}

/**
 * Costo carburante orario dedotto (consumo L/h x prezzo €/L), arrotondato al centesimo.
 * Se consumo o prezzo non sono entrambi > 0 restituisce null (si mantiene il valore storico).
 */
export function deriveHourlyFuelCost(burnLitersPerHour: number, pricePerLiter: number): number | null {
  if (!(burnLitersPerHour > 0) || !(pricePerLiter > 0)) return null;
  return Math.round(burnLitersPerHour * pricePerLiter * 100) / 100;
}

/** Stima dei litri a bordo adesso: litri dopo l'ultimo rifornimento meno consumo dei voli successivi. */
export function estimateOnboardLiters(
  aircraftAfterLiters: number,
  flownHoursSince: number,
  burnLitersPerHour: number
): number | null {
  if (!(burnLitersPerHour > 0)) return null;
  return Math.max(0, aircraftAfterLiters - flownHoursSince * burnLitersPerHour);
}

export function formatLiters(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value)} L`;
}
