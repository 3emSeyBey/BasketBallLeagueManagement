export type Pairing = [home: number, away: number];

/**
 * Berger-table round-robin: each team plays each other exactly once.
 * If teams.length is odd, a bye sentinel rotates through.
 */
export function generateRoundRobin(teamIds: number[]): Pairing[] {
  if (teamIds.length < 2) return [];
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push(-1); // bye
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixed = ids[0];
  let rotating = ids.slice(1);
  const games: Pairing[] = [];

  for (let r = 0; r < rounds; r++) {
    const round = [fixed, ...rotating];
    for (let i = 0; i < half; i++) {
      const h = round[i];
      const a = round[n - 1 - i];
      if (h !== -1 && a !== -1) games.push([h, a]);
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return games;
}
