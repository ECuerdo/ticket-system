"use client";

import { useSearchParams } from "next/navigation";
import { DevTicketsTab } from "./components/dev-tickets-tab";

export default function DevWorkplaceModule() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "tickets";

  return (
    <div className="space-y-6">
      {activeTab === "tickets" && <DevTicketsTab />}
    </div>
  );
}
