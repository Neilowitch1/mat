"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getActiveHouseholdId } from "@/lib/householdContext";

type RealtimeTable = "shopping_list" | "inventory";

type RealtimeRecord = {
  id?: unknown;
};

export type RealtimeTableChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: RealtimeRecord;
  old: RealtimeRecord;
};

export function useRealtimeTable(
  table: RealtimeTable,
  onChange: (change: RealtimeTableChange) => void | Promise<void>
) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void getActiveHouseholdId()
      .then((householdId) => {
        if (cancelled) return;

        channel = supabase
          .channel(`public:${table}:${householdId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              filter: `household_id=eq.${householdId}`,
            },
            (payload) => {
              void onChangeRef.current(payload);
            }
          )
          .subscribe();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [table]);
}
