import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Cache the map shell and lead list for offline field use.
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "mapbox-tiles",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    {
      urlPattern: /\/api\/leads.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "leads-api",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /\/api\/disposition-statuses.*/i,
      handler: "NetworkFirst",
      options: { cacheName: "dispositions-api" },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "api.mapbox.com" },
    ],
  },
};

export default withPWA(nextConfig);
