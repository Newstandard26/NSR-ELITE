export { default } from "next-auth/middleware";

// Protect app routes; NextAuth redirects unauthenticated users to /login.
export const config = {
  matcher: [
    "/map/:path*",
    "/leads/:path*",
    "/territories/:path*",
    "/appointments/:path*",
    "/leaderboard/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
