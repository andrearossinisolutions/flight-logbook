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
  if (!icao || icao.trim().length !== 4) return null;
  const cleanIcao = icao.trim().toUpperCase();
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/metar?ids=${cleanIcao}&format=json`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as MetarResponse;
    }
    return null;
  } catch (error) {
    console.warn(`Avviso nel recupero del METAR per ${cleanIcao}:`, error);
    return null;
  }
}

export async function fetchTaf(icao: string): Promise<TafResponse | null> {
  if (!icao || icao.trim().length !== 4) return null;
  const cleanIcao = icao.trim().toUpperCase();
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/taf?ids=${cleanIcao}&format=json`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as TafResponse;
    }
    return null;
  } catch (error) {
    console.warn(`Avviso nel recupero del TAF per ${cleanIcao}:`, error);
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
  const speed = Number(wspd);
  if (isNaN(speed) || speed === 0) return "Calmo (0 kt)";
  
  let dirStr = "";
  if (wdir === "VRB" || wdir === "VRB0" || wdir === undefined || wdir === null) {
    dirStr = "Variabile";
  } else {
    dirStr = `${wdir}°`;
  }

  let windStr = `${dirStr} a ${speed} kt`;
  if (wgst !== undefined && wgst !== null) {
    const gust = Number(wgst);
    if (!isNaN(gust)) {
      windStr += ` (raffiche a ${gust} kt)`;
    }
  }
  
  // Aggiungi velocità in km/h per comodità dei piloti VFR italiani
  const kmh = Math.round(speed * 1.852);
  const gustValue = (wgst !== undefined && wgst !== null) ? Number(wgst) : null;
  const kmhGust = gustValue && !isNaN(gustValue) ? Math.round(gustValue * 1.852) : null;
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
  LIRS: { icao: "LIRS", name: "Grosseto Baccarini", lat: 42.760, lon: 11.071 },
  LIRQ: { icao: "LIRQ", name: "Firenze Peretola", lat: 43.810, lon: 11.203 },
  LIPA: { icao: "LIPA", name: "Aviano Air Base", lat: 46.032, lon: 12.597 },
};

export function getAirportsAlongRoute(depIcao: string | undefined | null, arrIcao: string | undefined | null): string[] {
  if (!depIcao && !arrIcao) return [];
  
  const depClean = depIcao ? depIcao.trim().toUpperCase() : "";
  const arrClean = arrIcao ? arrIcao.trim().toUpperCase() : "";
  
  if (!depClean && arrClean) return [arrClean];
  if (depClean && !arrClean) return [depClean];
  if (depClean === arrClean) return [depClean];

  const dep = ITALIAN_AIRPORTS[depClean];
  const arr = ITALIAN_AIRPORTS[arrClean];
  
  if (!dep || !arr) {
    const result: string[] = [];
    if (depClean) result.push(depClean);
    if (arrClean && arrClean !== depClean) {
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
    return [depClean];
  }
  
  const candidates: { icao: string; t: number; dist: number }[] = [];
  
  for (const [icao, apt] of Object.entries(ITALIAN_AIRPORTS)) {
    if (icao === depClean || icao === arrClean) {
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
  
  return [depClean, ...intermediate, arrClean];
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
  // Aggiunte VFR e aviosuperfici
  cecina: "LIRP",
  "il gabbiano": "LIRP",
  gabbiano: "LIRP",
  "prati nuovi": "LIML",
  pratinuovi: "LIML",
  cogliate: "LIML",
  "san vincenzo": "LIRP",
  caposile: "LIPZ",
  montagnana: "LIPU",
  legnago: "LIPX",
  "casale monferrato": "LIMC",
  vercelli: "LIMC",
  voghera: "LIML",
  tortona: "LIML",
  // Codici ICAO VFR non-reporting comuni in Italia
  limb: "LIML", // Milano Bresso
  lild: "LIML", // Milano Bresso
  liln: "LIMC", // Varese Venegono
  lilm: "LIME", // Alzate Brianza
  lilo: "LIMC", // Biella Cerrione
  lilq: "LIME", // Valbrembo
  lilh: "LIME", // Como Idroscalo
  liqg: "LIRP", // Lucca Tassignano
  liqd: "LIRQ", // Arezzo
  liqma: "LIRP", // Marina di Campo Elba
};

export async function getCoordinatesFromName(name: string): Promise<{ lat: number; lon: number; displayName?: string } | null> {
  try {
    const query = encodeURIComponent(`${name}, Italia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: {
        "User-Agent": "FlightLogbookApp/1.0 (contact: andrea.rossini.solutions@gmail.com)"
      },
      next: { revalidate: 86400 } // Cache results for 24 hours
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const displayName = data[0].display_name;
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon, displayName };
      }
    }
    return null;
  } catch (err) {
    console.warn("Avviso geocodifica Nominatim:", name, err);
    return null;
  }
}

export function findNearestIcao(lat: number, lon: number, excludeIcao?: string): string {
  let nearestIcao = "LIML";
  let minDist = Infinity;
  
  for (const [icao, apt] of Object.entries(ITALIAN_AIRPORTS)) {
    if (excludeIcao && icao.toUpperCase() === excludeIcao.toUpperCase()) {
      continue;
    }
    const dy = apt.lat - lat;
    const dx = apt.lon - lon;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearestIcao = icao;
    }
  }
  
  return nearestIcao;
}

export function cleanLocationName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\([^)]*\)/g, " ") // Rimuove tutto ciò che è tra parentesi tonda, incluse le parentesi
    .replace(/\b(aviosuperficie|aviosuperfici|campo volo|campo di volo|aeroporto|aeroclub|aero club|airfield|altipiano|elisuperficie)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveLocationToIcao(locationName: string): Promise<string | null> {
  if (!locationName) return null;
  
  const cleaned = cleanLocationName(locationName);
  if (!cleaned) return null;
  
  // 1. Se è un codice ICAO di 4 lettere ed è una delle stazioni meteo note
  if (/^[a-zA-Z]{4}$/.test(cleaned)) {
    const upper = cleaned.toUpperCase();
    if (ITALIAN_AIRPORTS[upper]) {
      return upper;
    }
  }

  // 2. Se c'è una corrispondenza esatta nella tabella statico-locale
  const normalized = cleaned
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove gli accenti
    .replace(/[^a-z0-9\s]/g, " ") // rimuove caratteri speciali
    .trim();

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

  // 4. Risoluzione Dinamica tramite Nominatim OSM
  const coords = await getCoordinatesFromName(cleaned);
  if (coords) {
    return findNearestIcao(coords.lat, coords.lon);
  }

  return null;
}

export async function resolveQueryToIcaos(query: string, defaultBase: string = "LIML"): Promise<string[]> {
  const cleanBase = (defaultBase || "LIML").trim().toUpperCase();
  if (!query) return [cleanBase];
  
  // Se la ricerca contiene virgole o delimitatori di rotta, risolviamo ciascun elemento
  const tokens = query.split(/[,/\-➔➔]/).map(t => t.trim()).filter(Boolean);
  const resolved: string[] = [];
  
  for (const token of tokens) {
    const icao = await resolveLocationToIcao(token);
    if (icao) {
      resolved.push(icao);
    }
  }
  
  const unique = Array.from(new Set(resolved));
  
  if (unique.length >= 3) {
    return unique;
  } else if (unique.length === 2) {
    return getAirportsAlongRoute(unique[0], unique[1]);
  } else if (unique.length === 1) {
    return [unique[0]];
  }
  
  // Se non si è diviso in token validi o non è stato trovato nulla tramite i token
  const textResolved = await extractLocationsFromText(query);
  if (textResolved.length >= 3) {
    return textResolved;
  } else if (textResolved.length === 2) {
    return getAirportsAlongRoute(textResolved[0], textResolved[1]);
  } else if (textResolved.length === 1) {
    return [textResolved[0]];
  }
  
  return [cleanBase];
}

export async function extractLocationsFromText(text: string): Promise<string[]> {
  if (!text) return [];
  
  // Split su delimitatori di rotta
  let parts = text.split(/[-➔➔,]/i).map(p => p.trim()).filter(Boolean);
  
  // Se non ci sono delimitatori, proviamo a estrarre chiavi note o dividere per spazio
  if (parts.length === 1) {
    let tempText = text.toLowerCase();
    const foundKeys: string[] = [];
    for (const place of Object.keys(PLACE_TO_METAR)) {
      if (tempText.includes(place)) {
        foundKeys.push(place);
        tempText = tempText.replace(place, "");
      }
    }
    if (foundKeys.length > 0) {
      parts = foundKeys;
    } else {
      parts = text.split(/\s+/).map(p => p.trim()).filter(Boolean);
    }
  }

  const resolved: string[] = [];
  for (const part of parts) {
    if (part.length < 3) continue;
    const icao = await resolveLocationToIcao(part);
    if (icao) {
      resolved.push(icao);
    }
  }
  
  const unique = Array.from(new Set(resolved));
  
  // Ordina le stazioni in base all'ordine di apparizione nel testo originale
  unique.sort((a, b) => {
    const keyA = Object.keys(PLACE_TO_METAR).find(k => PLACE_TO_METAR[k] === a) || a;
    const keyB = Object.keys(PLACE_TO_METAR).find(k => PLACE_TO_METAR[k] === b) || b;
    return text.toLowerCase().indexOf(keyA.toLowerCase()) - text.toLowerCase().indexOf(keyB.toLowerCase());
  });
  
  return unique;
}

export async function getBriefingRoute(text: string, defaultBase: string): Promise<string[]> {
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
    const remainingText = text.replace(new RegExp(rawIcaos[0], "gi"), "").trim();
    const resolvedOthers = await extractLocationsFromText(remainingText);
    if (resolvedOthers.length > 0) {
      return getAirportsAlongRoute(rawIcaos[0], resolvedOthers[0]);
    }
    return getAirportsAlongRoute(cleanBase, rawIcaos[0]);
  }

  // 2. Nessun ICAO esplicito. Estraiamo tutti i luoghi conosciuti tramite dizionario o Nominatim
  const resolved = await extractLocationsFromText(text);

  if (resolved.length >= 3) {
    return resolved;
  } else if (resolved.length === 2) {
    return getAirportsAlongRoute(resolved[0], resolved[1]);
  } else if (resolved.length === 1) {
    return getAirportsAlongRoute(cleanBase, resolved[0]);
  }

  return [cleanBase];
}

export interface LocationWeatherDetails {
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  elevationFt: number;
  tempC: number;
  nearestIcao: string;
  qnhHpa: number;
  pressureAltitudeFt: number;
  densityAltitudeFt: number;
  resolvedAddress?: string;
}

export async function getLocationWeatherDetails(name: string, defaultQnh: number = 1013.25): Promise<LocationWeatherDetails | null> {
  if (!name) return null;
  const cleanedName = cleanLocationName(name);
  if (!cleanedName) return null;

  let coords: { lat: number; lon: number; displayName?: string } | null = null;
  let nearestIcao = "LIML";
  let resolvedAddress: string | undefined = undefined;

  // Se è un ICAO noto
  const upperName = cleanedName.toUpperCase();
  if (ITALIAN_AIRPORTS[upperName]) {
    coords = { lat: ITALIAN_AIRPORTS[upperName].lat, lon: ITALIAN_AIRPORTS[upperName].lon };
    nearestIcao = upperName;
    resolvedAddress = `${ITALIAN_AIRPORTS[upperName].name} (${upperName})`;
  } else {
    // Altrimenti risolvi la località all'ICAO più vicino
    const resolvedIcao = await resolveLocationToIcao(cleanedName);
    if (resolvedIcao) {
      nearestIcao = resolvedIcao;
    }
    // E ottieni le coordinate esatte tramite Nominatim
    coords = await getCoordinatesFromName(cleanedName);
    if (coords && coords.displayName) {
      resolvedAddress = coords.displayName;
    }
  }

  // Se non troviamo coordinate per la località, usiamo le coordinate dell'aeroporto più vicino
  if (!coords) {
    const apt = ITALIAN_AIRPORTS[nearestIcao];
    if (apt) {
      coords = { lat: apt.lat, lon: apt.lon };
    }
  }

  if (!coords) return null;

  // Interroga Open-Meteo per elevazione e temperatura esatta
  let elevationM = 0;
  let tempC = 15; // default standard temperature
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      elevationM = data.elevation ?? 0;
      tempC = data.current?.temperature_2m ?? 15;
    }
  } catch (err) {
    console.warn(`Impossibile recuperare meteo Open-Meteo per ${cleanedName}:`, err);
  }

  const elevationFt = Math.round(elevationM * 3.28084);
  
  // PA = Elevation (ft) + (1013.25 - QNH) * 30
  const qnh = defaultQnh;
  const pressureAltitudeFt = Math.round(elevationFt + (1013.25 - qnh) * 30);
  
  // Standard ISA Temp at Pressure Altitude = 15 - 1.98 * (PA / 1000)
  const isaTemp = 15 - 1.98 * (pressureAltitudeFt / 1000);
  
  // DA = PA + 120 * (OAT - ISA)
  const densityAltitudeFt = Math.round(pressureAltitudeFt + 120 * (tempC - isaTemp));

  return {
    name: cleanedName,
    lat: coords.lat,
    lon: coords.lon,
    elevationM,
    elevationFt,
    tempC,
    nearestIcao,
    qnhHpa: qnh,
    pressureAltitudeFt,
    densityAltitudeFt,
    resolvedAddress
  };
}

export interface SwllChart {
  url: string;
  date: Date;
  label: string;
}

export async function fetchSwllCharts(): Promise<SwllChart[]> {
  try {
    const res = await fetch("https://www.deskaeronautico.it/carte-meteo/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 1800 } // cache per 30 minuti
    });

    if (!res.ok) {
      console.warn(`Impossibile recuperare la pagina delle carte meteo: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const regex = /https:\/\/www\.deskaeronautico\.it\/swll\/SWLL_[0-9]{6}_[a-z0-9]{4}\.png/g;
    const matches = html.match(regex);

    if (!matches) {
      return [];
    }

    const uniqueUrls = Array.from(new Set(matches));

    const parsed = uniqueUrls.map((url) => {
      const match = url.match(/SWLL_([0-9]{2})([0-9]{2})00_[a-z0-9]{4}\.png/);
      if (!match) {
        return { url, date: new Date(0), label: "Ora Sconosciuta" };
      }
      const day = parseInt(match[1], 10);
      const hour = parseInt(match[2], 10);

      const now = new Date();
      let year = now.getUTCFullYear();
      let month = now.getUTCMonth(); // 0-indexed

      // Gestione cambio mese (se giorno carta > giorno odierno + 5, la carta è del mese scorso)
      if (day > now.getUTCDate() + 5) {
        month -= 1;
        if (month < 0) {
          month = 11;
          year -= 1;
        }
      }
      // Gestione cambio mese (se giorno carta < giorno odierno - 5, la carta è del mese successivo)
      else if (day < now.getUTCDate() - 5) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }

      const date = new Date(Date.UTC(year, month, day, hour, 0, 0));

      const localTimeStr = date.toLocaleString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome"
      });

      const label = `Carta del ${localTimeStr} (Locali) - ${hour.toString().padStart(2, "0")}:00 UTC`;

      return { url, date, label };
    });

    // Ordina cronologicamente
    return parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (err) {
    console.error("Errore nel recupero delle carte SWLL:", err);
    return [];
  }
}


