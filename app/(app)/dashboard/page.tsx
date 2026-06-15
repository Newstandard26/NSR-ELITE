"use client";

import { useSession } from "next-auth/react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { RepDashboard } from "@/components/dashboard/RepDashboard";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  return (
    <>
      {/* Fixed brand watermark — dashboard content scrolls over the top of it. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
      >
        <img
          src="/brand/logo-full.svg"
          alt=""
          className="w-[78%] max-w-2xl opacity-[0.09]"
        />
      </div>
      <div className="relative mx-auto max-w-5xl space-y-6 p-4">
        <DashboardHeader />
        {isManager ? <ManagerDashboard /> : <RepDashboard />}
      </div>
    </>
  );
}
