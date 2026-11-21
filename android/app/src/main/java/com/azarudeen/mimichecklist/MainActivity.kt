package com.azarudeen.mimichecklist

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import kotlin.math.max

/**
 * Mimi Checklist for Android: the same checklist page as the iPhone app (copied from ../web into the app's assets
 * at build time), shown full screen in a WebView, with Android extras through [Bridge] (`window.MimiAndroid`).
 *
 * The page is served from https://appassets.androidplatform.net/assets/web/ so it has a normal, stable origin
 * (its saved data lives in that origin's storage inside the app).
 */
class MainActivity : ComponentActivity() {

    lateinit var web: WebView
        private set
    private lateinit var topBar: View
    private lateinit var bottomBar: View
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        fileCallback?.onReceiveValue(uri?.let { arrayOf(it) })
        fileCallback = null
    }
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        Bridge.reportNotificationStatus(this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // White status-bar icons over Mimi's sky.
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT))
        Notifier.createChannels(this)

        // Layout: a coloured strip under the status bar, the page, and a strip above the navigation bar / keyboard.
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        topBar = View(this).apply { setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.mimi_sky)) }
        bottomBar = View(this).apply { setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.mimi_panel)) }
        web = WebView(this)
        root.addView(topBar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0))
        root.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(bottomBar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0))
        setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, 0, bars.right, 0)
            topBar.layoutParams = topBar.layoutParams.apply { height = bars.top }
            bottomBar.layoutParams = bottomBar.layoutParams.apply { height = max(bars.bottom, ime.bottom) }
            topBar.requestLayout(); bottomBar.requestLayout()
            WindowInsetsCompat.CONSUMED
        }

        setUpWebView()
        Bridge.attach(this)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Let the page close a sheet, the room or the focus screen first.
                web.evaluateJavascript("(window.__mimiBack && window.__mimiBack()) ? 1 : 0") { result ->
                    if (result?.trim() != "1") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })

        if (savedInstanceState == null) web.loadUrl(START_URL) else web.restoreState(savedInstanceState)
        askForNotificationsOnce()
    }

    private fun setUpWebView() {
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false // lets Mimi meow when the app opens
            allowFileAccess = false
            allowContentAccess = true
            textZoom = 100
        }
        web.setBackgroundColor(Color.TRANSPARENT)
        web.isVerticalScrollBarEnabled = false
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.host == APP_HOST) return false
                // Anything else (help links, Google pages) opens in the browser.
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, url)) }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val types = params.acceptTypes.filter { it.isNotBlank() }.ifEmpty { listOf("*/*") }
                    .map { if (it.startsWith(".")) "*/*" else it }.toTypedArray()
                return runCatching { pickFile.launch(types); true }.getOrElse { fileCallback = null; false }
            }
        }
    }

    private fun askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33) return
        val prefs = getSharedPreferences("mimi", MODE_PRIVATE)
        if (prefs.getBoolean("askedNotif", false)) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        prefs.edit().putBoolean("askedNotif", true).apply()
        web.postDelayed({ askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS) }, 2500)
    }

    /** Runs a bit of JavaScript on the page (from any thread). */
    fun js(code: String) {
        runOnUiThread { if (::web.isInitialized) web.evaluateJavascript(code, null) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        topBar.setBackgroundColor(ContextCompat.getColor(this, R.color.mimi_sky))
        bottomBar.setBackgroundColor(ContextCompat.getColor(this, R.color.mimi_panel))
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        Bridge.reportNotificationStatus(this)
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        Bridge.detach(this)
        web.destroy()
        super.onDestroy()
    }

    companion object {
        const val APP_HOST = "appassets.androidplatform.net"
        const val START_URL = "https://$APP_HOST/assets/web/index.html"
    }
}
