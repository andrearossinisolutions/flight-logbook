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

