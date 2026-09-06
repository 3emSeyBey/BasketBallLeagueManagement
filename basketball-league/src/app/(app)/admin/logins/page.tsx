import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { getSession } from "@/lib/session";
import { loginCountsByUser } from "@/lib/audit";
import { Card } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function LoginStatsPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const rows = await loginCountsByUser(db);
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Login Stats</h1>
          <p className="text-sm text-muted-foreground">Successful logins per user.</p>
        </div>
        <Link href="/admin/audit" className="text-sm text-primary hover:underline">← Audit log</Link>
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
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No logins recorded yet.</TableCell></TableRow>
            )}
            {sorted.map((r) => (
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
