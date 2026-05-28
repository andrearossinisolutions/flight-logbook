import { ITALIAN_AIRPORTS } from "./weather";

export interface Airspace {
  id: string;
  name: string;
  class: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'R' | 'P' | 'D_ZONE'; // R: Restricted, P: Prohibited, D_ZONE: Danger
  type: 'CTR' | 'TMA' | 'ATZ' | 'RESTRICTED' | 'PROHIBITED' | 'DANGER';
  lowerLimit: string;
  upperLimit: string;
  coordinates: [number, number][]; // Array of [lat, lon]
}

export interface ReportingPoint {
  id: string;
  name: string;
  code?: string;
  lat: number;
  lon: number;
  type: 'VFR' | 'IFR';
  description?: string;
}

// Milano CTR (Zone 1 Linate, Zone 2, Zone 3), Bergamo CTR, Malpensa CTR, Roma CTR, Bologna CTR
export const LOCAL_AIRSPACES: Airspace[] = [
  {
    id: "milano-ctr-z1",
    name: "Milano CTR - Zona 1 Linate",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "2000ft AMSL",
    coordinates: [
      [45.58, 9.15],
      [45.58, 9.40],
      [45.32, 9.40],
      [45.32, 9.15],
      [45.58, 9.15]
    ]
  },
  {
    id: "bergamo-ctr-z1",
    name: "Bergamo CTR - Zona 1 Orio",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "3000ft AMSL",
    coordinates: [
      [45.78, 9.55],
      [45.78, 9.85],
      [45.58, 9.85],
      [45.58, 9.55],
      [45.78, 9.55]
    ]
  },
  {
    id: "malpensa-ctr-z1",
    name: "Milano CTR - Zona 5 Malpensa",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "2500ft AMSL",
    coordinates: [
      [45.75, 8.55],
      [45.75, 8.85],
      [45.48, 8.85],
      [45.48, 8.55],
      [45.75, 8.55]
    ]
  },
  {
    id: "milano-tma-z1",
    name: "Milano TMA - Zona 1",
    class: "A",
    type: "TMA",
    lowerLimit: "1500ft AGL",
    upperLimit: "FL195",
    coordinates: [
      [46.00, 8.30],
      [46.00, 10.20],
      [45.10, 10.20],
      [45.10, 8.30],
      [46.00, 8.30]
    ]
  },
  {
    id: "roma-ctr-z1",
    name: "Roma CTR - Zona 1 Fiumicino",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "1500ft AMSL",
    coordinates: [
      [41.95, 12.00],
      [41.95, 12.40],
      [41.65, 12.40],
      [41.65, 12.00],
      [41.95, 12.00]
    ]
  },
  {
    id: "bologna-ctr-z1",
    name: "Bologna CTR - Zona 1",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "1500ft AMSL",
    coordinates: [
      [44.65, 11.15],
      [44.65, 11.45],
      [44.40, 11.45],
      [44.40, 11.15],
      [44.65, 11.15]
    ]
  },
  {
    id: "torino-ctr-z1",
    name: "Torino CTR - Zona 1 Caselle",
    class: "D",
    type: "CTR",
    lowerLimit: "GND",
    upperLimit: "2500ft AMSL",
    coordinates: [
      [45.35, 7.50],
      [45.35, 7.80],
      [45.05, 7.80],
      [45.05, 7.50],
      [45.35, 7.50]
    ]
  },
  {
    id: "li-r13",
    name: "Zona Regolamentata LI-R13 (Pavia)",
    class: "R",
    type: "RESTRICTED",
    lowerLimit: "GND",
    upperLimit: "4500ft AMSL",
    coordinates: [
      [45.22, 9.00],
      [45.25, 9.18],
      [45.10, 9.18],
      [45.08, 9.00],
      [45.22, 9.00]
    ]
  },
  {
    id: "li-d21",
    name: "Zona Pericolosa LI-D21 (Monza)",
    class: "D_ZONE",
    type: "DANGER",
    lowerLimit: "GND",
    upperLimit: "2000ft AMSL",
    coordinates: [
      [45.62, 9.25],
      [45.62, 9.32],
      [45.57, 9.32],
      [45.57, 9.25],
      [45.62, 9.25]
    ]
  }
];

// Rich selection of VFR points (VRPs) and IFR points in Italy
export const LOCAL_REPORTING_POINTS: ReportingPoint[] = [
  // --- VFR Reporting Points (Lombardy & Northern Italy) ---
  { id: "vrp-trezzo", name: "Trezzo sull'Adda", code: "MILN1", lat: 45.609, lon: 9.530, type: "VFR", description: "Punto di riporto VFR Nord-Est Milano" },
  { id: "vrp-cassano", name: "Cassano d'Adda", code: "MILE1", lat: 45.528, lon: 9.516, type: "VFR", description: "Punto di riporto VFR Est Milano" },
  { id: "vrp-melegnano", name: "Melegnano Toll", code: "MILS1", lat: 45.358, lon: 9.324, type: "VFR", description: "Punto di riporto VFR Sud Milano (Casello)" },
  { id: "vrp-saronno", name: "Saronno", code: "MILNW", lat: 45.626, lon: 9.036, type: "VFR", description: "Punto di riporto VFR Nord-Ovest Milano" },
  { id: "vrp-vimercate", name: "Vimercate", code: "MILN2", lat: 45.613, lon: 9.372, type: "VFR", description: "Punto di riporto VFR Nord Milano" },
  { id: "vrp-pandino", name: "Pandino", code: "MILSE", lat: 45.405, lon: 9.554, type: "VFR", description: "Punto di riporto VFR Sud-Est Milano" },
  { id: "vrp-vigevano", name: "Vigevano", code: "MILSW", lat: 45.317, lon: 8.861, type: "VFR", description: "Punto di riporto VFR Sud-Ovest Milano" },
  { id: "vrp-abbiategrasso", name: "Abbiategrasso", code: "MIW1", lat: 45.402, lon: 8.917, type: "VFR", description: "Punto di riporto VFR Ovest Milano" },
  { id: "vrp-como", name: "Como", code: "LILH", lat: 45.811, lon: 9.083, type: "VFR", description: "Lago di Como (Idroscalo)" },
  { id: "vrp-capriate", name: "Capriate Toll", code: "BGN1", lat: 45.611, lon: 9.528, type: "VFR", description: "Punto di riporto VFR Ovest Bergamo (Autostrada)" },
  { id: "vrp-seriate", name: "Seriate", code: "BGE1", lat: 45.684, lon: 9.721, type: "VFR", description: "Punto di riporto VFR Est Bergamo" },
  { id: "vrp-valbrembo", name: "Valbrembo Airfield", code: "LILQ", lat: 45.714, lon: 9.598, type: "VFR", description: "Punto di riporto VFR Nord-Ovest Bergamo" },
  { id: "vrp-cantu", name: "Cantù", code: "MILN3", lat: 45.741, lon: 9.131, type: "VFR", description: "Punto di riporto VFR Nord-Ovest Como/Linate" },
  { id: "vrp-pavia", name: "Pavia Sud", code: "PVS", lat: 45.166, lon: 9.155, type: "VFR", description: "Punto di riporto VFR Pavia" },
  { id: "vrp-voghera", name: "Voghera", code: "VGH", lat: 44.992, lon: 9.009, type: "VFR", description: "Punto di riporto VFR Voghera" },
  { id: "vrp-cremona", name: "Cremona Nord", code: "CRN", lat: 45.164, lon: 10.024, type: "VFR", description: "Punto di riporto VFR Cremona" },
  { id: "vrp-piacenza", name: "Piacenza Ovest", code: "PCO", lat: 45.061, lon: 9.614, type: "VFR", description: "Punto di riporto VFR Piacenza" },
  
  // --- VFR Reporting Points (Central Italy / Tuscany / Rome) ---
  { id: "vrp-cecina", name: "Cecina", code: "CEC", lat: 43.310, lon: 10.518, type: "VFR", description: "Punto di riporto VFR Cecina (Toscana)" },
  { id: "vrp-gabbiano", name: "Il Gabbiano Airfield", code: "GAB", lat: 43.850, lon: 10.420, type: "VFR", description: "Aviosuperficie Il Gabbiano" },
  { id: "vrp-bracciano", name: "Lago di Bracciano", code: "ROMNW", lat: 42.120, lon: 12.230, type: "VFR", description: "Punto di riporto VFR Nord-Ovest Roma" },
  { id: "vrp-tivoli", name: "Tivoli", code: "ROME1", lat: 41.960, lon: 12.800, type: "VFR", description: "Punto di riporto VFR Est Roma" },
  { id: "vrp-ostia", name: "Ostia Antica", code: "ROMSW", lat: 41.760, lon: 12.290, type: "VFR", description: "Punto di riporto VFR Sud-Ovest Roma" },
  { id: "vrp-pomezia", name: "Pomezia", code: "ROMS1", lat: 41.670, lon: 12.500, type: "VFR", description: "Punto di riporto VFR Sud Roma" },

  // --- IFR Waypoints (Fixes / Navigational Aids in Northern/Central Italy) ---
  { id: "ifr-odina", name: "ODINA", type: "IFR", lat: 45.658, lon: 9.123, description: "Punto di riporto IFR (Fix Nord-Ovest Milano)" },
  { id: "ifr-abesi", name: "ABESI", type: "IFR", lat: 45.197, lon: 9.789, description: "Punto di riporto IFR (Fix Sud-Est Milano)" },
  { id: "ifr-ipmol", name: "IPMOL", type: "IFR", lat: 45.354, lon: 9.876, description: "Punto di riporto IFR (Fix Est Milano)" },
  { id: "ifr-dekut", name: "DEKUT", type: "IFR", lat: 45.812, lon: 8.912, description: "Punto di riporto IFR (Fix Confine Italo-Svizzero)" },
  { id: "ifr-canne", name: "CANNE", type: "IFR", lat: 45.025, lon: 9.380, description: "Punto di riporto IFR (Fix Sud Milano)" },
  { id: "ifr-lin", name: "LIN (Linate VOR)", type: "IFR", lat: 45.451, lon: 9.278, description: "VHF Omnidirectional Range & DME - Milano Linate" },
  { id: "ifr-srn", name: "SRN (Saronno VOR)", type: "IFR", lat: 45.629, lon: 9.033, description: "VHF Omnidirectional Range & DME - Saronno" },
  { id: "ifr-top", name: "TOP (Torino VOR)", type: "IFR", lat: 45.121, lon: 7.854, description: "VHF Omnidirectional Range & DME - Torino" },
  { id: "ifr-boa", name: "BOA (Bologna VOR)", type: "IFR", lat: 44.536, lon: 11.289, description: "VHF Omnidirectional Range & DME - Bologna" },
  { id: "ifr-ost", name: "OST (Ostia VOR)", type: "IFR", lat: 41.802, lon: 12.246, description: "VHF Omnidirectional Range & DME - Ostia (Roma)" }
];

export const LOCAL_AIRFIELDS = [
  // Certified Airports
  ...Object.values(ITALIAN_AIRPORTS).map(apt => ({
    id: `apt-${apt.icao}`,
    name: apt.name,
    icao: apt.icao,
    lat: apt.lat,
    lon: apt.lon,
    type: "CIVIL",
    elevation: "N/D"
  })),
  // Major Aviosuperfici / Campi di Volo (Recreational Airfields)
  { id: "fld-dovera", name: "Dovera Airfield (Campo Volo)", icao: "", lat: 45.367, lon: 9.530, type: "ULTRALIGHT_STRIP", elevation: "245 ft" },
  { id: "fld-vallegaffaro", name: "Valle Gaffaro (Aviosuperficie)", icao: "LIPZ_V", lat: 44.831, lon: 12.228, type: "AIRFIELD", elevation: "0 ft" },
  { id: "fld-cogliate", name: "Cogliate (Campo Volo)", icao: "", lat: 45.642, lon: 9.076, type: "ULTRALIGHT_STRIP", elevation: "720 ft" },
  { id: "fld-valbrembo", name: "Valbrembo (Aeroporto)", icao: "LILQ", lat: 45.714, lon: 9.598, type: "AIRFIELD", elevation: "794 ft" },
  { id: "fld-alzate", name: "Alzate Brianza (Aeroporto)", icao: "LILM", lat: 45.772, lon: 9.176, type: "AIRFIELD", elevation: "1188 ft" },
  { id: "fld-bresso", name: "Milano Bresso (Aeroporto)", icao: "LIMB", lat: 45.541, lon: 9.202, type: "CIVIL", elevation: "485 ft" },
  { id: "fld-venegono", name: "Varese Venegono (Aeroporto)", icao: "LILN", lat: 45.736, lon: 8.889, type: "CIVIL", elevation: "1138 ft" }
];

