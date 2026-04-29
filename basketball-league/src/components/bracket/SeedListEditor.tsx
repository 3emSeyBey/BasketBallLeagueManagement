"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type SeedItem = { teamId: number; teamName: string; seed: number };

function SortableRow({ item, idx }: { item: SeedItem; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(item.teamId) });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 border rounded-md bg-card cursor-grab active:cursor-grabbing"
    >
      <span className="text-xs uppercase tracking-wider text-muted-foreground w-12">Seed {idx + 1}</span>
      <span className="font-medium">{item.teamName}</span>
      <span className="ml-auto text-xs text-muted-foreground">⋮⋮</span>
    </li>
  );
}

export function SeedListEditor({ seasonId, initialItems }: { seasonId: number; initialItems: SeedItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<SeedItem[]>(initialItems);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setItems(curr => {
      const oldIdx = curr.findIndex(i => String(i.teamId) === String(e.active.id));
      const newIdx = curr.findIndex(i => String(i.teamId) === String(e.over!.id));
      return arrayMove(curr, oldIdx, newIdx);
    });
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/seeds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamOrder: items.map(i => i.teamId) }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    toast.success("Bracket seeds updated");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag teams to reorder seeds. Higher seeds (top) get easier first-round opponents.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(i => String(i.teamId))} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <SortableRow key={item.teamId} item={item} idx={idx} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save bracket order"}</Button>
    </div>
  );
}
