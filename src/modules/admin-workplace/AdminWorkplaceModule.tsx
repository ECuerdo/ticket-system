"use client";

import { useSearchParams } from "next/navigation";
import { SystemTypesTab } from "./components/system-types-tab";
import { SystemChoicesTab } from "./components/system-choices-tab";
import { UserRolesTab } from "./components/user-roles-tab";
import { PmScopeTab } from "./components/pm-scope-tab";
import { ReportsTab } from "./components/reports-tab";
import { GroupChatsTab } from "./components/group-chats-tab";

export default function AdminWorkplaceModule() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "systems";

  return (
    <div className="space-y-6">
      {activeTab === "systems" && <SystemTypesTab />}
      {activeTab === "choices" && <SystemChoicesTab />}
      {activeTab === "roles" && <UserRolesTab />}
      {activeTab === "pm-scope" && <PmScopeTab />}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "group-chats" && <GroupChatsTab />}
    </div>
  );
}
