"use client";

import { useSession } from "next-auth/react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader() {
  const { data: session } = useSession();
  const first = (session?.user?.name || "").split(" ")[0];

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting()}{first ? `, ${first}` : ""}
        </h1>
        <p className="text-sm text-zinc-400">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {session?.user?.role && (
            <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase">{session.user.role}</span>
          )}
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-badge.svg"
        alt="NSR Elite"
        className="max-h-10 w-auto object-contain"
      />
    </div>
  );
}
