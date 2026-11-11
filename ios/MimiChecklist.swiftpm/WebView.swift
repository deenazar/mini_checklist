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
        if let webView, webView.url != nil {
            webView.reload()
        } else {
            webView?.load(URLRequest(url: checklistURL))
        }
    }
}

struct ChecklistWebView: UIViewRepresentable {
    @ObservedObject var model: WebModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()                // keeps you signed in
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = [] // lets Mimi speak and play sounds
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        // Native speech recognition for the page (the mic button and “Hey Mimi”).
        let speech = context.coordinator.speech
        config.userContentController.addUserScript(
            WKUserScript(source: SpeechBridge.pageScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        )
        config.userContentController.add(speech, name: SpeechBridge.handlerName)

        // Reminders as real iPhone notifications, haptics, and clipboard for the vault.
        config.userContentController.addUserScript(
            WKUserScript(source: NativeBridge.pageScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        )
        config.userContentController.add(context.coordinator.native, name: NativeBridge.handlerName)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        if #available(iOS 16.4, *) { webView.isInspectable = true }

        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.pulledToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        speech.webView = webView
        model.webView = webView
        webView.load(URLRequest(url: checklistURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: SpeechBridge.handlerName)
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: NativeBridge.handlerName)
        coordinator.speech.shutDown()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebModel
        let speech = SpeechBridge()
        let native = NativeBridge()

        init(model: WebModel) { self.model = model }

        @objc func pulledToRefresh(_ sender: UIRefreshControl) {
            model.webView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
        }

        // MARK: Navigation

        /// Google refuses to sign people in inside app web views (it shows a "disallowed_useragent"
        /// error page), so the app catches Google sign-in and offers the email sign-in instead.
        private func isGoogleSignIn(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return false }
            return host == "accounts.google.com" || host.hasSuffix(".accounts.google.com")
                || (host == "accounts.youtube.com")
        }

        private var googleNoticeShown = false

        private func explainGoogleSignIn() {
            guard !googleNoticeShown else { return }
            googleNoticeShown = true
            let alert = UIAlertController(
                title: "Use your email to sign in",
                message: "Google doesn’t allow its sign-in inside apps like this one, so “Continue with Google” can’t open here.\n\nTap “Sign in with email” and enter the same Gmail address you use with Claude. Claude emails you a code, and you’ll see the same checklist. You only need to do this once.",
                preferredStyle: .alert)
            present(alert, actions: [
                UIAlertAction(title: "Sign in with email", style: .default) { [weak self] _ in
                    self?.googleNoticeShown = false
                    // Opening the checklist while signed out shows Claude's sign-in page with the email box.
                    self?.model.webView?.load(URLRequest(url: checklistURL))
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                },
                UIAlertAction(title: "Not now", style: .cancel) { [weak self] _ in self?.googleNoticeShown = false }
            ])
        }

        /// Sites that stay inside the app. Everything else opens in Safari.
        private func staysInApp(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return true }
            let inApp = ["claude.ai", "anthropic.com", "claudeusercontent.com", "claude.com"]
            return inApp.contains { host == $0 || host.hasSuffix("." + $0) }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.allow) }
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme == "tel" || scheme == "mailto" || scheme == "sms" || scheme == "shortcuts" {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            // Frames inside the page (the checklist itself) always load.
            if isGoogleSignIn(url) {
                // Google's background frames (one-tap) are skipped quietly; a tap on the button explains.
                if action.targetFrame == nil || action.targetFrame?.isMainFrame == true { explainGoogleSignIn() }
                return decisionHandler(.cancel)
            }
            if action.targetFrame?.isMainFrame == false { return decisionHandler(.allow) }
            if scheme == "about" || scheme == "blob" || scheme == "data" || staysInApp(url) {
                return decisionHandler(.allow)
            }
            if action.navigationType == .linkActivated || action.targetFrame == nil {
                openInSafari(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
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
                model.error = "Check your internet connection, then try again."
            }
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        // MARK: Pop-ups, permissions, alerts

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isGoogleSignIn(url) { explainGoogleSignIn(); return nil }
                if staysInApp(url) { webView.load(action.request) } else { openInSafari(url) }
            }
            return nil
        }

        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(type == .microphone ? .grant : .prompt)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "OK", style: .default) { _ in completionHandler() }])
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) },
                              UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) }])
        }

        private func present(_ alert: UIAlertController, actions: [UIAlertAction]) {
            actions.forEach(alert.addAction)
            topController()?.present(alert, animated: true)
        }

        private func openInSafari(_ url: URL) {
            guard ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
                UIApplication.shared.open(url); return
            }
            topController()?.present(SFSafariViewController(url: url), animated: true)
        }

        private func topController() -> UIViewController? {
            let scene = UIApplication.shared.connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
            var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController
            while let next = top?.presentedViewController { top = next }
            return top
        }
    }
}
