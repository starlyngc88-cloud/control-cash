package expo.modules.notificationswallet

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings

class NotificationsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoNotificationsWallet")

        Events("onNotificationReceived")

        OnCreate {
            NotificationEventManager.module = this@NotificationsModule
            android.util.Log.d("KellyCash_WalletManager", "Module auto-registrado en OnCreate")
        }

        Function("isListenerEnabled") {
            val context = appContext.reactContext ?: return@Function false
            val flat = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: ""
            val targetClass = "expo.modules.notificationswallet.WalletNotificationListener"
            val pkg = context.packageName
            val parts = flat.split(";").map { it.trim() }
            parts.any { entry ->
                entry.contains("$pkg/$targetClass") ||
                entry.contains(targetClass)
            }
        }

        Function("openNotificationSettings") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            null
        }

        AsyncFunction("startListening") {
            NotificationEventManager.module = this@NotificationsModule
        }

        AsyncFunction("stopListening") {
            NotificationEventManager.module = null
        }
    }
}
