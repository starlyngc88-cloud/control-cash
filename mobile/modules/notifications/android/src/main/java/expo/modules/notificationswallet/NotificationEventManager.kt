package expo.modules.notificationswallet

import android.os.Bundle

object NotificationEventManager {
    var module: NotificationsModule? = null

    fun sendNotification(title: String, text: String, packageName: String, timestamp: Long) {
        val currentModule = module ?: return

        val payload = Bundle().apply {
            putString("title", title)
            putString("text", text)
            putString("packageName", packageName)
            putLong("timestamp", timestamp)
        }

        currentModule.sendEvent("onNotificationReceived", payload)
    }
}
