"use client";

import { useSearchParams } from "next/navigation";
import { PmTicketsTab } from "./components/pm-tickets-tab";
import { MyDevelopersTab } from "./components/my-developers-tab";

export default function PMWorkplaceModule() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "tickets";

  return (
    <div className="space-y-6">
      {activeTab === "tickets" && <PmTicketsTab />}
      {activeTab === "my-devs" && <MyDevelopersTab />}
    </div>
  );
}
