"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Card>
        <CardLabel>Name</CardLabel>
        <CardTitle>{user?.name}</CardTitle>
        <CardLabel className="mt-3">Email</CardLabel>
        <p className="text-sm">{user?.email}</p>
        <CardLabel className="mt-3">Role</CardLabel>
        <p className="text-sm">{user?.role}</p>
      </Card>
      <Button variant="secondary" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </Button>
    </div>
  );
}
