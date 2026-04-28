import { db } from "./client";
import { users, teams, seasons } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const tmHash = await bcrypt.hash("manager123", 10);

  await db.insert(seasons).values({ name: "Season 2026", startedAt: new Date().toISOString() }).onConflictDoNothing();

  await db.insert(teams).values([
    { name: "Bantayan Sharks", division: "A" },
    { name: "Madridejos Warriors", division: "A" },
    { name: "Santa Fe Eagles", division: "B" },
    { name: "Bantayan Bulls", division: "B" },
  ]).onConflictDoNothing();

  await db.insert(users).values([
    { email: "admin@league.test", passwordHash: adminHash, role: "admin" },
    { email: "manager@league.test", passwordHash: tmHash, role: "team_manager", teamId: 1 },
  ]).onConflictDoNothing();

  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
