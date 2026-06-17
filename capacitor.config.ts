import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live deployed app (server-rendered Next.js can't be
// statically exported), with Capacitor's native plugins available to the web
// code. Set CAP_SERVER_URL to your production URL before `npx cap sync`.
const serverUrl = process.env.CAP_SERVER_URL || "https://app.newstandardrestoration.com";

const config: CapacitorConfig = {
  appId: "com.newstandardrestoration.nsrelite",
  appName: "NSR Elite",
  // Fallback web assets dir (we load from server.url, but Capacitor requires one).
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: { contentInset: "always" },
};

export default config;
