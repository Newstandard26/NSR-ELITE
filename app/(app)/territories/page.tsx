"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AreaDrawMap = dynamic(
  () => import("@/components/territories/AreaDrawMap").then((m) => m.AreaDrawMap),
  { ssr: false },
);

interface TerritoryDTO {
  id: string;
  name: string;
  color: string;
  status: string;
  assignments: { user: { id: string; name: string } }[];
  _count: { leads: number };
}

export default function TerritoriesPage() {
  const { data: territories = [], mutate } = useSWR<TerritoryDTO[]>("/api/territories");
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";
  const [drawing, setDrawing] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this area? Leads inside are kept but detached.")) return;
    await fetch(`/api/territories/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Territories</h1>
        {isManager && (
          <Button onClick={() => setDrawing(true)}>
            <Plus className="h-4 w-4" /> Create Area
          </Button>
        )}
      </div>

      {drawing && <AreaDrawMap onClose={() => setDrawing(false)} onSaved={() => mutate()} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {territories.map((t) => (
          <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
              <h2 className="font-semibold">{t.name}</h2>
              <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-xs">{t.status}</span>
              {isManager && (
                <button onClick={() => remove(t.id)} className="p-1 text-zinc-500 hover:text-red-400" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-400">{t._count.leads} leads</p>
            <p className="text-xs text-zinc-500">
              Reps: {t.assignments.map((a) => a.user.name).join(", ") || "Unassigned"}
            </p>
          </div>
        ))}
        {territories.length === 0 && <p className="text-sm text-zinc-500">No territories yet.</p>}
      </div>
    </div>
  );
}
