import { requireNativeModule } from "expo-modules-core"

type NotificationEvent = {
  title: string
  text: string
  packageName: string
  timestamp: number
}

type NotificationListenerType = {
  addListener(eventName: string, listener: (event: NotificationEvent) => void): { remove: () => void }
  removeListeners(count: number): void
  isListenerEnabled(): boolean
  openNotificationSettings(): void
  startListening(): Promise<void>
  stopListening(): Promise<void>
}

let _module: NotificationListenerType | undefined

function getModule(): NotificationListenerType {
  if (!_module) {
    _module = requireNativeModule<NotificationListenerType>("ExpoNotificationsWallet")
  }
  return _module!
}

export function isListenerEnabled(): boolean {
  try {
    return getModule().isListenerEnabled()
  } catch {
    return false
  }
}

export function openNotificationSettings(): void {
  try {
    getModule().openNotificationSettings()
  } catch {}
}

export async function startListening(): Promise<void> {
  return getModule().startListening()
}

export async function stopListening(): Promise<void> {
  return getModule().stopListening()
}

export function addNotificationListener(
  listener: (event: NotificationEvent) => void
): { remove: () => void } {
  const subscription = getModule().addListener("onNotificationReceived", listener)
  return subscription
}

export type { NotificationEvent }
