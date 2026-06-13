import { prisma } from "@/lib/db";

// Admin user list. Create/edit/deactivate UI is a follow-up; this surfaces the
// roster and roles so admins can confirm access today.
export default async function UsersSettingsPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Users</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-3 last:border-b-0">
            <div>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-zinc-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="rounded bg-zinc-800 px-2 py-1">{u.role}</span>
              <span className={u.isActive ? "text-green-400" : "text-zinc-500"}>
                {u.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        User creation, role changes, and deactivation API is scaffolded for the next pass.
      </p>
    </div>
  );
}
