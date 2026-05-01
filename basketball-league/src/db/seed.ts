import { db } from "./client";
import {
  users,
  teams,
  seasons,
  players,
  matches,
  seasonTeams,
  announcements,
  divisions,
  teamDivisions,
  finalsEliminations,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

type RosterEntry = {
  name: string;
  position: Position;
  height: string;
};

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

const LEAGUE_DIVISIONS = ["North", "South", "East", "West"] as const;
type LeagueDivision = (typeof LEAGUE_DIVISIONS)[number];

const TEAMS_BY_DIVISION: Record<LeagueDivision, string[]> = {
  North: [
    "Bantayan Sharks",
    "Cebu Cyclones",
    "Mandaue Mavericks",
    "Lapulapu Legends",
  ],
  South: [
    "Madridejos Warriors",
    "Talisay Titans",
    "Toledo Tribunes",
    "Naga Nighthawks",
  ],
  East: [
    "Santa Fe Eagles",
    "Carcar Crusaders",
    "Argao Aces",
    "Dalaguete Dragons",
    "Borbon Bears",
    "Dumanjug Devils",
    "Tuburan Thunders",
    "Sogod Storm",
  ],
  West: [
    "Bantayan Bulls",
    "Oslob Outlaws",
    "Moalboal Marlins",
    "Tabuelan Tigers",
  ],
};

const TEAM_TO_MANAGER: Record<
  string,
  { email: string; username: string; name: string; contactNumber: string }
> = {
  "Bantayan Sharks": {
    email: "manager@league.test",
    username: "sharks_mgr",
    name: "Sharks Manager",
    contactNumber: "+63 911 111 1111",
  },
  "Madridejos Warriors": {
    email: "warriors@league.test",
    username: "warriors_mgr",
    name: "Warriors Manager",
    contactNumber: "+63 922 222 2222",
  },
  "Santa Fe Eagles": {
    email: "eagles@league.test",
    username: "eagles_mgr",
    name: "Eagles Manager",
    contactNumber: "+63 933 333 3333",
  },
  "Bantayan Bulls": {
    email: "bulls@league.test",
    username: "bulls_mgr",
    name: "Bulls Manager",
    contactNumber: "+63 944 444 4444",
  },
};

function fakePhone(): string {
  const n = String(Math.floor(100000000 + Math.random() * 899999999)).slice(
    0,
    9,
  );
  return `+63 9${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

function randomScore(): { home: number; away: number } {
  const home = 85 + Math.floor(Math.random() * 25);
  const away = home - (2 + Math.floor(Math.random() * 11));
  if (Math.random() < 0.4) return { home: away, away: home };
  return { home, away };
}

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const tmHash = await bcrypt.hash("manager123", 10);

  // 1. Seasons
  await db
    .insert(seasons)
    .values([
      {
        name: "Season 2025",
        startedAt: new Date(
          Date.now() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endedAt: new Date(
          Date.now() - 300 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: "ended",
      },
      {
        name: "Season 2026",
        startedAt: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: "active",
      },
    ])
    .onConflictDoNothing();
  await db
    .update(seasons)
    .set({ status: "active" })
    .where(eq(seasons.name, "Season 2026"));
  await db
    .update(seasons)
    .set({ status: "ended" })
    .where(eq(seasons.name, "Season 2025"));

  // 2. League divisions (global)
  await db
    .insert(teamDivisions)
    .values(LEAGUE_DIVISIONS.map((name) => ({ name })))
    .onConflictDoNothing();

  // 3. Teams (assigned to global divisions)
  const allTeamRows: { name: string; division: string }[] = [];
  for (const div of LEAGUE_DIVISIONS) {
    for (const teamName of TEAMS_BY_DIVISION[div]) {
      allTeamRows.push({ name: teamName, division: div });
    }
  }
  await db.insert(teams).values(allTeamRows).onConflictDoNothing();

  // Make sure existing teams' division text matches new layout
  for (const t of allTeamRows) {
    await db
      .update(teams)
      .set({ division: t.division })
      .where(eq(teams.name, t.name));
  }

  // 4. Admin user
  await db
    .insert(users)
    .values({
      email: "admin@league.test",
      username: "admin",
      name: "League Admin",
      contactNumber: "+63 900 000 0000",
      passwordHash: adminHash,
      role: "admin",
    })
    .onConflictDoNothing();

  const allTeams = await db.select().from(teams);

  // 5. Managers — only original four teams keep human-named managers
  for (const team of allTeams) {
    const mgr = TEAM_TO_MANAGER[team.name];
    if (!mgr) continue;
    await db
      .insert(users)
      .values({
        email: mgr.email,
        username: mgr.username,
        name: mgr.name,
        contactNumber: mgr.contactNumber,
        passwordHash: tmHash,
        role: "team_manager",
        teamId: team.id,
      })
      .onConflictDoNothing();
    await db
      .update(users)
      .set({ teamId: team.id })
      .where(eq(users.email, mgr.email));
  }

  // 6. Players — original rosters or generated
  for (const team of allTeams) {
    const roster = ORIGINAL_ROSTERS[team.name] ?? generateRoster();
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

  // Tidy stale seasons
  await db.delete(seasons).where(eq(seasons.name, "Regular Season 2026"));
  await db.delete(seasons).where(eq(seasons.name, "Playoffs 2026"));

  const adminUser = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });
  if (!adminUser) throw new Error("Admin user not seeded");

  const season2025 = await db.query.seasons.findFirst({
    where: eq(seasons.name, "Season 2025"),
  });
  const season2026 = await db.query.seasons.findFirst({
    where: eq(seasons.name, "Season 2026"),
  });
  if (!season2025 || !season2026) throw new Error("Seasons not seeded");

  await db.delete(announcements);

  // Map teams by name → row for quick lookup in seedSeason
  const teamsByName = new Map(allTeams.map((t) => [t.name, t]));

  await seedSeason({
    season: season2025,
    teamsByName,
    adminId: adminUser.id,
    completion: "all",
    startDaysAgo: 60,
  });

  await seedSeason({
    season: season2026,
    teamsByName,
    adminId: adminUser.id,
    completion: "ongoing",
    startDaysAgo: 14,
  });

  console.log("Seed complete.");
}

type Completion = "all" | "ongoing";

type SeasonTeam = { id: number; name: string };

async function seedSeason(opts: {
  season: { id: number; name: string };
  teamsByName: Map<string, SeasonTeam>;
  adminId: number;
  completion: Completion;
  startDaysAgo: number;
}) {
  const { season, teamsByName, adminId, completion, startDaysAgo } = opts;
  const dayMs = 24 * 60 * 60 * 1000;

  // Reset season state
  await db.delete(matches).where(eq(matches.seasonId, season.id));
  await db.delete(seasonTeams).where(eq(seasonTeams.seasonId, season.id));
  await db.delete(divisions).where(eq(divisions.seasonId, season.id));
  await db
    .delete(finalsEliminations)
    .where(eq(finalsEliminations.seasonId, season.id));

  // Create per-season divisions mirroring league divisions
  await db.insert(divisions).values(
    LEAGUE_DIVISIONS.map((name) => ({ seasonId: season.id, name })),
  );
  const divRows = await db
    .select()
    .from(divisions)
    .where(eq(divisions.seasonId, season.id));
  const divIdByName = new Map(divRows.map((d) => [d.name, d.id]));

  // Enroll teams per division
  for (const div of LEAGUE_DIVISIONS) {
    const divisionId = divIdByName.get(div)!;
    for (const teamName of TEAMS_BY_DIVISION[div]) {
      const team = teamsByName.get(teamName);
      if (!team) continue;
      await db.insert(seasonTeams).values({
        seasonId: season.id,
        teamId: team.id,
        divisionId,
      });
    }
  }

  // Per division: 4-team single-elimination bracket
  // Day startDaysAgo: 2 semis (stage='playoff')
  // Day (startDaysAgo - 5): division-final (stage='playoff', isDivisionFinal=true)
  const divisionWinners: Record<LeagueDivision, SeasonTeam | null> = {
    North: null,
    South: null,
    East: null,
    West: null,
  };

  for (const div of LEAGUE_DIVISIONS) {
    const divisionId = divIdByName.get(div)!;
    const teamNames = TEAMS_BY_DIVISION[div];
    const teamList = teamNames
      .map((n) => teamsByName.get(n))
      .filter((t): t is SeasonTeam => !!t);
    // Require power-of-2 team count (2, 4, 8, 16, ...)
    if (teamList.length < 2) continue;
    if ((teamList.length & (teamList.length - 1)) !== 0) continue;

    const totalRounds = Math.log2(teamList.length);
    let current: SeasonTeam[] = [...teamList];
    let resolvedWinner: SeasonTeam | null = null;

    for (let roundIdx = 1; roundIdx <= totalRounds; roundIdx++) {
      const isDivFinal = roundIdx === totalRounds;
      const past = startDaysAgo - 1 - (roundIdx - 1) * 5;
      // For ongoing seasons, push the division final into the future
      const scheduledAt =
        completion === "ongoing" && isDivFinal
          ? new Date(Date.now() + 5 * dayMs).toISOString()
          : new Date(Date.now() - past * dayMs).toISOString();

      const next: SeasonTeam[] = [];
      for (let pair = 0; pair < current.length; pair += 2) {
        const home = current[pair];
        const away = current[pair + 1];
        const [m] = await db
          .insert(matches)
          .values({
            seasonId: season.id,
            divisionId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            scheduledAt,
            venue: "Bantayan Sports Complex",
            stage: "playoff",
            round: roundIdx,
            isDivisionFinal: isDivFinal,
            agoraChannel: `match-${season.id}-${divisionId}-r${roundIdx}-${pair / 2}`,
          })
          .returning();

        const shouldFinalize =
          completion === "all" || !isDivFinal; // ongoing keeps only the div final scheduled

        if (shouldFinalize) {
          const score = randomScore();
          const winner = score.home >= score.away ? home : away;
          const loser = winner.id === home.id ? away : home;
          await db
            .update(matches)
            .set({
              homeScore: score.home,
              awayScore: score.away,
              status: "ended",
            })
            .where(eq(matches.id, m.id));
          next.push(winner);
          if (isDivFinal) {
            resolvedWinner = winner;
            await db.insert(announcements).values({
              title: `${winner.name} take ${div} in ${season.name}`,
              body: `<p><strong>${winner.name}</strong> defeated <strong>${loser.name}</strong> ${Math.max(score.home, score.away)}–${Math.min(score.home, score.away)} in the ${div} division final.</p>`,
              createdBy: adminId,
            });
          }
        } else {
          // ongoing + isDivFinal: leave scheduled, advance home tentatively
          next.push(home);
        }
      }
      current = next;
    }

    divisionWinners[div] = resolvedWinner ?? current[0] ?? null;
  }

  // Finals: 4-team SE between division winners
  // Semifinals: North vs South, East vs West (stage='playoff', divisionId=null)
  // Championship: stage='final', divisionId=null, isSeasonFinal=true
  const semisAt = new Date(
    Date.now() - (startDaysAgo - 12) * dayMs,
  ).toISOString();
  const champAt = new Date(
    Date.now() - (startDaysAgo - 18) * dayMs,
  ).toISOString();

  const wNorth = divisionWinners.North;
  const wSouth = divisionWinners.South;
  const wEast = divisionWinners.East;
  const wWest = divisionWinners.West;
  if (!wNorth || !wSouth || !wEast || !wWest) return;

  const [fSf1] = await db
    .insert(matches)
    .values({
      seasonId: season.id,
      divisionId: null,
      homeTeamId: wNorth.id,
      awayTeamId: wSouth.id,
      scheduledAt: semisAt,
      venue: "Bantayan Sports Complex",
      stage: "playoff",
      round: 3,
      agoraChannel: `match-${season.id}-finals-sf1`,
    })
    .returning();
  const [fSf2] = await db
    .insert(matches)
    .values({
      seasonId: season.id,
      divisionId: null,
      homeTeamId: wEast.id,
      awayTeamId: wWest.id,
      scheduledAt: semisAt,
      venue: "Bantayan Sports Complex",
      stage: "playoff",
      round: 3,
      agoraChannel: `match-${season.id}-finals-sf2`,
    })
    .returning();

  if (completion === "all") {
    const f1 = randomScore();
    const f2 = randomScore();
    const fSf1Winner = f1.home >= f1.away ? wNorth : wSouth;
    const fSf2Winner = f2.home >= f2.away ? wEast : wWest;
    await db
      .update(matches)
      .set({
        homeScore: f1.home,
        awayScore: f1.away,
        status: "ended",
      })
      .where(eq(matches.id, fSf1.id));
    await db
      .update(matches)
      .set({
        homeScore: f2.home,
        awayScore: f2.away,
        status: "ended",
      })
      .where(eq(matches.id, fSf2.id));

    const [champ] = await db
      .insert(matches)
      .values({
        seasonId: season.id,
        divisionId: null,
        homeTeamId: fSf1Winner.id,
        awayTeamId: fSf2Winner.id,
        scheduledAt: champAt,
        venue: "Bantayan Sports Complex",
        stage: "final",
        round: 4,
        isSeasonFinal: true,
        agoraChannel: `match-${season.id}-finals-champ`,
      })
      .returning();
    const cs = randomScore();
    const champion = cs.home >= cs.away ? fSf1Winner : fSf2Winner;
    const runnerUp =
      champion.id === fSf1Winner.id ? fSf2Winner : fSf1Winner;
    await db
      .update(matches)
      .set({ homeScore: cs.home, awayScore: cs.away, status: "ended" })
      .where(eq(matches.id, champ.id));
    await db.insert(announcements).values({
      title: `${champion.name} crowned ${season.name} champions`,
      body: `<p><strong>${champion.name}</strong> beat <strong>${runnerUp.name}</strong> ${Math.max(cs.home, cs.away)}–${Math.min(cs.home, cs.away)} in the Finals!</p>`,
      createdBy: adminId,
    });
  } else {
    // Ongoing: schedule championship in the future, both finals semis already inserted as scheduled.
    const futureAt = new Date(Date.now() + 7 * dayMs).toISOString();
    await db.insert(matches).values({
      seasonId: season.id,
      divisionId: null,
      homeTeamId: wNorth.id,
      awayTeamId: wEast.id,
      scheduledAt: futureAt,
      venue: "Bantayan Sports Complex",
      stage: "final",
      round: 4,
      isSeasonFinal: true,
      agoraChannel: `match-${season.id}-finals-champ`,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
