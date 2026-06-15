import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UserAnalytics } from "@/components/analytics/UserAnalytics";

// Usage analytics is admin-only (more sensitive than the rest of Settings).
export default async function AnalyticsSettingsPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") redirect("/settings/pins");
  return <UserAnalytics />;
}
