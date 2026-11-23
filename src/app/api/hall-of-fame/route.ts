import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only DEV, PM, and ADMIN can access Hall of Fame
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (
      !currentProfile ||
      (currentProfile.role !== "ADMIN" &&
        currentProfile.role !== "PM" &&
        currentProfile.role !== "DEV")
    ) {
      return NextResponse.json(
        { error: "Forbidden: Hall of Fame is restricted to DEV, PM, and ADMIN" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "this_week"; // this_week | last_week | this_month | all_time

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (timeRange === "this_week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (timeRange === "last_week") {
      const lastWeek = subWeeks(now, 1);
      startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
      endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
    } else if (timeRange === "this_month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }
    // all_time leaves startDate and endDate as null

    // 1. Fetch system types (categories)
    const { data: systemTypes, error: stError } = await supabase
      .from("system_types")
      .select("id, name, description");

    if (stError) {
      return NextResponse.json({ error: stError.message }, { status: 500 });
    }

    // 2. Fetch all PM profiles
    const { data: pmProfiles, error: pmError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, assigned_system_type_id")
      .eq("role", "PM");

    if (pmError) {
      return NextResponse.json({ error: pmError.message }, { status: 500 });
    }

    // 3. Fetch staff profiles (to know non-client commenters)
    const { data: staffProfiles } = await supabase
      .from("profiles")
      .select("id, role");
    const staffIdSet = new Set(
      (staffProfiles || [])
        .filter((p) => p.role !== "CLIENT")
        .map((p) => p.id)
    );

    // 4. Fetch tickets query with optional date bounds
    let ticketsQuery = supabase
      .from("tickets")
      .select("id, ticket_number, title, status, priority, system_type_id, assigned_pm_id, created_at, updated_at");

    if (startDate) {
      ticketsQuery = ticketsQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      ticketsQuery = ticketsQuery.lte("created_at", endDate.toISOString());
    }

    const { data: tickets, error: tError } = await ticketsQuery;

    if (tError) {
      return NextResponse.json({ error: tError.message }, { status: 500 });
    }

    const ticketList = tickets || [];
    const ticketIds = ticketList.map((t) => t.id);

    // 5. Fetch first comments for these tickets to calculate first response time
    const commentsByTicket: Record<string, { created_at: string; user_id: string }[]> = {};
    if (ticketIds.length > 0) {
      const { data: comments } = await supabase
        .from("ticket_comments")
        .select("ticket_id, user_id, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      if (comments) {
        for (const c of comments) {
          if (!commentsByTicket[c.ticket_id]) {
            commentsByTicket[c.ticket_id] = [];
          }
          commentsByTicket[c.ticket_id].push(c);
        }
      }
    }

    // Helper: calculate first response time in minutes for a ticket
    // by any staff member, or by a specific PM
    const getFirstResponseMinutes = (
      ticketCreatedAt: string,
      tComments: { created_at: string; user_id: string }[] | undefined,
      targetUserId?: string
    ): number | null => {
      if (!tComments || tComments.length === 0) return null;
      const ticketCreatedTime = new Date(ticketCreatedAt).getTime();

      for (const c of tComments) {
        // If targeting a specific PM, check if comment is by target PM
        if (targetUserId) {
          if (c.user_id === targetUserId) {
            const commentTime = new Date(c.created_at).getTime();
            const diffMin = Math.max(0, Math.round((commentTime - ticketCreatedTime) / (1000 * 60)));
            return diffMin;
          }
        } else {
          // Any staff member
          if (staffIdSet.has(c.user_id)) {
            const commentTime = new Date(c.created_at).getTime();
            const diffMin = Math.max(0, Math.round((commentTime - ticketCreatedTime) / (1000 * 60)));
            return diffMin;
          }
        }
      }
      return null;
    };

    // Helper: calculate resolution time in hours for resolved tickets
    const getResolutionHours = (
      status: string,
      createdAt: string,
      updatedAt: string
    ): number | null => {
      if (status !== "RESOLVED") return null;
      const createdTime = new Date(createdAt).getTime();
      const updatedTime = new Date(updatedAt).getTime();
      const diffHours = Math.max(0, Number(((updatedTime - createdTime) / (1000 * 60 * 60)).toFixed(1)));
      return diffHours;
    };

    // ==========================================
    // A. CALCULATE PER CATEGORY (SYSTEM TYPE)
    // ==========================================
    const categoryStats = (systemTypes || []).map((cat) => {
      const catTickets = ticketList.filter((t) => t.system_type_id === cat.id);
      const volume = catTickets.length;

      // Response times
      const responseTimes: number[] = [];
      // Resolution times
      const resolutionTimes: number[] = [];

      for (const t of catTickets) {
        const respMin = getFirstResponseMinutes(t.created_at, commentsByTicket[t.id]);
        if (respMin !== null) {
          responseTimes.push(respMin);
        }

        const resHours = getResolutionHours(t.status, t.created_at, t.updated_at);
        if (resHours !== null) {
          resolutionTimes.push(resHours);
        }
      }

      const avgResponseMinutes =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : null;

      const avgResolutionHours =
        resolutionTimes.length > 0
          ? Number(
              (
                resolutionTimes.reduce((a, b) => a + b, 0) /
                resolutionTimes.length
              ).toFixed(1)
            )
          : null;

      const resolvedCount = catTickets.filter((t) => t.status === "RESOLVED").length;

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        ticketVolume: volume,
        respondedCount: responseTimes.length,
        avgResponseMinutes,
        resolvedCount,
        avgResolutionHours,
      };
    });

    // ==========================================
    // B. CALCULATE PER PM
    // ==========================================
    const { data: pmScopes } = await supabase
      .from("pm_system_scopes")
      .select("pm_id, system_type_id");

    const scopesByPm: Record<string, Set<string>> = {};
    if (pmScopes) {
      for (const s of pmScopes) {
        if (!scopesByPm[s.pm_id]) scopesByPm[s.pm_id] = new Set();
        scopesByPm[s.pm_id].add(s.system_type_id);
      }
    }

    const pmStats = (pmProfiles || []).map((pm) => {
      const pmScopeSet = scopesByPm[pm.id] || new Set(pm.assigned_system_type_id ? [pm.assigned_system_type_id] : []);
      const pmTickets = ticketList.filter(
        (t) =>
          t.assigned_pm_id === pm.id ||
          (!t.assigned_pm_id && pmScopeSet.has(t.system_type_id))
      );

      const volume = pmTickets.length;

      const responseTimes: number[] = [];
      const resolutionTimes: number[] = [];

      for (const t of pmTickets) {
        let respMin = getFirstResponseMinutes(t.created_at, commentsByTicket[t.id], pm.id);
        if (respMin === null) {
          respMin = getFirstResponseMinutes(t.created_at, commentsByTicket[t.id]);
        }
        if (respMin !== null) {
          responseTimes.push(respMin);
        }

        const resHours = getResolutionHours(t.status, t.created_at, t.updated_at);
        if (resHours !== null) {
          resolutionTimes.push(resHours);
        }
      }

      const avgResponseMinutes =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : null;

      const avgResolutionHours =
        resolutionTimes.length > 0
          ? Number(
              (
                resolutionTimes.reduce((a, b) => a + b, 0) /
                resolutionTimes.length
              ).toFixed(1)
            )
          : null;

      const resolvedCount = pmTickets.filter((t) => t.status === "RESOLVED").length;

      const assignedCategoryNames = (systemTypes || [])
        .filter((s) => pmScopeSet.has(s.id))
        .map((s) => s.name);
      const assignedCategory = assignedCategoryNames.length > 0 ? assignedCategoryNames.join(", ") : "All Systems";

      return {
        id: pm.id,
        name: pm.full_name || pm.email.split("@")[0],
        email: pm.email,
        avatarUrl: pm.avatar_url,
        assignedCategory,
        ticketVolume: volume,
        respondedCount: responseTimes.length,
        avgResponseMinutes,
        resolvedCount,
        avgResolutionHours,
      };
    });

    // ==========================================
    // C. RANKINGS
    // ==========================================
    // 1. Fastest First Response (Lowest avgResponseMinutes)
    const categoryFastestResponse = [...categoryStats]
      .filter((c) => c.avgResponseMinutes !== null)
      .sort((a, b) => (a.avgResponseMinutes ?? Infinity) - (b.avgResponseMinutes ?? Infinity));

    const pmFastestResponse = [...pmStats]
      .filter((p) => p.avgResponseMinutes !== null)
      .sort((a, b) => (a.avgResponseMinutes ?? Infinity) - (b.avgResponseMinutes ?? Infinity));

    // 2. Lowest Ticket Volume / Frequency ("Madalang magkaroon ng ticket")
    // Fewest tickets filed is ranked #1 (indicates greatest stability & highest quality)
    const categoryLowestVolume = [...categoryStats].sort((a, b) => a.ticketVolume - b.ticketVolume);
    const pmLowestVolume = [...pmStats].sort((a, b) => a.ticketVolume - b.ticketVolume);

    // 3. Fastest Resolution (Lowest avgResolutionHours)
    const categoryFastestResolution = [...categoryStats]
      .filter((c) => c.avgResolutionHours !== null)
      .sort((a, b) => (a.avgResolutionHours ?? Infinity) - (b.avgResolutionHours ?? Infinity));

    const pmFastestResolution = [...pmStats]
      .filter((p) => p.avgResolutionHours !== null)
      .sort((a, b) => (a.avgResolutionHours ?? Infinity) - (b.avgResolutionHours ?? Infinity));

    // Summary counts
    const totalTicketsInPeriod = ticketList.length;
    const resolvedInPeriod = ticketList.filter((t) => t.status === "RESOLVED").length;

    return NextResponse.json({
      timeRange,
      period: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
      summary: {
        totalTickets: totalTicketsInPeriod,
        resolvedTickets: resolvedInPeriod,
        totalCategories: systemTypes?.length || 0,
        totalPms: pmProfiles?.length || 0,
      },
      categories: {
        stats: categoryStats,
        rankings: {
          fastestResponse: categoryFastestResponse,
          lowestVolume: categoryLowestVolume,
          fastestResolution: categoryFastestResolution,
        },
      },
      pms: {
        stats: pmStats,
        rankings: {
          fastestResponse: pmFastestResponse,
          lowestVolume: pmLowestVolume,
          fastestResolution: pmFastestResolution,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
