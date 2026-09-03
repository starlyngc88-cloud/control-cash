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

const ExpoNotificationsWallet: NotificationListenerType = requireNativeModule("ExpoNotificationsWallet")

export function isListenerEnabled(): boolean {
  return ExpoNotificationsWallet.isListenerEnabled()
}

export function openNotificationSettings(): void {
  ExpoNotificationsWallet.openNotificationSettings()
}

export async function startListening(): Promise<void> {
  return ExpoNotificationsWallet.startListening()
}

export async function stopListening(): Promise<void> {
  return ExpoNotificationsWallet.stopListening()
}

export function addNotificationListener(
  listener: (event: NotificationEvent) => void
): { remove: () => void } {
  const subscription = ExpoNotificationsWallet.addListener("onNotificationReceived", listener)
  return subscription
}

export type { NotificationEvent }
