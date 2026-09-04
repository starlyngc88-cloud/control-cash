import { useEffect, useRef, type ReactNode } from "react"
import * as Updates from "expo-updates"
import { AppState, type AppStateStatus } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

const DEBUG_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : true
const RELOAD_WINDOW_MS = 30_000
const MAX_RELOADS = 3

function log(msg: string, data?: unknown) {
  if (DEBUG_LOGS) {
    console.log(`[KellyCash][OTA] ${msg}`, data ?? "")
  }
}

function warn(msg: string, data?: unknown) {
  if (DEBUG_LOGS) {
    console.warn(`[KellyCash][OTA] ${msg}`, data ?? "")
  }
}

async function isInCrashLoop(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem("@kellycash:ota_reloads")
    if (!raw) return false
    const { count, timestamp } = JSON.parse(raw) as { count: number; timestamp: number }
    if (Date.now() - timestamp > RELOAD_WINDOW_MS) {
      await AsyncStorage.removeItem("@kellycash:ota_reloads")
      return false
    }
    return count >= MAX_RELOADS
  } catch {
    return false
  }
}

async function recordReload() {
  try {
    const raw = await AsyncStorage.getItem("@kellycash:ota_reloads")
    const prev = raw ? JSON.parse(raw) as { count: number; timestamp: number } : { count: 0, timestamp: 0 }
    if (Date.now() - prev.timestamp > RELOAD_WINDOW_MS) {
      await AsyncStorage.setItem("@kellycash:ota_reloads", JSON.stringify({ count: 1, timestamp: Date.now() }))
    } else {
      await AsyncStorage.setItem("@kellycash:ota_reloads", JSON.stringify({ count: prev.count + 1, timestamp: prev.timestamp }))
    }
  } catch {}
}

async function clearReloadCount() {
  try {
    await AsyncStorage.removeItem("@kellycash:ota_reloads")
  } catch {}
}

async function checkAndApplyUpdate() {
  try {
    if (await isInCrashLoop()) {
      warn("Crash loop detectado, saltando OTA update")
      return
    }

    if (Updates.isEmbeddedLaunch) {
      log("App launched from embedded bundle, checking for OTA update...")
    }

    const update = await Updates.checkForUpdateAsync()

    if (update.isAvailable) {
      log("OTA update available, downloading...", {
        id: update.manifest?.id,
      })

      const result = await Updates.fetchUpdateAsync()

      if (result.isNew) {
        log("Update downloaded successfully, reloading app...")
        await recordReload()
        await Updates.reloadAsync()
      } else {
        log("Update already applied, no reload needed")
      }
    } else {
      log("App is up to date")
      await clearReloadCount()
    }
  } catch (error) {
    warn("Error checking/applying OTA update:", error)
  }
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    checkAndApplyUpdate()

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        log("App foregrounded, checking for updates...")
        checkAndApplyUpdate()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [])

  return <>{children}</>
}
