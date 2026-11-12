import Foundation
import WebKit
import WidgetKit

/// Delivers actions from widgets (mimichecklist:// links), Siri, the Shortcuts app, Back Tap and the
/// Action button to the page, once it's ready: `window.__mimiAction({type, ...})`.
///
/// Links: mimichecklist://add?text=… · water?ml=250 · focus · talk · summary · open
@MainActor
final class ActionRouter {
    static let shared = ActionRouter()

    weak var webView: WKWebView?
    private var pending: [[String: Any]] = []

    /// Set when the page says it's ready (`mimiNative.ready()`), cleared when it starts loading again.
    var pageReady = false {
        didSet { if pageReady { flush() } }
    }

    func enqueue(_ action: [String: Any]) {
        pending.append(action)
        flush()
    }

    /// Handles mimichecklist:// links from the widgets (and anywhere else).
    func handle(url: URL) {
        guard url.scheme?.lowercased() == "mimichecklist" else { return }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        func value(_ name: String) -> String? { items.first { $0.name == name }?.value }
        switch (url.host ?? "").lowercased() {
        case "add": enqueue(["type": "add", "text": value("text") ?? ""])
        case "water": enqueue(["type": "water", "ml": Int(value("ml") ?? "") ?? 250])
        case "focus": enqueue(["type": "focus"])
        case "talk": enqueue(["type": "talk"])
        case "summary": enqueue(["type": "summary"])
        default: break // "open": just opening the app is enough
        }
    }

    private func flush() {
        guard pageReady, let webView, !pending.isEmpty else { return }
        let actions = pending
        pending.removeAll()
        for action in actions {
            guard let data = try? JSONSerialization.data(withJSONObject: action),
                  let json = String(data: data, encoding: .utf8) else { continue }
            webView.evaluateJavaScript("window.__mimiAction && window.__mimiAction(\(json));", completionHandler: nil)
        }
    }
}

/// Saves the page's summary for the widgets (App Group) and asks iOS to redraw them when it changes.
@MainActor
enum WidgetBridge {
    private static var last: WidgetSnapshot?
    private static var lastReload = Date.distantPast
    private static var reloadScheduled = false

    static func update(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else { return }
        var a = snap, b = last
        a.updatedAt = 0
        b?.updatedAt = 0
        guard a != b else { return }
        let urgent = snap.running != last?.running || snap.date != last?.date || last == nil
        last = snap
        guard snap.save() else { return } // no App Group (see ios/README.md): widgets show their setup note
        if urgent || Date().timeIntervalSince(lastReload) > 20 {
            reloadNow()
        } else if !reloadScheduled {
            reloadScheduled = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) { reloadNow() }
        }
    }

    private static func reloadNow() {
        reloadScheduled = false
        lastReload = Date()
        WidgetCenter.shared.reloadAllTimelines()
    }
}
