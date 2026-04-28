import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function AdminUsers() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");
  const [allUsers, allTeams] = await Promise.all([
    db.select({ id: users.id, email: users.email, role: users.role, teamId: users.teamId }).from(users),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map(t => [t.id, t.name]));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">User Management</h1>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Create User</h2>
        <CreateUserForm teams={allTeams}/>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Team</th></tr>
          </thead>
          <tbody>
            {allUsers.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.teamId ? teamById.get(u.teamId) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
