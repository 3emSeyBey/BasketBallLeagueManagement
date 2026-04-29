import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { DeleteUserButton } from "@/components/admin/DeleteUserButton";

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

  const [allUsers, allTeams] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      contactNumber: users.contactNumber,
      role: users.role,
      teamId: users.teamId,
    }).from(users),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map(t => [t.id, t.name]));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">User Management</h1>
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
            {allUsers.map(u => (
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
