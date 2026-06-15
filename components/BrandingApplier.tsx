"use client";

import { useEffect } from "react";
import useSWR from "swr";

// Applies the workspace brand color to the --nsr-blue CSS variable so every
// `nsr-blue` utility reflects the configured brand color.
export function BrandingApplier() {
  const { data } = useSWR<{ brandColor?: string | null }>("/api/settings/branding");
  useEffect(() => {
    if (data?.brandColor) {
      document.documentElement.style.setProperty("--nsr-blue", data.brandColor);
    }
  }, [data?.brandColor]);
  return null;
}
