import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { PublicLandingView } from "@/modules/landing/public-landing-view";

export const instant = false;

export default async function PublicLandingPage() {
  await connection();
  const supabase = await createClient();
  const { data: landingData } = await supabase.rpc("get_landing_tickets", { limit_count: 3 });

  const randomTickets: any[] = landingData?.tickets || [];
  const totalActive: number = landingData?.total_active ?? randomTickets.length;

  return (
    <Suspense fallback={null}>
      <PublicLandingView
        randomTickets={randomTickets}
        totalActive={totalActive}
      />
    </Suspense>
  );
}
