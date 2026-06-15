import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, isManagerOrAdmin } from "@/lib/auth";

// Settings is manager/admin only.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!isManagerOrAdmin(session?.user?.role)) redirect("/map");
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <nav className="mb-6 flex gap-2 border-b border-zinc-800 pb-2 text-sm">
        <Link href="/settings/pins" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">
          Disposition Pins
        </Link>
        <Link href="/settings/users" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">
          Users
        </Link>
        <Link href="/settings/integrations/acculynx" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">
          AccuLynx
        </Link>
        <Link href="/settings/branding" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">
          Branding
        </Link>
        {isAdmin && (
          <Link href="/settings/integrations" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">
            Integrations
          </Link>
        )}
      </nav>
      {children}
    </div>
  );
}
