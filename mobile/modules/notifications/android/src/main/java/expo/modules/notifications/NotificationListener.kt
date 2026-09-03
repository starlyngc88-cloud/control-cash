package expo.modules.notifications

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.events.EventEmitter

class NotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return

        if (!isWalletPackage(packageName)) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val displayText = bigText ?: text

        val payload = Bundle().apply {
            putString("title", title)
            putString("text", displayText)
            putString("packageName", packageName)
            putLong("timestamp", sbn.postTime)
        }

        val module = getModule()
        module?.sendEvent("onNotificationReceived", payload)
    }

    private fun isWalletPackage(packageName: String): Boolean {
        val walletPackages = listOf(
            "com.wallet",
            "com.wallet.app",
            "com.google.android.apps.walletnfcrel",
            "com.google.android.gms"
        )
        return walletPackages.any { packageName.contains(it, ignoreCase = true) }
    }

    private fun getModule(): NotificationsModule? {
        return NotificationsModule.listener?.module
    }

    companion object {
        private var shouldStart = false

        fun startListening() {
            shouldStart = true
        }

        fun stopListening() {
            shouldStart = false
        }
    }
}
