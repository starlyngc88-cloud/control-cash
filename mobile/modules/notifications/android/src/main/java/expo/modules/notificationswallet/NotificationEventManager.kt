package expo.modules.notificationswallet

import android.os.Bundle
import android.util.Log

object NotificationEventManager {
    private const val TAG = "KellyCash_WalletManager"
    private const val MAX_PENDING = 20

    var module: NotificationsModule? = null
        set(value) {
            field = value
            if (value != null) {
                Log.d(TAG, "Module asignado, procesando ${pendingNotifications.size} notificaciones pendientes")
                flushPending()
            }
        }

    private val pendingNotifications = mutableListOf<Bundle>()

    fun sendNotification(title: String, text: String, packageName: String, timestamp: Long) {
        val payload = Bundle().apply {
            putString("title", title)
            putString("text", text)
            putString("packageName", packageName)
            putLong("timestamp", timestamp)
        }

        val currentModule = module
        if (currentModule == null) {
            if (pendingNotifications.size < MAX_PENDING) {
                pendingNotifications.add(payload)
                Log.d(TAG, "Module null, notificación en cola (${pendingNotifications.size}/$MAX_PENDING): $packageName")
            } else {
                Log.w(TAG, "Cola llena, notificación descartada: $packageName")
            }
            return
        }

        currentModule.sendEvent("onNotificationReceived", payload)
        Log.d(TAG, "Evento enviado a JS: $packageName")
    }

    private fun flushPending() {
        val currentModule = module ?: return
        val iterator = pendingNotifications.iterator()
        while (iterator.hasNext()) {
            val payload = iterator.next()
            iterator.remove()
            currentModule.sendEvent("onNotificationReceived", payload)
            Log.d(TAG, "Evento pendiente enviado a JS: ${payload.getString("packageName")}")
        }
    }
}
