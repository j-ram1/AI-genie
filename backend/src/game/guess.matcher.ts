export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreGuess(input: string, candidate: string): number {
  const a = normalize(input);
  const b = normalize(candidate);

  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a)) return 85;
  if (a.includes(b)) return 80;

  // token overlap
  const at = new Set(a.split(' '));
  const bt = new Set(b.split(' '));
  let inter = 0;
  for (const t of at) if (bt.has(t)) inter++;
  const denom = Math.max(at.size, bt.size);
  const overlap = denom === 0 ? 0 : inter / denom;

  return Math.round(overlap * 70); // 0..70
}

export type Match = { personalityId: string; name: string; score: number };

export function bestMatch(
  input: string,
  candidates: Array<{ personalityId: string; name: string }>,
): Match | null {
  let best: Match | null = null;
  for (const c of candidates) {
    const sc = scoreGuess(input, c.name);
    if (!best || sc > best.score)
      best = { personalityId: c.personalityId, name: c.name, score: sc };
  }
  return best;
}
