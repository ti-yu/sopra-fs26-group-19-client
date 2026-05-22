// Shared formatters for help-request UI bits (duration, time range).
// Keep all display logic here so My Requests, My Applications, Map, Feed, and
// Review History stay visually consistent.

/**
 * Render a duration in hours as a compact "Xh Ym" string.
 * Examples: 0.5 -> "30 min", 1 -> "1h", 1.5 -> "1h 30 min", 0.0167 -> "1 min"
 */
export function formatDuration(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const hours = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(hours) || hours <= 0) return "";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes} min`;
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes} min`;
}

/**
 * Given a start time string "HH:mm" and a duration in hours, return a
 * "HH:mm-HH:mm" range. Falls back to just the start (or empty) if anything
 * looks malformed.
 */
export function formatTimeRange(start: string | null | undefined, durationHours: string | number | null | undefined): string {
  if (!start) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(start);
  if (!match) return start;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const dur = typeof durationHours === "number" ? durationHours : parseFloat(durationHours ?? "");
  if (!Number.isFinite(dur) || dur <= 0) return start;
  const totalMinutes = h * 60 + m + Math.round(dur * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}-${pad(endH)}:${pad(endM)}`;
}
