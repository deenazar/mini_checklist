package com.azarudeen.mimichecklist

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.lang.ref.WeakReference
import java.util.Locale

/**
 * `window.MimiAndroid` on the page. web/android-bridge.js wraps it as `window.mimiNative`, the same API the iPhone
 * app offers, so the page needs no Android-specific code.
 * Every method is called on a background thread by the WebView; anything touching views goes to the main thread.
 */
class Bridge private constructor(activity: MainActivity) {

    private val ref = WeakReference(activity)
    private val app: Context = activity.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var pendingSpeech: Pair<String, String>? = null

    @JavascriptInterface
    fun schedule(json: String) {
        val list = runCatching { JSONArray(json) }.getOrNull() ?: return
        Reminders.scheduleTasks(app, list)
    }

    @JavascriptInterface
    fun copy(text: String) {
        main.post {
            val cm = app.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Mimi Checklist", text))
        }
        haptic("light")
    }

    @JavascriptInterface
    fun haptic(kind: String) {
        val v: Vibrator = if (Build.VERSION.SDK_INT >= 31) {
            (app.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION") app.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (!v.hasVibrator()) return
        val effect = when (kind) {
            "alarm" -> VibrationEffect.createWaveform(longArrayOf(0, 200, 120, 200, 120, 300), -1)
            "warning" -> VibrationEffect.createWaveform(longArrayOf(0, 80, 80, 120), -1)
            "success" -> VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE)
            else -> VibrationEffect.createOneShot(18, VibrationEffect.DEFAULT_AMPLITUDE)
        }
        runCatching { v.vibrate(effect) }
    }

    /** Shares a backup (or any text) as a file through the Android share sheet. */
    @JavascriptInterface
    fun share(name: String, text: String) {
        val activity = ref.get() ?: return
        val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_").ifBlank { "mimi-checklist-backup.json" }
        val dir = File(app.cacheDir, "shared").apply { mkdirs() }
        val file = File(dir, safe)
        runCatching { file.writeText(text) }.onFailure { return }
        val uri = FileProvider.getUriForFile(app, app.packageName + ".files", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = if (safe.endsWith(".json")) "application/json" else "text/plain"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, safe)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        main.post { runCatching { activity.startActivity(Intent.createChooser(send, "Save or share backup")) } }
    }

    /** The running task timer as an ongoing notification (Android's stand-in for the Dynamic Island). */
    @JavascriptInterface
    fun activity(json: String) {
        val o = runCatching { JSONObject(json) }.getOrNull() ?: return
        if (o.optString("state") == "run") Notifier.showTimer(app, o) else Notifier.endTimer(app)
    }

    @JavascriptInterface
    fun speak(text: String, lang: String) {
        main.post {
            if (tts == null) {
                tts = TextToSpeech(app) { status ->
                    ttsReady = status == TextToSpeech.SUCCESS
                    tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(id: String?) { speaking(true) }
                        override fun onDone(id: String?) { speaking(false) }
                        @Deprecated("Deprecated in Java") override fun onError(id: String?) { speaking(false) }
                        override fun onStop(id: String?, interrupted: Boolean) { speaking(false) }
                    })
                    pendingSpeech?.let { (t, l) -> pendingSpeech = null; say(t, l) }
                }
                pendingSpeech = text to lang
            } else if (ttsReady) {
                say(text, lang)
            } else {
                pendingSpeech = text to lang
            }
        }
    }

    private fun say(text: String, lang: String) {
        val t = tts ?: return
        val locale = Locale.forLanguageTag(lang.replace('_', '-'))
        if (t.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE) t.language = locale
        t.setPitch(1.08f)
        t.setSpeechRate(1.0f)
        t.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mimi")
    }

    private fun speaking(on: Boolean) {
        ref.get()?.js("window.__mimiSpeaking && window.__mimiSpeaking($on);")
    }

    @JavascriptInterface
    fun stopSpeaking() {
        main.post { tts?.stop(); speaking(false) }
    }

    @JavascriptInterface
    fun ready() { /* nothing to do on Android yet */ }

    @JavascriptInterface
    fun dailyPlan(on: Boolean, time: String) {
        Reminders.setDailyPlan(app, on, time)
    }

    @JavascriptInterface
    fun notifStatus() {
        ref.get()?.let { reportNotificationStatus(it) }
    }

    @JavascriptInterface
    fun openNotifSettings() {
        val activity = ref.get() ?: return
        val i = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, app.packageName)
        main.post { runCatching { activity.startActivity(i) } }
    }

    fun shutdown() {
        main.post { tts?.shutdown(); tts = null }
    }

    companion object {
        private var current: Bridge? = null

        fun attach(activity: MainActivity) {
            val b = Bridge(activity)
            current = b
            activity.web.addJavascriptInterface(b, "MimiAndroid")
        }

        fun detach(activity: MainActivity) {
            current?.shutdown()
            current = null
        }

        fun reportNotificationStatus(activity: MainActivity) {
            val on = NotificationManagerCompat.from(activity).areNotificationsEnabled()
            activity.js("window.__mimiNotifStatus && window.__mimiNotifStatus('${if (on) "on" else "off"}');")
        }
    }
}
