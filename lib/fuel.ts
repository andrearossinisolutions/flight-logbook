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

// ---------------------------------------------------------------------------
// Carburante del singolo volo (litri reali registrati a posteriori)
// ---------------------------------------------------------------------------

export type FlightFuelLiters = {
  fuelStartLiters?: number | null;
  fuelEnRouteLiters?: number | null;
  fuelEndLiters?: number | null;
};

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Consumo reale = partenza + rotta (mancante = 0) - arrivo.
 * Calcolabile solo con partenza e arrivo presenti; null se mancano o se il risultato è negativo
 * (dati che non tornano: si ricade sul costo a ore).
 */
export function realBurnLiters(f: FlightFuelLiters): number | null {
  if (!isNum(f.fuelStartLiters) || !isNum(f.fuelEndLiters)) return null;
  const enRoute = isNum(f.fuelEnRouteLiters) ? f.fuelEnRouteLiters : 0;
  const burn = f.fuelStartLiters + enRoute - f.fuelEndLiters;
  return burn >= 0 ? burn : null;
}

/** Vero se partenza e arrivo sono presenti ma il consumo risulta negativo. */
export function hasInconsistentFuel(f: FlightFuelLiters): boolean {
  if (!isNum(f.fuelStartLiters) || !isNum(f.fuelEndLiters)) return false;
  return realBurnLiters(f) === null;
}

/**
 * Prezzo da salvare nel volo (snapshot €/L).
 * - dati reali validi e prezzo > 0: si mantiene lo snapshot esistente (se c'è e riguarda lo stesso aereo),
 *   altrimenti si usa il prezzo attuale dell'aereo
 * - altrimenti null
 */
export function resolveFuelPriceSnapshot(args: {
  fuel: FlightFuelLiters;
  currentPrice: number | null | undefined;
  existingSnapshot?: number | null;
  sameAircraftAsBefore?: boolean;
}): number | null {
  if (realBurnLiters(args.fuel) === null) return null;
  if (args.sameAircraftAsBefore && isNum(args.existingSnapshot) && args.existingSnapshot > 0) {
    return args.existingSnapshot;
  }
  return isNum(args.currentPrice) && args.currentPrice > 0 ? args.currentPrice : null;
}

/**
 * Costo del volo di un aereo di società. Unica fonte per form, logbook, report e tab Società.
 * - dati reali validi e prezzo (snapshot) > 0: litri reali x prezzo + ore x (manutenzione + fondo motore)
 * - altrimenti: ore x (carburante orario + manutenzione + fondo motore), come prima
 * Con `excludeFuel` (cassa comune disattivata) il carburante reale non entra nel costo.
 * `fuelPrice` è `fuelPriceApplied` del volo; per un volo non ancora salvato (anteprima) il prezzo attuale dell'aereo.
 */
export function companyFlightCost(args: {
  durationMinutes: number;
  hourlyFuelCost: number;
  hourlyMaintCost: number;
  hourlyEngineFund: number;
  fuel: FlightFuelLiters;
  fuelPrice: number | null | undefined;
  excludeFuel?: boolean;
}): number {
  const hours = args.durationMinutes / 60;
  const burn = realBurnLiters(args.fuel);
  if (burn !== null && isNum(args.fuelPrice) && args.fuelPrice > 0) {
    const fuelCost = args.excludeFuel ? 0 : burn * args.fuelPrice;
    return fuelCost + hours * (args.hourlyMaintCost + args.hourlyEngineFund);
  }
  return hours * (args.hourlyFuelCost + args.hourlyMaintCost + args.hourlyEngineFund);
}

/** Solo la parte carburante del costo (per messaggi/anteprime). Null se si usa la stima a ore. */
export function flightFuelCost(args: {
  fuel: FlightFuelLiters;
  fuelPrice: number | null | undefined;
}): number | null {
  const burn = realBurnLiters(args.fuel);
  if (burn === null || !isNum(args.fuelPrice) || !(args.fuelPrice > 0)) return null;
  return burn * args.fuelPrice;
}

// ---------------------------------------------------------------------------
// Rifornimento in rotta come transazione della società (cassa comune disattivata)
// ---------------------------------------------------------------------------

/** Importo suggerito (€) = litri in rotta x prezzo €/L dell'aereo, al centesimo. Null se non calcolabile. */
export function suggestedFuelExpense(liters: number | null | undefined, pricePerLiter: number | null | undefined): number | null {
  if (!isNum(liters) || !(liters > 0) || !isNum(pricePerLiter) || !(pricePerLiter > 0)) return null;
  return Math.round(liters * pricePerLiter * 100) / 100;
}

/** Descrizione automatica della transazione di rifornimento in rotta. */
export function fuelExpenseDescription(args: { date: Date; liters: number; registration: string }): string {
  const day = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
  }).format(args.date);
  return `Rifornimento in rotta · volo del ${day} · ${args.liters} L · ${args.registration}`;
}
