"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Map, Users, Calendar, Trophy, LayoutDashboard, Landmark, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Map", icon: Map },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/territories", label: "Territories", icon: Landmark },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const managerItems = [
  { href: "/settings/pins", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isManager = role === "MANAGER" || role === "ADMIN";

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-black p-3 sm:flex">
      <div className="mb-4 flex items-start justify-between px-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-badge.svg"
            alt="NSR Elite"
            className="max-h-9 w-auto object-contain"
          />
        </div>
        <NotificationBell />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {[...baseItems, ...(isManager ? managerItems : [])].map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                active ? "bg-zinc-800 text-nsr-blue" : "text-zinc-300 hover:bg-zinc-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 pt-2">
        <Link href="/profile" className="block rounded-xl px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white">
          {session?.user?.name} · Profile
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
