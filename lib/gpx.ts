// Client-side GPX parsing: extracts trackpoint timestamps to derive a flight's
// start time and total duration from one or more uploaded GPX tracklogs.
//
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
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const timeNodes = doc.getElementsByTagName("time");

    let fileStart: Date | null = null;
    let fileEnd: Date | null = null;

    for (let i = 0; i < timeNodes.length; i++) {
      const raw = timeNodes[i].textContent?.trim();
      if (!raw) continue;

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) continue;

      if (!fileStart || parsed < fileStart) fileStart = parsed;
      if (!fileEnd || parsed > fileEnd) fileEnd = parsed;

      if (!start || parsed < start) start = parsed;
    }

    if (fileStart && fileEnd) {
      durationMs += fileEnd.getTime() - fileStart.getTime();
    }
  }

  if (!start) return null;

  return { start, durationMs };
}
