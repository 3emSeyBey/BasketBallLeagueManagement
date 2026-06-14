import { db } from "./client";
import { users, teams, seasons, players, matches, announcements, divisions, brackets, bracketMatches } from "./schema";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createBracket, autoPlaceTeam, advanceWinner, loadBracketTree } from "@/lib/bracket-service";
import { dominantHex } from "@/lib/image-color";

// A clean slate for the product-manual walkthrough: ONE admin account and one
// finished sample season ("Season 2025") with divisions, teams, rosters,
// played brackets (so standings + the archive look real). Everything else
// (the new season, managers, etc.) is created live during the walkthrough.

type Position = "PG" | "SG" | "SF" | "PF" | "C";
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const FIRST = ["Aaron", "Bryan", "Carlo", "Dennis", "Edmond", "Felix", "Gabriel", "Hector", "Ian", "Jose", "Kris", "Leo", "Marco", "Noah", "Oscar", "Paolo"];
const LAST = ["Reyes", "Cruz", "Santos", "Garcia", "Mendoza", "Ramos", "Rivera", "Torres", "Aguilar", "Bautista", "Castro", "Domingo", "Espino", "Fajardo"];
let nc = 0;
function roster(n = 8) {
  const out: { name: string; jerseyNumber: number; position: Position; height: string }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      name: `${FIRST[(nc * 7 + i * 3) % FIRST.length]} ${LAST[(nc * 11 + i * 5) % LAST.length]}`,
      jerseyNumber: i + 4,
      position: POSITIONS[i % POSITIONS.length],
      height: `6'${i % 12}"`,
    });
    nc++;
  }
  return out;
}

function randScore() {
  const home = 80 + ((nc * 3) % 25);
  const away = home - (3 + ((nc * 5) % 9));
  nc++;
  return { home, away };
}

const DIVS: Record<string, string[]> = {
  North: ["Bantayan Sharks", "Cebu Cyclones", "Mandaue Mavericks", "Lapulapu Legends"],
  South: ["Madridejos Warriors", "Talisay Titans", "Toledo Tribunes", "Naga Nighthawks"],
};

const dayMs = 86400000;

async function setLogo(teamName: string) {
  try {
    const buf = await readFile(path.join(process.cwd(), "src/db/assets/bantayan-sharks.png"));
    const logoColor = await dominantHex(buf);
    await db.update(teams).set({ imageMimeType: "image/png", imageData: buf, logoColor }).where(eq(teams.name, teamName));
  } catch { /* asset optional */ }
}

async function main() {
  // wipe
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

  const [admin] = await db.insert(users).values({
    email: "admin@league.test", username: "admin", name: "League Admin",
    contactNumber: "+63 900 000 0000", passwordHash: await bcrypt.hash("admin123", 10), role: "admin",
  }).returning();

  const [s2025] = await db.insert(seasons).values({
    name: "Season 2025",
    startedAt: new Date(Date.now() - 200 * dayMs).toISOString(),
    endedAt: new Date(Date.now() - 30 * dayMs).toISOString(),
    status: "ended",
  }).returning();

  for (const [divName, teamNames] of Object.entries(DIVS)) {
    const [division] = await db.insert(divisions).values({ seasonId: s2025.id, name: divName }).returning();
    const bracket = await createBracket(db, { divisionId: division.id, title: `${divName} Bracket`, isDefault: true });
    for (const name of teamNames) {
      const [team] = await db.insert(teams).values({ name, divisionId: division.id }).returning();
      await db.insert(players).values(roster().map((p) => ({ teamId: team.id, ...p })));
      await autoPlaceTeam(db, division.id, team.id);
    }
    await db.update(brackets).set({ isPublished: true }).where(eq(brackets.id, bracket.id));

    // play round 1, then the final
    const at = new Date(Date.now() - 60 * dayMs).toISOString();
    const play = async (matchId: number) => {
      const sc = randScore();
      await db.update(matches).set({ homeScore: sc.home, awayScore: sc.away, status: "ended", scheduledAt: at, venue: "Cebu Coliseum" }).where(eq(matches.id, matchId));
      await advanceWinner(db, matchId);
    };
    let tree = await loadBracketTree(db, bracket.id);
    for (const box of tree.rounds[0] ?? []) if (box.homeTeamId && box.awayTeamId) await play(box.matchId);
    tree = await loadBracketTree(db, bracket.id);
    const final = tree.rounds[tree.rounds.length - 1] ?? [];
    for (const box of final) if (box.homeTeamId && box.awayTeamId) {
      await play(box.matchId);
      const fresh = await db.query.matches.findFirst({ where: eq(matches.id, box.matchId) });
      const champ = fresh && (fresh.homeScore > fresh.awayScore ? fresh.homeTeamId : fresh.awayTeamId);
      if (champ) {
        const t = await db.query.teams.findFirst({ where: eq(teams.id, champ) });
        await db.insert(announcements).values({
          title: `${t?.name} win the ${divName} bracket`,
          body: `<p>🏆 <strong>${t?.name}</strong> are the ${divName} champions of Season 2025.</p>`,
          createdBy: admin.id,
        });
      }
    }
  }

  await setLogo("Bantayan Sharks");
  console.log("Presentation seed complete: 1 admin + Season 2025 (ended).");
}

main().catch((e) => { console.error(e); process.exit(1); });
