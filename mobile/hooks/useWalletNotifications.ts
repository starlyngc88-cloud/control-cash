import { useEffect, useRef, useState } from "react"
import { Alert } from "react-native"
import { handleWalletNotification } from "@/services/walletService"
import { useAuth } from "@/providers/AuthProvider"

const DEBUG = typeof __DEV__ !== "undefined" ? __DEV__ : true

function log(msg: string, data?: unknown) {
  if (DEBUG) console.log(`[KellyCash][Wallet][Hook] ${msg}`, data ?? "")
}

const KNOWN_WALLET_PACKAGES = [
  "com.google.android.apps.walletnfcrel",
  "com.google.android.apps.wallet",
  "com.nequi.mobile",
  "com.davivienda.daviplata",
  "com.mercadopago.wallet",
  "com.rappi.wallet",
]

const GENERIC_KEYWORDS = ["wallet", "nequi", "daviplata", "mercadopago", "rappi"]

const PAYMENT_KEYWORDS = ["$", "pago", "compra", "transferencia", "envío", "recibiste", "debito", "cargo", "retiro"]

function isWalletPackage(pkg: string): boolean {
  const lower = pkg.toLowerCase()

  if (KNOWN_WALLET_PACKAGES.some((known) => lower.includes(known))) return true
  if (GENERIC_KEYWORDS.some((kw) => lower.includes(kw))) return true

  if (lower === "com.google.android.gms") return false

  return false
}

export function useWalletNotifications() {
  const { person } = useAuth()
  const listenerRef = useRef<{ remove: () => void } | null>(null)
  const [listenerEnabled, setListenerEnabled] = useState<boolean | null>(null)
  const personIdRef = useRef(person?.id)

  useEffect(() => {
    personIdRef.current = person?.id
  }, [person?.id])

  useEffect(() => {
    let mounted = true

    async function setup() {
      try {
        const mod = await import("@/modules/notifications")
          .then((m) => m)
          .catch(() => null)

        if (!mod) {
          log("Módulo de notificaciones no disponible (nativo no compilado)")
          if (mounted) setListenerEnabled(null)
          return
        }

        const enabled = mod.isListenerEnabled()
        log("Notification listener habilitado:", enabled)
        if (mounted) setListenerEnabled(enabled)

        if (!enabled) {
          log("Notification listener no está habilitado. El usuario debe activarlo en Settings.")
          return
        }

        await mod.startListening()
        log("Notification listener iniciado, escuchando notificaciones...")

        listenerRef.current = mod.addNotificationListener(async (event) => {
          log("Notificación NATIVA recibida", {
            packageName: event.packageName,
            title: event.title,
            text: event.text,
          })

          const pkg = event.packageName.toLowerCase()

          if (!isWalletPackage(pkg)) {
            log("Notificación ignorada (no es wallet):", event.packageName)
            return
          }

          log("Notificación de wallet CAPTURADA, procesando...", {
            title: event.title,
            text: event.text,
            package: event.packageName,
          })

          const currentPersonId = personIdRef.current
          if (!currentPersonId) {
            log("Sin person ID, notificación ignorada temporalmente")
            return
          }

          try {
            const result = await handleWalletNotification(event.title, event.text, currentPersonId)

            if (!result) {
              log("No se pudo parsear la notificación", { title: event.title, text: event.text })
              if (DEBUG) {
                Alert.alert(
                  "Wallet: parse fallido",
                  `No se pudo extraer el monto de la notificación.\n\nTítulo: ${event.title}\nTexto: ${event.text}`,
                  [{ text: "OK" }]
                )
              }
              return
            }

            if (result.status === "error") {
              log("Error al crear gasto desde wallet", { error: result.error })
              Alert.alert(
                "Pago Wallet",
                `No se pudo registrar el pago automáticamente.\n\n${result.error}`,
                [{ text: "OK" }]
              )
              return
            }

            log("Gasto creado exitosamente desde wallet", {
              expenseId: result.expenseId,
              amount: result.amount,
              description: result.description,
            })
          } catch (err) {
            log("Error inesperado procesando notificación wallet", err)
            Alert.alert(
              "Wallet: error",
              `Error inesperado al procesar el pago.\n\n${err instanceof Error ? err.message : "Error desconocido"}`,
              [{ text: "OK" }]
            )
          }
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
  }, [])

  return { listenerEnabled }
}
