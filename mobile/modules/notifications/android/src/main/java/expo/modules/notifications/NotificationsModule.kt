package expo.modules.notifications

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Intent
import android.provider.Settings

class NotificationsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoNotificationsWallet")

        Events("onNotificationReceived")

        Function("isListenerEnabled") {
            val context = appContext.reactContext ?: return@Function false
            val flat = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: ""
            flat.contains("${context.packageName}/expo.modules.notifications.NotificationListener")
        }

        Function("openNotificationSettings") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }

        AsyncFunction("startListening") {
            NotificationListenerService.startListening()
        }

        AsyncFunction("stopListening") {
            NotificationListenerService.stopListening()
        }
    }

    companion object {
        var listener: NotificationListener? = null
    }
}
