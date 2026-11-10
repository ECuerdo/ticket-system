import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { title, description, systemTypeId, choiceId, priority } = await request.json();

    if (!title || !description || !systemTypeId) {
      return NextResponse.json(
        { error: "Title, description, and system type are required." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        system_type_id: systemTypeId,
        choice_id: choiceId || null,
        priority: priority || "MEDIUM",
        status: "OPEN",
        client_id: user.id,
      })
      .select()
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

