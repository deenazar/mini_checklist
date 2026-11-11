import Foundation
import WebKit
import UIKit
import UserNotifications

/// Small iPhone extras for the checklist page:
/// - `mimiNative.schedule([...])` turns task reminders into real iOS notifications,
///   so they ring even when the app is closed or the phone is locked.
/// - `navigator.vibrate(...)` becomes iPhone haptics (Safari on iPhone ignores vibrate).
/// - `mimiNative.copy(text)` copies to the clipboard (used by the password vault);
///   copied passwords clear themselves after 60 seconds.
final class NativeBridge: NSObject, WKScriptMessageHandler, UNUserNotificationCenterDelegate {
    static let handlerName = "mimiNative"
    static let idPrefix = "mimi-rem-"

    static let pageScript = #"""
    (function () {
      var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mimiNative;
      if (!h) return;
      window.mimiNative = {
        schedule: function (list) { h.postMessage({ cmd: 'schedule', list: Array.isArray(list) ? list.slice(0, 60) : [] }); },
        copy: function (text) { h.postMessage({ cmd: 'copy', text: String(text || '').slice(0, 4000) }); },
        haptic: function (kind) { h.postMessage({ cmd: 'haptic', kind: String(kind || 'light') }); }
      };
      try {
        navigator.vibrate = function (p) {
          var total = Array.isArray(p) ? p.reduce(function (a, b) { return a + (+b || 0); }, 0) : (+p || 0);
          h.postMessage({ cmd: 'haptic', kind: total >= 600 ? 'alarm' : total >= 300 ? 'warning' : 'light' });
          return true;
        };
      } catch (e) {}
    })();
    """#

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        // Only listen to Claude's own pages.
        guard TrustedHosts.contains(message.frameInfo.securityOrigin) else { return }

        switch cmd {
        case "schedule":
            schedule((body["list"] as? [[String: Any]]) ?? [])
        case "copy":
            let text = (body["text"] as? String) ?? ""
            UIPasteboard.general.setItems([["public.utf8-plain-text": text]],
                                          options: [.localOnly: true,
                                                    .expirationDate: Date().addingTimeInterval(60)])
            haptic("light")
        case "haptic":
            haptic((body["kind"] as? String) ?? "light")
        default:
            break
        }
    }

    // MARK: Haptics

    private func haptic(_ kind: String) {
        DispatchQueue.main.async {
            switch kind {
            case "alarm":
                let n = UINotificationFeedbackGenerator()
                n.notificationOccurred(.warning)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { n.notificationOccurred(.warning) }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { n.notificationOccurred(.error) }
            case "warning":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            case "success":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            default:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
    }

    // MARK: Reminders → iOS notifications

    private var askedPermission = false

    private func schedule(_ list: [[String: Any]]) {
        let center = UNUserNotificationCenter.current()
        let now = Date()
        let items: [(id: String, at: Date, title: String, body: String)] = list.compactMap { x in
            guard let id = x["id"] as? String, let ms = (x["at"] as? NSNumber)?.doubleValue else { return nil }
            let at = Date(timeIntervalSince1970: ms / 1000)
            guard at > now.addingTimeInterval(2), at < now.addingTimeInterval(9 * 86_400) else { return nil }
            let title = String(((x["title"] as? String) ?? "Reminder").prefix(120))
            let body = String(((x["body"] as? String) ?? "").prefix(200))
            return (Self.idPrefix + String(id.prefix(120)), at, title, body)
        }

        let apply = {
            center.getPendingNotificationRequests { pending in
                let old = pending.map(\.identifier).filter { $0.hasPrefix(Self.idPrefix) }
                center.removePendingNotificationRequests(withIdentifiers: old)
                for item in items {
                    let content = UNMutableNotificationContent()
                    content.title = item.title
                    content.subtitle = "Mimi Checklist"
                    content.body = item.body
                    content.sound = .default
                    content.interruptionLevel = .active
                    let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: item.at)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
                    center.add(UNNotificationRequest(identifier: item.id, content: content, trigger: trigger))
                }
            }
        }

        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                apply()
            case .notDetermined:
                guard !items.isEmpty else { return }
                // The settings callback runs on a background queue; keep the flag on the main thread.
                DispatchQueue.main.async {
                    guard !self.askedPermission else { return }
                    self.askedPermission = true
                    center.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in if ok { apply() } }
                }
            default:
                break
            }
        }
    }

    /// While the app is open, the page itself rings with Mimi, sound and the island,
    /// so iOS only files the notification quietly in Notification Center.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.list])
    }
}
