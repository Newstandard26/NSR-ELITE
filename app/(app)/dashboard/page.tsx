"use client";

import { useSession } from "next-auth/react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { RepDashboard } from "@/components/dashboard/RepDashboard";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <DashboardHeader />
      {isManager ? <ManagerDashboard /> : <RepDashboard />}
    </div>
  );
}
