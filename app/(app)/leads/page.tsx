import { BrandWatermark } from "@/components/BrandWatermark";
import { LeadTable } from "@/components/leads/LeadTable";

// LeadTable reads URL search params (dashboard drill-down filters).
export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <>
      <BrandWatermark />
      <LeadTable />
    </>
  );
}
