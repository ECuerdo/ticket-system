import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getHeaderUser() {
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

  const name = profile?.full_name || user.email?.split("@")[0] || "User";

  return {
    id: user.id,
    name,
    email: user.email || "",
    role: profile?.role || "CLIENT",
    avatar: profile?.avatar_url || "/avatars/shadcn.jpg",
  };
}

