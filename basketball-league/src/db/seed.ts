import { db } from "./client";
import {
  users,
  teams,
  seasons,
  players,
  matches,
  announcements,
  divisions,
  brackets,
  bracketMatches,
} from "./schema";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createBracket, autoPlaceTeam, advanceWinner, loadBracketTree } from "@/lib/bracket-service";
import { dominantHex } from "@/lib/image-color";

// Demo logo so the bracket's logo + color-tint feature is visible after seeding.
async function setTeamLogo(teamName: string, assetFile: string, mime: string) {
  try {
    const buf = await readFile(path.join(process.cwd(), "src/db/assets", assetFile));
    const logoColor = await dominantHex(buf);
    await db.update(teams).set({ imageMimeType: mime, imageData: buf, logoColor }).where(eq(teams.name, teamName));
  } catch (e) {
    console.warn(`logo seed skipped for ${teamName}:`, (e as Error).message);
  }
}

type Position = "PG" | "SG" | "SF" | "PF" | "C";
type RosterEntry = { name: string; position: Position; height: string };

const ORIGINAL_ROSTERS: Record<string, RosterEntry[]> = {
  "Bantayan Sharks": [
    { name: "LeBron James", position: "SF", height: `6'9"` },
    { name: "Stephen Curry", position: "PG", height: `6'2"` },
    { name: "Kevin Durant", position: "SF", height: `6'11"` },
    { name: "Giannis Antetokounmpo", position: "PF", height: `6'11"` },
    { name: "Nikola Jokic", position: "C", height: `6'11"` },
    { name: "Luka Doncic", position: "PG", height: `6'7"` },
    { name: "Joel Embiid", position: "C", height: `7'0"` },
    { name: "Jayson Tatum", position: "SF", height: `6'8"` },
    { name: "Damian Lillard", position: "PG", height: `6'2"` },
    { name: "Anthony Davis", position: "PF", height: `6'10"` },
  ],
  "Madridejos Warriors": [
    { name: "Michael Jordan", position: "SG", height: `6'6"` },
    { name: "Kobe Bryant", position: "SG", height: `6'6"` },
    { name: "Magic Johnson", position: "PG", height: `6'9"` },
    { name: "Larry Bird", position: "SF", height: `6'9"` },
    { name: "Kareem Abdul-Jabbar", position: "C", height: `7'2"` },
    { name: "Tim Duncan", position: "PF", height: `6'11"` },
    { name: "Shaquille O'Neal", position: "C", height: `7'1"` },
    { name: "Hakeem Olajuwon", position: "C", height: `7'0"` },
    { name: "Bill Russell", position: "C", height: `6'10"` },
    { name: "Wilt Chamberlain", position: "C", height: `7'1"` },
  ],
  "Santa Fe Eagles": [
    { name: "Robert Jaworski", position: "PG", height: `6'1"` },
    { name: "Allan Caidic", position: "SG", height: `6'2"` },
    { name: "Alvin Patrimonio", position: "PF", height: `6'4"` },
    { name: "Benjie Paras", position: "C", height: `6'8"` },
    { name: "Ramon Fernandez", position: "C", height: `6'5"` },
    { name: "Atoy Co", position: "SG", height: `5'10"` },
    { name: "Samboy Lim", position: "SG", height: `6'3"` },
    { name: "Bogs Adornado", position: "SF", height: `6'4"` },
    { name: "Francis Arnaiz", position: "SG", height: `6'2"` },
    { name: "Vince Hizon", position: "SF", height: `6'7"` },
  ],
  "Bantayan Bulls": [
    { name: "June Mar Fajardo", position: "C", height: `6'10"` },
    { name: "Jayson Castro", position: "PG", height: `5'11"` },
    { name: "James Yap", position: "SG", height: `6'2"` },
    { name: "LA Tenorio", position: "PG", height: `5'9"` },
    { name: "Marc Pingris", position: "PF", height: `6'4"` },
    { name: "Asi Taulava", position: "C", height: `6'9"` },
    { name: "Calvin Abueva", position: "PF", height: `6'2"` },
    { name: "Paul Lee", position: "SG", height: `5'10"` },
    { name: "Greg Slaughter", position: "C", height: `7'0"` },
    { name: "Jimmy Alapag", position: "PG", height: `5'9"` },
  ],
};

const FIRST_NAMES = [
  "Aaron", "Bryan", "Carlo", "Dennis", "Edmond", "Felix", "Gabriel", "Hector",
  "Ian", "Jose", "Kris", "Leo", "Marco", "Noah", "Oscar", "Paolo",
  "Quirino", "Rafael", "Samuel", "Tomas", "Uriel", "Victor", "Warren", "Xavier",
  "Yuri", "Zach", "Adrian", "Brent", "Cyril", "Dario",
];
const LAST_NAMES = [
  "Reyes", "Cruz", "Santos", "Garcia", "Mendoza", "Ramos", "Rivera", "Torres",
  "Aguilar", "Bautista", "Castro", "Domingo", "Espino", "Fajardo", "Gonzaga",
  "Hidalgo", "Iglesias", "Jimenez", "Kintanar", "Lazaro", "Mariano", "Navarro",
  "Ocampo", "Padilla", "Quito", "Rosales", "Salonga", "Tagaro", "Uy", "Velasco",
];
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const HEIGHTS = [
  `5'9"`, `5'10"`, `5'11"`, `6'0"`, `6'1"`, `6'2"`, `6'3"`, `6'4"`, `6'5"`,
  `6'6"`, `6'7"`, `6'8"`, `6'9"`, `6'10"`, `6'11"`,
];

let nameCounter = 0;
function generateRoster(): RosterEntry[] {
  const out: RosterEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const fn = FIRST_NAMES[(nameCounter * 7 + i * 3) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(nameCounter * 11 + i * 5) % LAST_NAMES.length];
    out.push({
      name: `${fn} ${ln}`,
      position: POSITIONS[i % POSITIONS.length],
      height: HEIGHTS[(nameCounter + i * 2) % HEIGHTS.length],
    });
    nameCounter++;
  }
  return out;
}

function fakePhone(): string {
  const n = String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9);
  return `+63 9${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

function randomScore(): { home: number; away: number } {
  const home = 85 + Math.floor(Math.random() * 25);
  const away = home - (2 + Math.floor(Math.random() * 11));
  if (Math.random() < 0.4) return { home: away, away: home };
  return { home, away };
}

const VENUE = "Bantayan Sports Complex";
const dayMs = 24 * 60 * 60 * 1000;

const MANAGERS: Record<string, { email: string; username: string; name: string }> = {
  "Bantayan Sharks": { email: "manager@league.test", username: "sharks_mgr", name: "Sharks Manager" },
  "Madridejos Warriors": { email: "warriors@league.test", username: "warriors_mgr", name: "Warriors Manager" },
  "Santa Fe Eagles": { email: "eagles@league.test", username: "eagles_mgr", name: "Eagles Manager" },
  "Bantayan Bulls": { email: "bulls@league.test", username: "bulls_mgr", name: "Bulls Manager" },
};

// Division name -> team names. Four teams per division keeps a clean 2-round bracket.
const SEASON_2026_DIVISIONS: Record<string, string[]> = {
  North: ["Bantayan Sharks", "Cebu Cyclones", "Mandaue Mavericks", "Lapulapu Legends"],
  South: ["Madridejos Warriors", "Talisay Titans", "Toledo Tribunes", "Naga Nighthawks"],
  East: ["Santa Fe Eagles", "Carcar Crusaders", "Argao Aces", "Dalaguete Dragons"],
  West: ["Bantayan Bulls", "Oslob Outlaws", "Moalboal Marlins", "Tabuelan Tigers"],
};

const SEASON_2025_DIVISIONS: Record<string, string[]> = {
  Open: ["Cebu Classic '25", "Mactan Masters '25", "Liloan Lions '25", "Minglanilla Monarchs '25"],
};

async function createPlayers(teamId: number, teamName: string) {
  const roster = ORIGINAL_ROSTERS[teamName] ?? generateRoster();
  await db.insert(players).values(
    roster.map((p, idx) => ({
      teamId,
      name: p.name,
      jerseyNumber: idx + 1,
      position: p.position,
      height: p.height,
      contactNumber: fakePhone(),
    })),
  );
}

async function playMatch(matchId: number, scheduledAt: string) {
  const score = randomScore();
  await db.update(matches)
    .set({ homeScore: score.home, awayScore: score.away, status: "ended", scheduledAt, venue: VENUE })
    .where(eq(matches.id, matchId));
  await advanceWinner(db, matchId);
}

// Build a division: create teams (auto-placed into a default published bracket),
// players, then optionally play it out.
async function seedDivision(opts: {
  seasonId: number;
  divisionName: string;
  teamNames: string[];
  managerHash: string;
  play: "all" | "round1" | "none";
  startDaysAgo: number;
  adminId: number;
}): Promise<{ championName: string | null }> {
  const { seasonId, divisionName, teamNames, managerHash, play, startDaysAgo, adminId } = opts;

  const [division] = await db.insert(divisions).values({ seasonId, name: divisionName }).returning();
  const bracket = await createBracket(db, {
    divisionId: division.id,
    title: `${divisionName} Bracket`,
    isDefault: true,
  });

  const teamIdByName = new Map<string, number>();
  for (const name of teamNames) {
    const [team] = await db.insert(teams).values({ name, divisionId: division.id }).returning();
    teamIdByName.set(name, team.id);
    await createPlayers(team.id, name);
    // Attach a manager for the headline teams.
    const mgr = MANAGERS[name];
    if (mgr) {
      await db.insert(users).values({
        email: mgr.email, username: mgr.username, name: mgr.name,
        contactNumber: fakePhone(), passwordHash: managerHash,
        role: "team_manager", teamId: team.id,
      }).onConflictDoNothing();
    }
    // New team joins the default bracket's round 1 automatically.
    await autoPlaceTeam(db, division.id, team.id);
  }

  await db.update(brackets).set({ isPublished: true }).where(eq(brackets.id, bracket.id));

  if (play === "none") return { championName: null };

  // Play round 1, then (optionally) the final, using the bracket structure.
  const teamName = new Map([...teamIdByName.entries()].map(([n, id]) => [id, n]));
  const r1At = new Date(Date.now() - startDaysAgo * dayMs).toISOString();
  let tree = await loadBracketTree(db, bracket.id);
  for (const box of tree.rounds[0] ?? []) {
    if (box.homeTeamId && box.awayTeamId) await playMatch(box.matchId, r1At);
  }

  let championName: string | null = null;
  if (play === "all") {
    const finalAt = new Date(Date.now() - (startDaysAgo - 5) * dayMs).toISOString();
    tree = await loadBracketTree(db, bracket.id); // reload: winners advanced into the final box
    const finalRound = tree.rounds[tree.rounds.length - 1] ?? [];
    for (const box of finalRound) {
      if (box.homeTeamId && box.awayTeamId) {
        await playMatch(box.matchId, finalAt);
        const fresh = await db.query.matches.findFirst({ where: eq(matches.id, box.matchId) });
        if (fresh) {
          const winnerId = fresh.homeScore > fresh.awayScore ? fresh.homeTeamId : fresh.awayTeamId;
          championName = winnerId ? teamName.get(winnerId) ?? null : null;
        }
      }
    }
    if (championName) {
      await db.insert(announcements).values({
        title: `${championName} win the ${divisionName} bracket`,
        body: `<p>🏆 <strong>${championName}</strong> are the ${divisionName} champions.</p>`,
        createdBy: adminId,
      });
    }
  }
  return { championName };
}

async function main() {
  // Clean slate (children cascade from seasons; teams/brackets cascade from divisions).
  await db.delete(announcements);
  await db.delete(bracketMatches);
  await db.delete(brackets);
  await db.delete(matches);
  await db.delete(players);
  await db.update(users).set({ teamId: null });
  await db.delete(teams);
  await db.delete(divisions);
  await db.delete(seasons);
  await db.delete(users);

  const adminHash = await bcrypt.hash("admin123", 10);
  const managerHash = await bcrypt.hash("manager123", 10);

  const [admin] = await db.insert(users).values({
    email: "admin@league.test", username: "admin", name: "League Admin",
    contactNumber: "+63 900 000 0000", passwordHash: adminHash, role: "admin",
  }).returning();

  // Season 2026 — active. Each division has a published default bracket; round 1
  // already played in every division, finals still upcoming.
  const [s2026] = await db.insert(seasons).values({
    name: "Season 2026",
    startedAt: new Date(Date.now() - 14 * dayMs).toISOString(),
    status: "active",
  }).returning();

  for (const [divisionName, teamNames] of Object.entries(SEASON_2026_DIVISIONS)) {
    await seedDivision({
      seasonId: s2026.id, divisionName, teamNames, managerHash,
      play: "round1", startDaysAgo: 3, adminId: admin.id,
    });
  }

  // Season 2025 — ended, fully played with a crowned champion.
  const [s2025] = await db.insert(seasons).values({
    name: "Season 2025",
    startedAt: new Date(Date.now() - 365 * dayMs).toISOString(),
    endedAt: new Date(Date.now() - 300 * dayMs).toISOString(),
    status: "ended",
  }).returning();

  for (const [divisionName, teamNames] of Object.entries(SEASON_2025_DIVISIONS)) {
    await seedDivision({
      seasonId: s2025.id, divisionName, teamNames, managerHash: await bcrypt.hash("x", 4),
      play: "all", startDaysAgo: 310, adminId: admin.id,
    });
  }

  await setTeamLogo("Bantayan Sharks", "bantayan-sharks.png", "image/png");

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
