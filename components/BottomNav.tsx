"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Users, Calendar, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/appointments", label: "Appts", icon: Calendar },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-zinc-800 bg-black sm:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
              active ? "text-nsr-blue" : "text-zinc-400",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
