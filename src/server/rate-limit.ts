/**
 * A rough per-key throttle for public forms.
 *
 * Held in process memory, so it is best-effort: on a serverless platform each
 * instance keeps its own counts. It exists to stop a single browser flooding
 * the inbox or the subscriber list, not as a security boundary.
 */
export function createRateLimiter({
  windowMs,
  max
}: {
  windowMs: number;
  max: number;
}) {
  const recent = new Map<string, number[]>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const hits = (recent.get(key) ?? []).filter((at) => now - at < windowMs);
    hits.push(now);
    recent.set(key, hits);

    // Keep the map from growing without bound on a long-lived server.
    if (recent.size > 5000) recent.clear();

    return hits.length > max;
  };
}

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
