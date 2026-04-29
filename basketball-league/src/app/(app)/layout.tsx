import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await db
    .select({ username: users.username, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .then(rows => rows[0]);
  const display = me?.username ?? me?.email ?? "user";
  return (
    <div>
      <AppNav role={session.role} username={display} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
