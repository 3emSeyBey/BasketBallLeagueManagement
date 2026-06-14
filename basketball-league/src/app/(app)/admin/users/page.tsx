import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, teams, divisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { DeleteUserButton } from "@/components/admin/DeleteUserButton";
import { ApproveUserButton } from "@/components/admin/ApproveUserButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  team_manager: "Team Manager",
};

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const initialRole: "admin" | "team_manager" =
    sp.role === "admin" ? "admin" : "team_manager";

  const [allUsers, allTeams, allDivisions] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      contactNumber: users.contactNumber,
      role: users.role,
      status: users.status,
      teamId: users.teamId,
      requestedTeamName: users.requestedTeamName,
      requestedDivisionId: users.requestedDivisionId,
      requestedTeamId: users.requestedTeamId,
    }).from(users),
    db.select().from(teams),
    db.select().from(divisions),
  ]);
  const teamById = new Map(allTeams.map(t => [t.id, t.name]));
  const divById = new Map(allDivisions.map(d => [d.id, d.name]));

  const pending = allUsers.filter(u => u.status === "pending");
  const activeUsers = allUsers.filter(u => u.status !== "pending");
  const requestLabel = (u: (typeof allUsers)[number]) => {
    if (u.requestedTeamId != null) return `Claim: ${teamById.get(u.requestedTeamId) ?? `team #${u.requestedTeamId}`}`;
    if (u.requestedTeamName) return `New team: ${u.requestedTeamName}${u.requestedDivisionId != null ? ` · ${divById.get(u.requestedDivisionId) ?? ""}` : ""}`;
    return "—";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">User Management</h1>

      {pending.length > 0 && (
        <Card className="p-6 space-y-4 border-amber-500/30">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Pending registrations</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">{pending.length}</span>
          </div>
          <ul className="divide-y rounded-md border">
            {pending.map(u => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}{u.username ? ` · @${u.username}` : ""} · {requestLabel(u)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ApproveUserButton userId={u.id} label={u.name || u.email} />
                  <DeleteUserButton userId={u.id} userLabel={u.name || u.email} assignedToTeam={false} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Create User</h2>
        <CreateUserForm initialRole={initialRole}/>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[960px]">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Username</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Role</th>
              <th className="p-3">Team</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.name || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.username ?? "—"}</td>
                <td className="p-3">{u.contactNumber ?? "—"}</td>
                <td className="p-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="p-3">{u.teamId ? teamById.get(u.teamId) : "—"}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <EditUserDialog user={{
                      id: u.id, email: u.email, username: u.username,
                      name: u.name, contactNumber: u.contactNumber,
                    }} />
                    {u.role === "team_manager" && (
                      <DeleteUserButton
                        userId={u.id}
                        userLabel={u.name || u.email}
                        assignedToTeam={u.teamId !== null}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
