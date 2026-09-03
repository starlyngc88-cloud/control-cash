package expo.modules.notificationswallet

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class WalletNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        if (!isWalletPackage(packageName)) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val displayText = bigText ?: text

        NotificationEventManager.sendNotification(
            title = title,
            text = displayText,
            packageName = packageName,
            timestamp = sbn.postTime
        )
    }

    private fun isWalletPackage(packageName: String): Boolean {
        val walletPackages = listOf(
            "wallet",
            "nequi",
            "daviplata",
            "mercadopago",
            "rappi"
        )
        return walletPackages.any { packageName.lowercase().contains(it) }
    }
}
