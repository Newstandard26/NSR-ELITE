import { withAuth } from "next-auth/middleware";

// Protect app routes; unauthenticated users are sent to our branded /login.
export default withAuth({
  pages: { signIn: "/login" },
});

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
