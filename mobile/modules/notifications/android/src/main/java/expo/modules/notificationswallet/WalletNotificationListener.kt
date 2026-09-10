package expo.modules.notificationswallet

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class WalletNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "KellyCash_WalletListener"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        if (!isWalletPackage(packageName, sbn.notification)) {
            Log.d(TAG, "Notificación ignorada (package no es wallet): $packageName")
            return
        }

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val displayText = bigText ?: text

        Log.d(TAG, "Notificación CAPTURADA de: $packageName | title=$title | text=$displayText")

        NotificationEventManager.sendNotification(
            title = title,
            text = displayText,
            packageName = packageName,
            timestamp = sbn.postTime
        )
    }

    private fun isWalletPackage(packageName: String, notification: Notification?): Boolean {
        val pkg = packageName.lowercase()

        val knownWalletPackages = listOf(
            "com.google.android.apps.walletnfcrel",
            "com.google.android.apps.wallet",
            "com.nequi.mobile",
            "com.davivienda.daviplata",
            "com.mercadopago.wallet",
            "com.rappi.wallet",
        )
        if (knownWalletPackages.any { pkg.contains(it) }) {
            Log.d(TAG, "Package match (known list): $packageName")
            return true
        }

        val genericKeywords = listOf("wallet", "nequi", "daviplata", "mercadopago", "rappi")
        if (genericKeywords.any { pkg.contains(it) }) {
            Log.d(TAG, "Package match (keyword): $packageName")
            return true
        }

        if (pkg == "com.google.android.gms") {
            val match = hasPaymentContent(notification)
            Log.d(TAG, "Package es Google Play Services, payment content=$match: $packageName")
            return match
        }

        return false
    }

    private fun hasPaymentContent(notification: Notification?): Boolean {
        if (notification == null) return false
        val extras = notification.extras ?: return false
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val combined = "$title $text $bigText".lowercase()
        val paymentKeywords = listOf("$", "pago", "compra", "transferencia", "envío", "recibiste", "debito", "cargo", "retiro")
        return paymentKeywords.any { combined.contains(it) }
    }
}
