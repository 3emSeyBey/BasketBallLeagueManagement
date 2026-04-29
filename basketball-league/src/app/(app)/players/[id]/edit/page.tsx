import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";
import { PlayerEditForm } from "@/components/players/PlayerEditForm";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();

  const player = await db.select({
    id: players.id,
    teamId: players.teamId,
    name: players.name,
    jerseyNumber: players.jerseyNumber,
    position: players.position,
    height: players.height,
    contactNumber: players.contactNumber,
    imageMimeType: players.imageMimeType,
  }).from(players).where(eq(players.id, idNum)).then(r => r[0]);
  if (!player) notFound();
  if (!canManageTeam(session, player.teamId)) redirect(`/players/${player.id}`);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-semibold">Edit {player.name}</h1>
      <PlayerEditForm player={{
        id: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        height: player.height,
        contactNumber: player.contactNumber,
        hasImage: player.imageMimeType !== null,
      }} />
    </div>
  );
}
