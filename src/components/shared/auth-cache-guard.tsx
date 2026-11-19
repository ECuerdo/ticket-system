"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthCacheGuard() {
  useEffect(() => {
    // If restored from browser bfcache (Back/Forward button), force reload to re-verify session with server
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    // Listen to Supabase client signout events
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.replace("/?auth=login");
      }
    });

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
