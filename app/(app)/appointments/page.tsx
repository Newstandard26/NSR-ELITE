"use client";

import useSWR from "swr";

interface ApptDTO {
  id: string;
  scheduledAt: string;
  type: string;
  status: string;
  rep: { id: string; name: string } | null;
  lead: { id: string; address: string; ownerName: string | null } | null;
}

export default function AppointmentsPage() {
  const { data: appts = [] } = useSWR<ApptDTO[]>("/api/appointments");

  // Group by day for a simple agenda view.
  const byDay = appts.reduce<Record<string, ApptDTO[]>>((acc, a) => {
    const day = new Date(a.scheduledAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    (acc[day] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Appointments</h1>
      {Object.keys(byDay).length === 0 && (
        <p className="text-sm text-zinc-500">No upcoming appointments.</p>
      )}
      {Object.entries(byDay).map(([day, list]) => (
        <div key={day} className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-400">{day}</h2>
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {a.type}
                </span>
                <span className="text-xs text-zinc-500">{a.status}</span>
              </div>
              <p className="text-sm text-zinc-400">
                {a.lead?.ownerName || a.lead?.address}
                {a.rep ? ` — ${a.rep.name}` : ""}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
