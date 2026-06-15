import { redirect } from "next/navigation";

// Everyone lands on the role-aware dashboard.
export default function Home() {
  redirect("/dashboard");
}
