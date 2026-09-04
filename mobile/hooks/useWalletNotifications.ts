import { useEffect, useRef } from "react"
import { handleWalletNotification } from "@/services/walletService"
import { useAuth } from "@/providers/AuthProvider"

const DEBUG = typeof __DEV__ !== "undefined" ? __DEV__ : true

function log(msg: string, data?: unknown) {
  if (DEBUG) console.log(`[KellyCash][Wallet][Hook] ${msg}`, data ?? "")
}

const WALLET_PACKAGES = ["wallet", "nequi", "daviplata", "mercadopago", "rappi"]

export function useWalletNotifications() {
  const { person } = useAuth()
  const listenerRef = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    if (!person?.id) return

    let mounted = true

    async function setup() {
      try {
        const mod = await import("@/modules/notifications")
          .then((m) => m)
          .catch(() => null)

        if (!mod) {
          log("Módulo de notificaciones no disponible (nativo no compilado)")
          return
        }

        const currentPersonId = person?.id
        if (!currentPersonId) return

        if (!mod.isListenerEnabled()) {
          log("Notification listener no está habilitado. El usuario debe activarlo en Settings.")
          return
        }

        await mod.startListening()
        log("Notification listener iniciado")

        listenerRef.current = mod.addNotificationListener(async (event) => {
          const pkg = event.packageName.toLowerCase()
          const isWallet = WALLET_PACKAGES.some((w) => pkg.includes(w))
          if (!isWallet) return

          log("Notificación de wallet recibida", { title: event.title, text: event.text })
          await handleWalletNotification(event.title, event.text, currentPersonId)
        })
      } catch (err) {
        log("Error al configurar notification listener", err)
      }
    }

    setup()

    return () => {
      mounted = false
      listenerRef.current?.remove()
      listenerRef.current = null
    }
  }, [person?.id])
}
