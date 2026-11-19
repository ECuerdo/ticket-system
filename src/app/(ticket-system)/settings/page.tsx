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
import { getAppSettings } from "@/lib/app-settings";
import SettingsModule from "@/modules/settings";

export const instant = false;

export default async function Page() {
  const headerUser = await getHeaderUser();

  if (headerUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/70 shadow-2xs bg-background/80 backdrop-blur-md sm:h-16 overflow-hidden">
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
                  <BreadcrumbLink href="/dashboard">{settings.project_name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                <BreadcrumbItem className="min-w-0 overflow-hidden">
                  <BreadcrumbPage className="truncate max-w-[56vw] sm:max-w-[60vw] md:max-w-none font-semibold">
                    Settings
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

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading Settings...</div>}>
          <SettingsModule initial={settings} />
        </Suspense>
      </main>
    </div>
  );
}
