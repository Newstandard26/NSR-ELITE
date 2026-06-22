import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live deployed app (server-rendered Next.js can't be
// statically exported), with Capacitor's native plugins available to the web
// code. Override the URL with CAP_SERVER_URL if needed.
const serverUrl = process.env.CAP_SERVER_URL || "https://nsreliteknocker.com";

const config: CapacitorConfig = {
  appId: "com.newstandardrestoration.nsrelite",
  appName: "NSR Elite",
  // Offline fallback assets dir (we load from server.url at runtime).
  webDir: "out",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0d0d0d",
  },
  android: {
    backgroundColor: "#0d0d0d",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0d0d0d",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
