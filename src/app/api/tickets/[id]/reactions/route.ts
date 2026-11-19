import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendNotification } from "@/lib/notifications";

// POST /api/tickets/[id]/reactions -> Toggle reaction on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const { commentId, emoji } = await request.json();

    if (!commentId || !emoji) {
      return NextResponse.json(
        { error: "commentId and emoji are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user profile role and ticket status
    const [{ data: profile }, { data: ticket }] = await Promise.all([
      supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single(),
      supabase.from("tickets").select("id, status").eq("id", ticketId).single(),
    ]);

    const userRole = profile?.role || "CLIENT";
    const isStaff = userRole === "ADMIN" || userRole === "PM" || userRole === "DEV";
    const isClosed = ticket?.status === "RESOLVED" || ticket?.status === "REJECTED";

    if (isClosed && !isStaff) {
      return NextResponse.json(
        { error: "This issue has been resolved and closed. Reactions are disabled for clients." },
        { status: 403 }
      );
    }

    // 2. Check if user already reacted with this emoji on this comment
    const { data: existingReaction, error: fetchErr } = await supabase
      .from("comment_reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (fetchErr) {
      console.error("Fetch reaction error:", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    let action: "added" | "removed" = "added";

    if (existingReaction) {
      // Toggle off: Delete reaction
      const { error: deleteErr } = await supabase
        .from("comment_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteErr) {
        console.error("Delete reaction error:", deleteErr);
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }
      action = "removed";
    } else {
      // Add reaction
      const { error: insertErr } = await supabase
        .from("comment_reactions")
        .insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });

      if (insertErr) {
        console.error("Insert reaction error:", insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      action = "added";

      // Notify comment author
      try {
        const { data: targetComment } = await supabase
          .from("ticket_comments")
          .select("user_id, ticket:tickets(id, ticket_number, title)")
          .eq("id", commentId)
          .single();

        if (targetComment && targetComment.user_id !== user.id) {
          const actorName = profile?.full_name || user.email?.split("@")[0] || "User";
          const ticketData: any = targetComment.ticket;
          await sendNotification({
            userId: targetComment.user_id,
            type: "TICKET_REACT",
            title: `${ticketData?.ticket_number || "TCK"} - ${ticketData?.title || "Ticket"}`,
            message: `${actorName} reacted ${emoji} to your message`,
            ticketId: ticketData?.id || ticketId,
            ticketNumber: ticketData?.ticket_number,
            actorId: user.id,
            actorName,
            actionUrl: `/tickets/${ticketData?.id || ticketId}`,
            groupKey: `ticket-react-${commentId}`,
          });
        }
      } catch (err) {
        console.error("Failed to notify reaction:", err);
      }
    }

    // 3. Return updated list of reactions for this comment
    const { data: updatedReactions, error: queryErr } = await supabase
      .from("comment_reactions")
      .select("id, emoji, user_id, created_at, user:profiles(id, full_name, email, role)")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });

    if (queryErr) {
      console.error("Query updated reactions error:", queryErr);
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action,
      commentId,
      reactions: updatedReactions || [],
    });
  } catch (err: unknown) {
    console.error("POST reaction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}
