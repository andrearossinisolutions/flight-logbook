export interface MetarResponse {
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  temp: number;
  dewp: number;
  wdir: number | string;
  wspd: number;
  wgst?: number | null;
  visib: string;
  altim: number;
  rawOb: string;
  name: string;
  cover?: string;
  clouds: {
    cover: string;
    base: number | null;
    type?: string | null;
  }[];
  fltCat: string;
  elev: number;
  lat?: number;
  lon?: number;
}

export interface TafResponse {
  icaoId: string;
  bulletinTime: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  rawTAF: string;
  name: string;
  fcsts: TafForecast[];
}

export interface TafForecast {
  timeFrom: number;
  timeTo: number;
  timeBec?: number | null;
  fcstChange?: string | null;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  visib?: string | number | null;
  wxString?: string | null;
  probability?: number | null;
  clouds: {
    cover: string;
    base: number | null;
    type?: string | null;
  }[];
}

export async function fetchMetar(icao: string): Promise<MetarResponse | null> {
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as MetarResponse;
    }
    return null;
  } catch (error) {
    console.error(`Errore nel recupero del METAR per ${icao}:`, error);
    return null;
  }
}

export async function fetchTaf(icao: string): Promise<TafResponse | null> {
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as TafResponse;
    }
    return null;
  } catch (error) {
    console.error(`Errore nel recupero del TAF per ${icao}:`, error);
    return null;
  }
}

export function getRelativeHumidity(temp: number, dewp: number): number {
  if (temp === undefined || dewp === undefined) return 0;
  const a = 17.625;
  const b = 243.04;
  const num = a * dewp;
  const den = b + dewp;
  const num2 = a * temp;
  const den2 = b + temp;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp((num / den) - (num2 / den2)))));
}

export function getSpread(temp: number, dewp: number): number {
  if (temp === undefined || dewp === undefined) return 0;
  return temp - dewp;
}

export interface FltCatStyle {
  label: string;
  bg: string;
  color: string;
  border: string;
}

export function getFltCatStyle(cat: string): FltCatStyle {
  switch (cat?.toUpperCase()) {
    case "VFR":
      return {
        label: "VFR (Visual Flight Rules)",
        bg: "rgba(22, 163, 74, 0.1)",
        color: "#16a34a",
        border: "1px solid rgba(22, 163, 74, 0.3)",
      };
    case "MVFR":
      return {
        label: "MVFR (Marginal VFR)",
        bg: "rgba(37, 99, 235, 0.1)",
        color: "#2563eb",
        border: "1px solid rgba(37, 99, 235, 0.3)",
      };
    case "IFR":
      return {
        label: "IFR (Instrument Flight Rules)",
        bg: "rgba(220, 38, 38, 0.1)",
        color: "#dc2626",
        border: "1px solid rgba(220, 38, 38, 0.3)",
      };
    case "LIFR":
      return {
        label: "LIFR (Low IFR)",
        bg: "rgba(147, 51, 234, 0.1)",
        color: "#9333ea",
        border: "1px solid rgba(147, 51, 234, 0.3)",
      };
    default:
      return {
        label: "Sconosciuto",
        bg: "var(--border)",
        color: "var(--muted)",
        border: "1px solid var(--border)",
      };
  }
}

export function formatCloudLayer(layer: { cover: string; base: number | null; type?: string | null }): string {
  const coverMap: { [key: string]: string } = {
    CLR: "Cielo sereno (Clear)",
    SKC: "Cielo sereno (Sky clear)",
    FEW: "Poche nubi (Few)",
    SCT: "Nuvolosità sparsa (Scattered)",
    BKN: "Cielo molto nuvoloso (Broken)",
    OVC: "Cielo coperto (Overcast)",
    OVX: "Cielo oscurato (Obscured)",
    NSC: "Nessuna nube significativa (No significant clouds)",
    CAVOK: "CAVOK (Cielo e visibilità OK)",
  };

  const coverLabel = coverMap[layer.cover?.toUpperCase()] || layer.cover;
  let typeSuffix = "";
  if (layer.type) {
    if (layer.type.toUpperCase() === "CB") {
      typeSuffix = " - Cumulonembo (CB)";
    } else if (layer.type.toUpperCase() === "TCU") {
      typeSuffix = " - Cumulo congesto (TCU)";
    } else {
      typeSuffix = ` (${layer.type})`;
    }
  }

  if (layer.base !== null && layer.base !== undefined) {
    return `${coverLabel} a ${layer.base} ft (${Math.round(layer.base * 0.3048)} m)${typeSuffix}`;
  }
  return `${coverLabel}${typeSuffix}`;
}

export function formatWind(wdir: string | number | undefined | null, wspd: number | undefined | null, wgst?: number | null): string {
  if (wspd === undefined || wspd === null) return "Vento calmo";
  if (wspd === 0) return "Calmo (0 kt)";
  
  let dirStr = "";
  if (wdir === "VRB" || wdir === "VRB0" || wdir === undefined || wdir === null) {
    dirStr = "Variabile";
  } else {
    dirStr = `${wdir}°`;
  }

  let windStr = `${dirStr} a ${wspd} kt`;
  if (wgst) {
    windStr += ` (raffiche a ${wgst} kt)`;
  }
  
  // Aggiungi velocità in km/h per comodità dei piloti VFR italiani
  const kmh = Math.round(wspd * 1.852);
  const kmhGust = wgst ? Math.round(wgst * 1.852) : null;
  windStr += ` ~ ${kmh} km/h`;
  if (kmhGust) {
    windStr += ` (raffiche a ${kmhGust} km/h)`;
  }

  return windStr;
}

export function formatVisibilityKm(vis: string | number | undefined | null): { primary: string; secondary: string } {
  if (vis === undefined || vis === null) return { primary: "N/D", secondary: "Non disponibile" };
  
  const visStr = String(vis).trim();
  if (visStr.includes("+") || visStr === "10" || visStr === "9999") {
    return { primary: "10+ km", secondary: "Ottima" };
  }
  
  const num = Number(visStr);
  if (!isNaN(num)) {
    if (num >= 9000) {
      return { primary: "10+ km", secondary: "Ottima" };
    }
    
    let kmValue = num;
    let isSM = false;
    
    if (num < 30) {
      // It's in Statute Miles
      kmValue = num * 1.60934;
      isSM = true;
    } else {
      // It's in meters
      kmValue = num / 1000;
    }
    
    if (kmValue >= 9.5) {
      return { primary: "10+ km", secondary: "Ottima" };
    }
    
    if (kmValue >= 5) {
      return { primary: `${Math.round(kmValue)} km`, secondary: "Buona" };
    }
    
    if (kmValue >= 1.5) {
      return { primary: `${kmValue.toFixed(1).replace(".0", "")} km`, secondary: "Ridotta" };
    }
    
    if (kmValue < 1.0) {
      // Show in meters
      const meters = isSM ? Math.round(kmValue * 1000) : num;
      return { primary: `${meters} m`, secondary: "Gravemente ridotta" };
    }
    
    return { primary: `${kmValue.toFixed(1)} km`, secondary: "Gravemente ridotta" };
  }
  
  return { primary: visStr, secondary: "Condizioni locali" };
}

export function decodeWeatherString(wx: string | undefined | null): string {
  if (!wx) return "Nessun fenomeno significativo";
  
  const translations: { [key: string]: string } = {
    // Intensity / Proximity
    "+": "Forte ",
    "-": "Leggera ",
    "VC": "Nelle vicinanze di ",
    
    // Descriptor
    "MI": "sottile",
    "BC": "banchi di",
    "PR": "parziale",
    "DR": "scaccianieve basso",
    "BL": "scaccianieve alto",
    "SH": "rovesci di",
    "TS": "temporale con",
    "FZ": "soprafuso/congelantesi",
    
    // Precipitation
    "DZ": "pioviggine",
    "RA": "pioggia",
    "SN": "neve",
    "SG": "granelli di neve",
    "IC": "aghi di ghiaccio",
    "PL": "granelli di ghiaccio",
    "GR": "grandine",
    "GS": "graupel / piccola grandine",
    "UP": "precipitazione sconosciuta",
    
    // Obscuration
    "BR": "foschia",
    "FG": "nebbia",
    "FU": "fumo",
    "VA": "cenere vulcanica",
    "DU": "polvere",
    "SA": "sabbia",
    "HZ": "caligine (haze)",
    "PY": "spruzzi d'acqua",
    
    // Other
    "PO": "vortici di polvere",
    "SQ": "colpi di vento",
    "FC": "tromba d'aria",
    "SS": "tempesta di sabbia",
    "DS": "tempesta di polvere",
  };

  let decoded = "";
  let remaining = wx.trim().toUpperCase();

  // Controlla intensità
  if (remaining.startsWith("+")) {
    decoded += "Forte ";
    remaining = remaining.substring(1);
  } else if (remaining.startsWith("-")) {
    decoded += "Leggera ";
    remaining = remaining.substring(1);
  } else if (remaining.startsWith("VC")) {
    decoded += "Nelle vicinanze di ";
    remaining = remaining.substring(2);
  }

  // Se rimangono codici di 2 o 4 lettere, li mappiamo
  const tokens: string[] = [];
  while (remaining.length >= 2) {
    tokens.push(remaining.substring(0, 2));
    remaining = remaining.substring(2);
  }

  const translatedTokens = tokens.map(token => translations[token] || token);
  decoded += translatedTokens.join(" ");

  return `${decoded.trim()} (${wx})`;
}

export interface AirportCoords {
  icao: string;
  name: string;
  lat: number;
  lon: number;
}

export const ITALIAN_AIRPORTS: Record<string, AirportCoords> = {
  LIML: { icao: "LIML", name: "Milano Linate", lat: 45.461, lon: 9.263 },
  LIME: { icao: "LIME", name: "Bergamo Orio al Serio", lat: 45.671, lon: 9.704 },
  LIMC: { icao: "LIMC", name: "Milano Malpensa", lat: 45.630, lon: 8.723 },
  LIMF: { icao: "LIMF", name: "Torino Caselle", lat: 45.201, lon: 7.650 },
  LIMW: { icao: "LIMW", name: "Aosta", lat: 45.738, lon: 7.369 },
  LIMG: { icao: "LIMG", name: "Albenga", lat: 44.046, lon: 8.127 },
  LIPO: { icao: "LIPO", name: "Brescia Montichiari", lat: 45.429, lon: 10.330 },
  LIPX: { icao: "LIPX", name: "Verona Villafranca", lat: 45.396, lon: 10.888 },
  LIPT: { icao: "LIPT", name: "Trento Mattarello", lat: 46.022, lon: 11.124 },
  LIPB: { icao: "LIPB", name: "Bolzano", lat: 46.460, lon: 11.326 },
  LIPZ: { icao: "LIPZ", name: "Venezia Tessera", lat: 45.505, lon: 12.352 },
  LIPV: { icao: "LIPV", name: "Venezia Lido", lat: 45.426, lon: 12.389 },
  LIPH: { icao: "LIPH", name: "Treviso Sant'Angelo", lat: 45.648, lon: 12.194 },
  LIPU: { icao: "LIPU", name: "Padova", lat: 45.396, lon: 11.848 },
  LIPE: { icao: "LIPE", name: "Bologna Borgo Panigale", lat: 44.535, lon: 11.288 },
  LIPK: { icao: "LIPK", name: "Forlì", lat: 44.206, lon: 12.070 },
  LIPR: { icao: "LIPR", name: "Rimini Miramare", lat: 44.020, lon: 12.612 },
  LIPL: { icao: "LIPL", name: "Ancona Falconara", lat: 43.616, lon: 13.360 },
  LIRP: { icao: "LIRP", name: "Pisa San Giusto", lat: 43.684, lon: 10.396 },
  LIRN: { icao: "LIRN", name: "Napoli Capodichino", lat: 40.886, lon: 14.291 },
  LIRF: { icao: "LIRF", name: "Roma Fiumicino", lat: 41.800, lon: 12.239 },
  LIRA: { icao: "LIRA", name: "Roma Ciampino", lat: 41.799, lon: 12.595 },
  LIRZ: { icao: "LIRZ", name: "Perugia San Egidio", lat: 43.096, lon: 12.513 },
  LICC: { icao: "LICC", name: "Catania Fontanarossa", lat: 37.467, lon: 15.066 },
  LICJ: { icao: "LICJ", name: "Palermo Punta Raisi", lat: 38.176, lon: 13.090 },
  LIBD: { icao: "LIBD", name: "Bari Palese", lat: 41.139, lon: 16.761 },
  LIBP: { icao: "LIBP", name: "Pescara", lat: 42.433, lon: 14.185 },
  LICA: { icao: "LICA", name: "Lamezia Terme", lat: 38.908, lon: 16.242 },
  LIEE: { icao: "LIEE", name: "Cagliari Elmas", lat: 39.251, lon: 9.054 },
  LIEO: { icao: "LIEO", name: "Olbia Costa Smeralda", lat: 40.899, lon: 9.518 },
  LIEA: { icao: "LIEA", name: "Alghero Fertilia", lat: 40.632, lon: 8.291 },
};

export function getAirportsAlongRoute(depIcao: string, arrIcao: string): string[] {
  const dep = ITALIAN_AIRPORTS[depIcao.toUpperCase()];
  const arr = ITALIAN_AIRPORTS[arrIcao.toUpperCase()];
  
  if (!dep || !arr) {
    const result: string[] = [];
    if (depIcao) result.push(depIcao.toUpperCase());
    const arrClean = arrIcao ? arrIcao.toUpperCase() : "";
    if (arrClean && arrClean !== depIcao.toUpperCase()) {
      result.push(arrClean);
    }
    return result;
  }
  
  const depLat = dep.lat;
  const depLon = dep.lon;
  const arrLat = arr.lat;
  const arrLon = arr.lon;
  
  const dy = arrLat - depLat;
  const dx = arrLon - depLon;
  const L2 = dx * dx + dy * dy;
  
  if (L2 === 0) {
    return [depIcao.toUpperCase()];
  }
  
  const candidates: { icao: string; t: number; dist: number }[] = [];
  
  for (const [icao, apt] of Object.entries(ITALIAN_AIRPORTS)) {
    if (icao === depIcao.toUpperCase() || icao === arrIcao.toUpperCase()) {
      continue;
    }
    
    const cx = apt.lon - depLon;
    const cy = apt.lat - depLat;
    
    const t = Math.max(0, Math.min(1, (cx * dx + cy * dy) / L2));
    
    const projX = depLon + t * dx;
    const projY = depLat + t * dy;
    
    const diffX = apt.lon - projX;
    const diffY = apt.lat - projY;
    
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);
    
    // Max distance: 0.45 degrees is about ~27 Nautical Miles
    if (dist < 0.45) {
      candidates.push({ icao, t, dist });
    }
  }
  
  candidates.sort((a, b) => a.t - b.t);
  
  // Max 3 intermediate stations to avoid calling the API excessively
  const intermediate = candidates.slice(0, 3).map(c => c.icao);
  
  return [depIcao.toUpperCase(), ...intermediate, arrIcao.toUpperCase()];
}

export const PLACE_TO_METAR: Record<string, string> = {
  dovera: "LIML",
  linate: "LIML",
  malpensa: "LIMC",
  orio: "LIME",
  bergamo: "LIME",
  "valle gaffaro": "LIPZ",
  vallegaffaro: "LIPZ",
  gaffaro: "LIPZ",
  ozzano: "LIPE",
  bologna: "LIPE",
  boscomantico: "LIPX",
  verona: "LIPX",
  bedizzole: "LIPO",
  brescia: "LIPO",
  montichiari: "LIPO",
  cremona: "LIPO",
  lodi: "LIML",
  crema: "LIML",
  sondrio: "LIME",
  valbrembo: "LIME",
  alzate: "LIME",
  calcinate: "LIMC",
  vergiate: "LIMC",
  biella: "LIMC",
  collegno: "LIMF",
  torino: "LIMF",
  caselle: "LIMF",
  aosta: "LIMW",
  albenga: "LIMG",
  sarzana: "LIRP",
  pisa: "LIRP",
  pavullo: "LIPE",
  ferrara: "LIPE",
  padova: "LIPU",
  venezia: "LIPZ",
  lido: "LIPV",
  treviso: "LIPH",
  bolzano: "LIPB",
  trento: "LIPT",
  trieste: "LIPQ",
  udine: "LIPD",
  forli: "LIPK",
  rimini: "LIPR",
  ancona: "LIPL",
  roma: "LIRF",
  napoli: "LIRN",
  cagliari: "LIEE",
  olbia: "LIEO",
  alghero: "LIEA",
  catania: "LICC",
  palermo: "LICJ",
  bari: "LIBD",
  pescara: "LIBP",
  lamezia: "LICA",
};

export function resolveLocationToIcao(locationName: string): string | null {
  if (!locationName) return null;
  
  const normalized = locationName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove gli accenti
    .replace(/[^a-z0-9\s]/g, " ") // rimuove caratteri speciali
    .trim();

  // 1. Se è già un codice ICAO di 4 lettere
  if (/^[a-z]{4}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  // 2. Se c'è una corrispondenza esatta nella tabella
  if (PLACE_TO_METAR[normalized]) {
    return PLACE_TO_METAR[normalized];
  }

  // 3. Cerca corrispondenze parziali parola per parola
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (word.length >= 3 && PLACE_TO_METAR[word]) {
      return PLACE_TO_METAR[word];
    }
  }

  return null;
}

export function resolveQueryToIcaos(query: string, defaultBase: string = "LIML"): string[] {
  const cleanBase = (defaultBase || "LIML").trim().toUpperCase();
  if (!query) return [cleanBase];
  
  // Se la ricerca contiene virgole, risolviamo ciascun elemento
  const tokens = query.split(",").map(t => t.trim()).filter(Boolean);
  const resolved: string[] = [];
  
  for (const token of tokens) {
    const icao = resolveLocationToIcao(token);
    if (icao) {
      resolved.push(icao);
    }
  }
  
  if (resolved.length >= 3) {
    return Array.from(new Set(resolved));
  } else if (resolved.length === 2) {
    return getAirportsAlongRoute(resolved[0], resolved[1]);
  } else if (resolved.length === 1) {
    return [resolved[0]];
  }
  
  // Se non si è diviso per virgole ma contiene testo libero (es. "Dovera Valle Gaffaro")
  const textResolved = extractLocationsFromText(query);
  if (textResolved.length >= 3) {
    return textResolved;
  } else if (textResolved.length === 2) {
    return getAirportsAlongRoute(textResolved[0], textResolved[1]);
  } else if (textResolved.length === 1) {
    return [textResolved[0]];
  }
  
  return [cleanBase];
}

export function extractLocationsFromText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
    
  const words = normalized.split(/\s+/);
  const resolved: string[] = [];
  
  // Cerca corrispondenze a più parole per prime (es. "valle gaffaro")
  for (const [place, icao] of Object.entries(PLACE_TO_METAR)) {
    if (place.includes(" ") && normalized.includes(place)) {
      resolved.push(icao);
    }
  }
  
  // Cerca corrispondenze a singola parola
  for (const word of words) {
    if (word.length >= 3 && PLACE_TO_METAR[word]) {
      resolved.push(PLACE_TO_METAR[word]);
    }
  }
  
  const unique = Array.from(new Set(resolved));
  
  // Ordina le stazioni in base all'ordine di apparizione nel testo originale
  unique.sort((a, b) => {
    const keyA = Object.keys(PLACE_TO_METAR).find(k => PLACE_TO_METAR[k] === a) || "";
    const keyB = Object.keys(PLACE_TO_METAR).find(k => PLACE_TO_METAR[k] === b) || "";
    return normalized.indexOf(keyA) - normalized.indexOf(keyB);
  });
  
  return unique;
}

export function getBriefingRoute(text: string, defaultBase: string): string[] {
  const cleanBase = (defaultBase || "LIML").trim().toUpperCase();
  if (!text) return [cleanBase];
  
  // 1. Cerca prima se ci sono codici ICAO a 4 lettere espliciti nel testo
  const rawIcaos = Array.from(new Set(
    (text.match(/\b[A-Z]{4}\b/g) || []).map(i => i.toUpperCase())
  ));
  
  if (rawIcaos.length >= 3) {
    return rawIcaos;
  } else if (rawIcaos.length === 2) {
    return getAirportsAlongRoute(rawIcaos[0], rawIcaos[1]);
  } else if (rawIcaos.length === 1) {
    // Se c'è un solo ICAO grezzo, estraiamo gli altri luoghi dal testo circostante
    const remainingText = text.replace(new RegExp(rawIcaos[0], "gi"), "").trim();
    const resolvedOthers = extractLocationsFromText(remainingText);
    if (resolvedOthers.length > 0) {
      return getAirportsAlongRoute(rawIcaos[0], resolvedOthers[0]);
    }
    return getAirportsAlongRoute(cleanBase, rawIcaos[0]);
  }

  // 2. Nessun ICAO esplicito. Estraiamo tutti i luoghi conosciuti tramite dizionario
  const resolved = extractLocationsFromText(text);

  if (resolved.length >= 3) {
    return resolved;
  } else if (resolved.length === 2) {
    return getAirportsAlongRoute(resolved[0], resolved[1]);
  } else if (resolved.length === 1) {
    return getAirportsAlongRoute(cleanBase, resolved[0]);
  }

  return [cleanBase];
}

