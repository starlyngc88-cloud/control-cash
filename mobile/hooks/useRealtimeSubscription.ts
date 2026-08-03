import { useEffect, useRef } from "react"
import { AppState, AppStateStatus } from "react-native"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

type PostgresChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}

export function useRealtimeSubscription(
  table: string,
  onInsert?: (payload: Record<string, unknown>) => void,
  onUpdate?: (payload: Record<string, unknown>) => void,
  onDelete?: (payload: Record<string, unknown>) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })

  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete }
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table },
        (payload: PostgresChangePayload) => {
          const { onInsert: i, onUpdate: u, onDelete: d } = callbacksRef.current
          if (payload.eventType === "INSERT" && i) i(payload.new ?? {})
          if (payload.eventType === "UPDATE" && u) u(payload.new ?? {})
          if (payload.eventType === "DELETE" && d) d(payload.old ?? {})
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active" && channelRef.current) {
        supabase.removeChannel(channelRef.current)
        const channel = supabase
          .channel(`realtime-${table}-${Date.now()}`)
          .on("postgres_changes",
            { event: "*", schema: "public", table },
            (payload: PostgresChangePayload) => {
              const { onInsert: i, onUpdate: u, onDelete: d } = callbacksRef.current
              if (payload.eventType === "INSERT" && i) i(payload.new ?? {})
              if (payload.eventType === "UPDATE" && u) u(payload.new ?? {})
              if (payload.eventType === "DELETE" && d) d(payload.old ?? {})
            }
          )
          .subscribe()
        channelRef.current = channel
      }
    }
    const sub = AppState.addEventListener("change", handleAppState)
    return () => sub.remove()
  }, [table])
}
