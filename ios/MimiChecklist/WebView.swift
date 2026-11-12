import SwiftUI
import WebKit
import SafariServices

/// Shared state between the web view and SwiftUI (only touched on the main thread).
final class WebModel: ObservableObject {
    @Published var firstLoadDone = false
    @Published var error: String?
    weak var webView: WKWebView?

    func reload() {
        error = nil
        if let webView { ChecklistWebView.loadApp(into: webView, model: self) }
    }
}

struct ChecklistWebView: UIViewRepresentable {
    @ObservedObject var model: WebModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    /// Opens the checklist web app bundled inside the app (the `Web` folder). No internet needed.
    static func loadApp(into webView: WKWebView, model: WebModel) {
        guard let index = AppOrigin.indexURL, let root = AppOrigin.webRoot,
              FileManager.default.fileExists(atPath: index.path) else {
            model.error = "The checklist files are missing from the app. Open the project in Xcode and run it again."
            return
        }
        webView.loadFileURL(index, allowingReadAccessTo: root)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()                // keeps settings such as sound and theme
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = [] // lets Mimi speak and play sounds
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let scripts = config.userContentController

        // Saved data: tasks, lists, water, notes, profile and vault live in a file inside the app.
        scripts.addScriptMessageHandler(NativeStore.shared, contentWorld: .page, name: NativeStore.handlerName)

        // Native speech recognition for the page (the mic button and “Hey Mimi”).
        let speech = context.coordinator.speech
        scripts.addUserScript(WKUserScript(source: SpeechBridge.pageScript, injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        scripts.add(speech, name: SpeechBridge.handlerName)

        // Reminders as real iPhone notifications, haptics, clipboard for the vault, and sharing backups.
        scripts.addUserScript(WKUserScript(source: NativeBridge.pageScript, injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        scripts.add(context.coordinator.native, name: NativeBridge.handlerName)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        // The page handles the safe areas itself (CSS env(safe-area-inset-*)).
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        // Safari Web Inspector, for development builds only.
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif

        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.pulledToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        speech.webView = webView
        model.webView = webView
        // Google sign-in and encrypted sync: give it the page to report to, and sync now.
        SyncEngine.shared.webView = webView
        NativeSpeaker.shared.webView = webView
        // Widgets, Siri and shortcuts send their actions to the page.
        ActionRouter.shared.webView = webView
        NotificationRouter.shared.webView = webView
        SyncEngine.shared.appBecameActive()
        Self.loadApp(into: webView, model: model)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        let scripts = uiView.configuration.userContentController
        scripts.removeScriptMessageHandler(forName: NativeStore.handlerName, contentWorld: .page)
        scripts.removeScriptMessageHandler(forName: SpeechBridge.handlerName)
        scripts.removeScriptMessageHandler(forName: NativeBridge.handlerName)
        coordinator.speech.shutDown()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebModel
        let speech = SpeechBridge()
        let native = NativeBridge()

        init(model: WebModel) { self.model = model }

        @objc func pulledToRefresh(_ sender: UIRefreshControl) {
            // The page reloads its saved data from the app, so nothing is lost.
            model.webView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
        }

        // MARK: Navigation

        /// Only the bundled checklist loads in the app. Web links open in Safari.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.cancel) }
            let scheme = url.scheme?.lowercased() ?? ""
            switch scheme {
            case "file":
                decisionHandler(AppOrigin.isAppFile(url) ? .allow : .cancel)
            case "about", "blob", "data":
                decisionHandler(.allow)
            case "http", "https":
                // A tapped link opens in Safari; the app never loads other websites itself.
                if action.targetFrame?.isMainFrame != false { openInSafari(url) }
                decisionHandler(.cancel)
            case "tel", "mailto", "sms", "shortcuts":
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            default:
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            // The page is (re)loading: hold actions until it says it's ready again.
            ActionRouter.shared.pageReady = false
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                model.error = nil
                try? await Task.sleep(nanoseconds: 350_000_000)
                model.firstLoadDone = true
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        private func handle(_ error: Error) {
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
            if ns.domain == "WebKitErrorDomain" && ns.code == 102 { return } // frame load interrupted
            Task { @MainActor in
                model.error = "The checklist couldn’t open (\(ns.localizedDescription)). Try again."
            }
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        // MARK: Pop-ups, permissions, alerts

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url, ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                openInSafari(url)
            }
            return nil
        }

        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            // Only the bundled checklist page gets the microphone.
            guard AppOrigin.isAppPage(frame) else { return decisionHandler(.deny) }
            decisionHandler(type == .microphone ? .grant : .prompt)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "OK", style: .default) { _ in completionHandler() }],
                    ifNotShown: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) },
                              UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) }],
                    ifNotShown: { completionHandler(false) })
        }

        /// WebKit requires every alert's completion handler to be called, even if nothing could be shown.
        private func present(_ alert: UIAlertController, actions: [UIAlertAction], ifNotShown: @escaping () -> Void) {
            actions.forEach(alert.addAction)
            guard let top = UIApplication.shared.mimiTopViewController() else { return ifNotShown() }
            top.present(alert, animated: true)
        }

        private func openInSafari(_ url: URL) {
            guard let top = UIApplication.shared.mimiTopViewController() else {
                UIApplication.shared.open(url); return
            }
            top.present(SFSafariViewController(url: url), animated: true)
        }
    }
}

extension UIApplication {
    /// The view controller currently on screen, for presenting alerts and sheets.
    func mimiTopViewController() -> UIViewController? {
        let scene = connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
            ?? connectedScenes.first as? UIWindowScene
        var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController ?? scene?.windows.first?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }
}
