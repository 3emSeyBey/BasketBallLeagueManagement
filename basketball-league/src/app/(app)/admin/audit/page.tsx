import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { listAuditLog, loginCountsByUser } from "@/lib/audit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function formatAction(action: string) {
  return action.replace(".", " · ").replace(/_/g, " ");
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pageSize }, loginCounts] = await Promise.all([
    listAuditLog(db, page),
    loginCountsByUser(db),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sortedLoginCounts = [...loginCounts].sort((a, b) => b.count - a.count);

  const targetIds = [...new Set(rows.filter(r => r.targetType === "user" && r.targetId != null).map(r => r.targetId!))];
  const targetUsers = targetIds.length
    ? await db.select({ id: users.id, email: users.email }).from(users)
    : [];
  const emailById = new Map(targetUsers.map(u => [u.id, u.email]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">System Monitoring</h1>
        <p className="text-sm text-muted-foreground">Admin actions and manager writes across the app.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No events yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.actorLabel}</TableCell>
                <TableCell className="capitalize">{formatAction(r.action)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.targetType ? `${r.targetType} #${r.targetId}${r.targetType === "user" && r.targetId != null && emailById.has(r.targetId) ? ` (${emailById.get(r.targetId)})` : ""}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={r.outcome === "failure" ? "destructive" : "secondary"}>{r.outcome}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href={`/admin/audit?page=${page - 1}`}
            className={page <= 1 ? "pointer-events-none text-muted-foreground/40" : "text-primary hover:underline"}
          >← Prev</Link>
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <Link
            href={`/admin/audit?page=${page + 1}`}
            className={page >= totalPages ? "pointer-events-none text-muted-foreground/40" : "text-primary hover:underline"}
          >Next →</Link>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold">Login Stats</h2>
        <p className="text-sm text-muted-foreground">Successful logins per user.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Total logins</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLoginCounts.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No logins recorded yet.</TableCell></TableRow>
            )}
            {sortedLoginCounts.map((r) => (
              <TableRow key={r.actorId ?? r.actorLabel}>
                <TableCell>{r.actorLabel}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.lastLogin).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
