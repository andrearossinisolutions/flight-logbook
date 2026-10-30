// Isomorphic GPX parsing (regex-based, works both in the browser and on the
// server where DOMParser isn't available). Used to:
//  - prefill a flight's start time / duration from uploaded GPX tracklogs
//  - draw a flight's actual flown path on the map instead of a straight line

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  time: Date | null;
  /** Quota in metri (da <ele>), null se assente */
  ele: number | null;
  /** Velocità al suolo in m/s (da <speed>), null se assente */
  speed: number | null;
}

export function parseGpxTrackPoints(gpxText: string): GpxTrackPoint[] {
  const points: GpxTrackPoint[] = [];
  const trkptRegex = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxText))) {
    const attrs = match[1];
    const inner = match[2];

    const latMatch = /\blat="(-?[\d.]+)"/.exec(attrs);
    const lonMatch = /\blon="(-?[\d.]+)"/.exec(attrs);
    if (!latMatch || !lonMatch) continue;

    const lat = Number(latMatch[1]);
    const lon = Number(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const timeMatch = /<time>([^<]+)<\/time>/.exec(inner);
    const time = timeMatch ? new Date(timeMatch[1].trim()) : null;

    const eleMatch = /<ele>([^<]+)<\/ele>/.exec(inner);
    const eleValue = eleMatch ? Number(eleMatch[1].trim()) : NaN;

    const speedMatch = /<speed>([^<]+)<\/speed>/.exec(inner);
    const speedValue = speedMatch ? Number(speedMatch[1].trim()) : NaN;

    points.push({
      lat,
      lon,
      time: time && !Number.isNaN(time.getTime()) ? time : null,
      ele: Number.isFinite(eleValue) ? eleValue : null,
      speed: Number.isFinite(speedValue) ? speedValue : null,
    });
  }

  return points;
}

export function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;

  const step = points.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.floor(i * step)]);
  }
  // Always keep the very last point so the track ends where it actually ends.
  result[result.length - 1] = points[points.length - 1];
  return result;
}

// The start time is the earliest timestamp across all files. The duration is
// the SUM of each file's own (last - first) timespan, not the span between the
// overall earliest and latest timestamp — separate GPX files can represent
// distinct legs with a ground pause (or even a different day) in between.
export async function extractGpxTimeRange(
  files: File[]
): Promise<{ start: Date; durationMs: number } | null> {
  let start: Date | null = null;
  let durationMs = 0;

  for (const file of files) {
    const text = await file.text();
    const points = parseGpxTrackPoints(text);

    let fileStart: Date | null = null;
    let fileEnd: Date | null = null;

    for (const p of points) {
      if (!p.time) continue;
      if (!fileStart || p.time < fileStart) fileStart = p.time;
      if (!fileEnd || p.time > fileEnd) fileEnd = p.time;
      if (!start || p.time < start) start = p.time;
    }

    if (fileStart && fileEnd) {
      durationMs += fileEnd.getTime() - fileStart.getTime();
    }
  }

  if (!start) return null;

  return { start, durationMs };
}

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distanza cumulata in metri per ogni punto (il primo vale 0). */
export function cumulativeDistancesMeters(points: Array<{ lat: number; lon: number }>): number[] {
  const out: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      total += haversineMeters(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    }
    out.push(total);
  }
  return out;
}

const gpxTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Data ("gg/mm") e ora ("hh:mm") separate, in ora di Roma. */
export function formatGpxDateAndClock(t: number): { date: string; clock: string } {
  const parts = gpxTimeFormatter.formatToParts(new Date(t));
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  return { date: `${get("day")}/${get("month")}`, clock: `${get("hour")}:${get("minute")}` };
}

/** Formatta un istante (ms epoch) come "gg/mm hh:mm" in ora di Roma. */
export function formatGpxTime(t: number): string {
  const parts = gpxTimeFormatter.formatToParts(new Date(t));
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}
