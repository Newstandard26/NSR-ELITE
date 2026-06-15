import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { touchActivity } from "@/lib/usage";
import { SideNav } from "@/components/SideNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandingApplier } from "@/components/BrandingApplier";

// Shell for all authenticated pages: desktop side nav + mobile bottom nav.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Record ongoing usage (throttled) so persistent sessions count as active.
  await touchActivity(session.user.id);

  return (
    <div className="flex min-h-screen">
      <BrandingApplier />
      <SideNav />
      <main className="flex-1 pb-14 sm:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
