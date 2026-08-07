"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

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
    const channel = supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          void onChangeRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table]);
}
