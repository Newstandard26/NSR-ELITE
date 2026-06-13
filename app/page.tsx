import { redirect } from "next/navigation";

// Reps land on the map; everyone enters through it.
export default function Home() {
  redirect("/map");
}
