import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";
import { getHeaderUser } from "@/lib/auth-user";
import { ProjectName } from "@/components/shared/branding-provider";
import { GroupChatRoom } from "@/modules/group-chats/components/group-chat-room";

export const instant = false;

export default async function StaffChatPage() {
  const headerUser = await getHeaderUser();

  if (headerUser.role !== "PM" && headerUser.role !== "DEV" && headerUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-xs bg-background sm:h-16 overflow-hidden">
        <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4 overflow-hidden">
          <SidebarTrigger className="-ml-1 shrink-0" />

          <Separator
            orientation="vertical"
            className="hidden sm:block mr-2 data-[orientation=vertical]:h-4 shrink-0"
          />

          <div className="min-w-0 overflow-hidden">
            <Breadcrumb>
              <BreadcrumbList className="min-w-0 overflow-hidden">
                <BreadcrumbItem className="hidden md:block shrink-0">
                  <BreadcrumbLink href="/dashboard"><ProjectName /></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                <BreadcrumbItem className="min-w-0 overflow-hidden">
                  <BreadcrumbPage className="truncate max-w-[56vw] sm:max-w-[60vw] md:max-w-none font-semibold">
                    Staff Chat
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="flex h-full items-center px-2 sm:px-4 shrink-0 max-w-[48vw] sm:max-w-none overflow-hidden">
          <NavUser user={headerUser} />
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading Staff Chat...</div>}>
          <GroupChatRoom
            chatType="staff"
            title="Staff General Chat"
            subtitle="All-hands communication hub for PM, Engineering, and Admins"
            allowedRolesLabel="PM, Dev & Admin"
            icon="staff"
          />
        </Suspense>
      </main>
    </div>
  );
}
