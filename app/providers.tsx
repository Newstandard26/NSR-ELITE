"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

// Shared fetcher used by all SWR hooks across the app.
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "Request failed"), { status: res.status, body });
  }
  return res.json();
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>{children}</SWRConfig>
    </SessionProvider>
  );
}
