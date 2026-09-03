import { useEffect, useRef, type ReactNode } from "react"
import * as Updates from "expo-updates"
import { AppState, type AppStateStatus } from "react-native"

const DEBUG_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : true

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

async function checkAndApplyUpdate() {
  try {
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
        await Updates.reloadAsync()
      } else {
        log("Update already downloaded, reloading...")
        await Updates.reloadAsync()
      }
    } else {
      log("App is up to date")
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
