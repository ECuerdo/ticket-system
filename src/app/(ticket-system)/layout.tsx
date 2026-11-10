import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";

export const instant = false;

export default async function TicketSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const headerUser = {
    name: userName,
    email: user.email || "",
    avatar: profile?.avatar_url || "/avatars/shadcn.jpg",
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar user={headerUser} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
