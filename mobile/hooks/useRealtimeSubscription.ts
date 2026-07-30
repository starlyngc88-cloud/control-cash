import { useEffect, useRef } from "react"
import { AppState, AppStateStatus } from "react-native"
import { supabase } from "@/lib/supabase"

export function useRealtimeSubscription(
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) {
  const channelRef = useRef<any>(null)
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })
  callbacksRef.current = { onInsert, onUpdate, onDelete }

  useEffect(() => {
    const { onInsert: i, onUpdate: u, onDelete: d } = callbacksRef.current
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          if (payload.eventType === "INSERT" && i) i(payload.new)
          if (payload.eventType === "UPDATE" && u) u(payload.new)
          if (payload.eventType === "DELETE" && d) d(payload.old)
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
        const { onInsert: i, onUpdate: u, onDelete: d } = callbacksRef.current
        const channel = supabase
          .channel(`realtime-${table}-${Date.now()}`)
          .on("postgres_changes",
            { event: "*", schema: "public", table },
            (payload: any) => {
              if (payload.eventType === "INSERT" && i) i(payload.new)
              if (payload.eventType === "UPDATE" && u) u(payload.new)
              if (payload.eventType === "DELETE" && d) d(payload.old)
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
