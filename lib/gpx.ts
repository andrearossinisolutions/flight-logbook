// Isomorphic GPX parsing (regex-based, works both in the browser and on the
// server where DOMParser isn't available). Used to:
//  - prefill a flight's start time / duration from uploaded GPX tracklogs
//  - draw a flight's actual flown path on the map instead of a straight line

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  time: Date | null;
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

    points.push({
      lat,
      lon,
      time: time && !Number.isNaN(time.getTime()) ? time : null,
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
