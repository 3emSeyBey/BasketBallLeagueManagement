import { db } from "./client";
import {
  users, teams, seasons, players, matches, seasonTeams, announcements,
  divisions, finalsEliminations,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

type RosterEntry = {
  name: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  height: string;
};

const ROSTER_TEMPLATES: Record<string, RosterEntry[]> = {
  "Bantayan Sharks": [
    { name: "LeBron James",          position: "SF", height: `6'9"`  },
    { name: "Stephen Curry",         position: "PG", height: `6'2"`  },
    { name: "Kevin Durant",          position: "SF", height: `6'11"` },
    { name: "Giannis Antetokounmpo", position: "PF", height: `6'11"` },
    { name: "Nikola Jokic",          position: "C",  height: `6'11"` },
    { name: "Luka Doncic",           position: "PG", height: `6'7"`  },
    { name: "Joel Embiid",           position: "C",  height: `7'0"`  },
    { name: "Jayson Tatum",          position: "SF", height: `6'8"`  },
    { name: "Damian Lillard",        position: "PG", height: `6'2"`  },
    { name: "Anthony Davis",         position: "PF", height: `6'10"` },
  ],
  "Madridejos Warriors": [
    { name: "Michael Jordan",        position: "SG", height: `6'6"`  },
    { name: "Kobe Bryant",           position: "SG", height: `6'6"`  },
    { name: "Magic Johnson",         position: "PG", height: `6'9"`  },
    { name: "Larry Bird",            position: "SF", height: `6'9"`  },
    { name: "Kareem Abdul-Jabbar",   position: "C",  height: `7'2"`  },
    { name: "Tim Duncan",            position: "PF", height: `6'11"` },
    { name: "Shaquille O'Neal",      position: "C",  height: `7'1"`  },
    { name: "Hakeem Olajuwon",       position: "C",  height: `7'0"`  },
    { name: "Bill Russell",          position: "C",  height: `6'10"` },
    { name: "Wilt Chamberlain",      position: "C",  height: `7'1"`  },
  ],
  "Santa Fe Eagles": [
    { name: "Robert Jaworski",       position: "PG", height: `6'1"`  },
    { name: "Allan Caidic",          position: "SG", height: `6'2"`  },
    { name: "Alvin Patrimonio",      position: "PF", height: `6'4"`  },
    { name: "Benjie Paras",          position: "C",  height: `6'8"`  },
    { name: "Ramon Fernandez",       position: "C",  height: `6'5"`  },
    { name: "Atoy Co",               position: "SG", height: `5'10"` },
    { name: "Samboy Lim",            position: "SG", height: `6'3"`  },
    { name: "Bogs Adornado",         position: "SF", height: `6'4"`  },
    { name: "Francis Arnaiz",        position: "SG", height: `6'2"`  },
    { name: "Vince Hizon",           position: "SF", height: `6'7"`  },
  ],
  "Bantayan Bulls": [
    { name: "June Mar Fajardo",      position: "C",  height: `6'10"` },
    { name: "Jayson Castro",         position: "PG", height: `5'11"` },
    { name: "James Yap",             position: "SG", height: `6'2"`  },
    { name: "LA Tenorio",            position: "PG", height: `5'9"`  },
    { name: "Marc Pingris",          position: "PF", height: `6'4"`  },
    { name: "Asi Taulava",           position: "C",  height: `6'9"`  },
    { name: "Calvin Abueva",         position: "PF", height: `6'2"`  },
    { name: "Paul Lee",              position: "SG", height: `5'10"` },
    { name: "Greg Slaughter",        position: "C",  height: `7'0"`  },
    { name: "Jimmy Alapag",          position: "PG", height: `5'9"`  },
  ],
};

const TEAM_TO_MANAGER: Record<string, { email: string; username: string; name: string; contactNumber: string }> = {
  "Bantayan Sharks":     { email: "manager@league.test",   username: "sharks_mgr",   name: "Sharks Manager",   contactNumber: "+63 911 111 1111" },
  "Madridejos Warriors": { email: "warriors@league.test",  username: "warriors_mgr", name: "Warriors Manager", contactNumber: "+63 922 222 2222" },
  "Santa Fe Eagles":     { email: "eagles@league.test",    username: "eagles_mgr",   name: "Eagles Manager",   contactNumber: "+63 933 333 3333" },
  "Bantayan Bulls":      { email: "bulls@league.test",     username: "bulls_mgr",    name: "Bulls Manager",    contactNumber: "+63 944 444 4444" },
};

function fakePhone(): string {
  const n = String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9);
  return `+63 9${n.slice(0,2)} ${n.slice(2,5)} ${n.slice(5)}`;
}

function randomScore(): { home: number; away: number } {
  const home = 85 + Math.floor(Math.random() * 25);
  const away = home - (2 + Math.floor(Math.random() * 11));
  // ~40% chance to flip the result
  if (Math.random() < 0.4) return { home: away, away: home };
  return { home, away };
}

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const tmHash = await bcrypt.hash("manager123", 10);

  await db.insert(seasons).values([
    {
      name: "Season 2025",
      startedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ended",
    },
    {
      name: "Season 2026",
      startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
  ]).onConflictDoNothing();
  await db.update(seasons).set({ status: "active" }).where(eq(seasons.name, "Season 2026"));
  await db.update(seasons).set({ status: "ended" }).where(eq(seasons.name, "Season 2025"));

  await db.insert(teams).values([
    { name: "Bantayan Sharks", division: "A" },
    { name: "Madridejos Warriors", division: "A" },
    { name: "Santa Fe Eagles", division: "B" },
    { name: "Bantayan Bulls", division: "B" },
  ]).onConflictDoNothing();

  await db.insert(users).values({
    email: "admin@league.test",
    username: "admin",
    name: "League Admin",
    contactNumber: "+63 900 000 0000",
    passwordHash: adminHash,
    role: "admin",
  }).onConflictDoNothing();

  const allTeams = await db.select().from(teams);

  for (const team of allTeams) {
    const mgr = TEAM_TO_MANAGER[team.name];
    if (!mgr) continue;
    await db.insert(users).values({
      email: mgr.email,
      username: mgr.username,
      name: mgr.name,
      contactNumber: mgr.contactNumber,
      passwordHash: tmHash,
      role: "team_manager",
      teamId: team.id,
    }).onConflictDoNothing();
    await db.update(users).set({ teamId: team.id }).where(eq(users.email, mgr.email));
  }

  for (const team of allTeams) {
    const roster = ROSTER_TEMPLATES[team.name];
    if (!roster) continue;
    await db.delete(players).where(eq(players.teamId, team.id));
    await db.insert(players).values(
      roster.map((p, idx) => ({
        teamId: team.id,
        name: p.name,
        jerseyNumber: idx + 1,
        position: p.position,
        height: p.height,
        contactNumber: fakePhone(),
      })),
    );
  }

  // Tidy stale seasons from earlier prototypes
  await db.delete(seasons).where(eq(seasons.name, "Regular Season 2026"));
  await db.delete(seasons).where(eq(seasons.name, "Playoffs 2026"));

  const adminUser = await db.query.users.findFirst({ where: eq(users.role, "admin") });
  if (!adminUser) throw new Error("Admin user not seeded");

  const season2025 = await db.query.seasons.findFirst({ where: eq(seasons.name, "Season 2025") });
  const season2026 = await db.query.seasons.findFirst({ where: eq(seasons.name, "Season 2026") });
  if (!season2025 || !season2026) throw new Error("Seasons not seeded");

  // Wipe announcements created by previous bracket runs
  await db.delete(announcements);

  // Group teams: 2 in Division East, 2 in Division West (mirrors NBA conferences)
  const divisionAssignments: Record<string, string> = {
    "Bantayan Sharks":     "Division East",
    "Madridejos Warriors": "Division East",
    "Santa Fe Eagles":     "Division West",
    "Bantayan Bulls":      "Division West",
  };

  await seedSeason({
    season: season2025,
    teams: allTeams,
    divisionAssignments,
    adminId: adminUser.id,
    completion: "all",
    startDaysAgo: 60,
  });

  await seedSeason({
    season: season2026,
    teams: allTeams,
    divisionAssignments,
    adminId: adminUser.id,
    completion: "ongoing",
    startDaysAgo: 7,
  });

  console.log("Seed complete.");
}

type Completion = "all" | "ongoing";

async function seedSeason(opts: {
  season: { id: number; name: string };
  teams: { id: number; name: string }[];
  divisionAssignments: Record<string, string>;
  adminId: number;
  completion: Completion;
  startDaysAgo: number;
}) {
  const { season, teams: teamRows, divisionAssignments, adminId, completion, startDaysAgo } = opts;
  const dayMs = 24 * 60 * 60 * 1000;

  // Reset
  await db.delete(matches).where(eq(matches.seasonId, season.id));
  await db.delete(seasonTeams).where(eq(seasonTeams.seasonId, season.id));
  await db.delete(divisions).where(eq(divisions.seasonId, season.id));
  await db.delete(finalsEliminations).where(eq(finalsEliminations.seasonId, season.id));

  // Create divisions
  const divNames = Array.from(new Set(Object.values(divisionAssignments)));
  await db.insert(divisions).values(divNames.map(name => ({ seasonId: season.id, name })));
  const divRows = await db.select().from(divisions).where(eq(divisions.seasonId, season.id));
  const divIdByName = new Map(divRows.map(d => [d.name, d.id]));

  // Enroll teams into their divisions
  const teamsByDivision: Record<string, { id: number; name: string }[]> = {};
  for (const t of teamRows) {
    const divName = divisionAssignments[t.name];
    if (!divName) continue;
    const divisionId = divIdByName.get(divName)!;
    await db.insert(seasonTeams).values({
      seasonId: season.id,
      teamId: t.id,
      divisionId,
    });
    if (!teamsByDivision[divName]) teamsByDivision[divName] = [];
    teamsByDivision[divName].push(t);
  }

  // For each division, create a single pool match between its 2 teams.
  const divisionWinnersByName: Record<string, { id: number; name: string }> = {};
  for (const divName of divNames) {
    const divisionId = divIdByName.get(divName)!;
    const list = teamsByDivision[divName];
    if (!list || list.length < 2) continue;
    const [home, away] = list;

    const scheduledAt = new Date(Date.now() - (startDaysAgo - 1) * dayMs).toISOString();
    const [poolMatch] = await db.insert(matches).values({
      seasonId: season.id,
      divisionId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      scheduledAt,
      venue: "Bantayan Sports Complex",
      stage: "pool",
      round: 1,
      isDivisionFinal: true, // 2-team division: pool match is also the final
      agoraChannel: `match-${season.id}-${divisionId}-pool`,
    }).returning();

    if (completion === "all" || completion === "ongoing") {
      // For both completed and ongoing: finalize divisional pool matches.
      const score = randomScore();
      const winner = score.home >= score.away ? home : away;
      const loser = winner.id === home.id ? away : home;
      await db.update(matches).set({
        homeScore: score.home,
        awayScore: score.away,
        status: "final",
      }).where(eq(matches.id, poolMatch.id));

      await db.insert(announcements).values({
        title: `${winner.name} take ${divName} in ${season.name}`,
        body: `<p><strong>${winner.name}</strong> defeated <strong>${loser.name}</strong> ${Math.max(score.home, score.away)}–${Math.min(score.home, score.away)} to win ${divName}.</p>`,
        createdBy: adminId,
      });

      divisionWinnersByName[divName] = winner;
    }
  }

  // Build Finals: a single match between the two division winners.
  const winnerEntries = Object.entries(divisionWinnersByName);
  if (winnerEntries.length === 2) {
    const [w1, w2] = winnerEntries.map(([, t]) => t);
    const finalsScheduledAt = new Date(Date.now() - (startDaysAgo - 14) * dayMs).toISOString();

    if (completion === "all") {
      // Past Finals — finalize.
      const [finalsMatch] = await db.insert(matches).values({
        seasonId: season.id,
        divisionId: null,
        homeTeamId: w1.id,
        awayTeamId: w2.id,
        scheduledAt: finalsScheduledAt,
        venue: "Bantayan Sports Complex",
        stage: "final",
        round: 1,
        isSeasonFinal: true,
        agoraChannel: `match-${season.id}-finals`,
      }).returning();

      const score = randomScore();
      const champion = score.home >= score.away ? w1 : w2;
      const runnerUp = champion.id === w1.id ? w2 : w1;
      await db.update(matches).set({
        homeScore: score.home,
        awayScore: score.away,
        status: "final",
      }).where(eq(matches.id, finalsMatch.id));

      await db.insert(announcements).values({
        title: `${champion.name} crowned ${season.name} champions`,
        body: `<p>🏆 <strong>${champion.name}</strong> beat <strong>${runnerUp.name}</strong> ${Math.max(score.home, score.away)}–${Math.min(score.home, score.away)} in the Finals!</p>`,
        createdBy: adminId,
      });
    } else {
      // Ongoing — schedule a Finals match in the future, both teams set, status=scheduled.
      const futureFinals = new Date(Date.now() + 7 * dayMs).toISOString();
      await db.insert(matches).values({
        seasonId: season.id,
        divisionId: null,
        homeTeamId: w1.id,
        awayTeamId: w2.id,
        scheduledAt: futureFinals,
        venue: "Bantayan Sports Complex",
        stage: "final",
        round: 1,
        isSeasonFinal: true,
        agoraChannel: `match-${season.id}-finals`,
      });
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
