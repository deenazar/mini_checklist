import Foundation
import UIKit
import UserNotifications
import WebKit

/// Mimi's notifications, all scheduled on the iPhone (no server needed):
/// - task reminders (scheduled by NativeBridge from the page, ids "mimi-rem-…"),
/// - the daily planning reminder: “Plan your day with Mimi” at a time you choose (id "mimi-plan-daily").
///
/// It's the notification center's delegate from launch, so tapping a notification works even when the app
/// was closed: the planning reminder opens the app ready to add tasks.
/// The daily planning reminder's id (a plain constant, usable from the delegate callbacks).
let mimiDailyPlanID = "mimi-plan-daily"

@MainActor
final class NotificationRouter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationRouter()

    weak var webView: WKWebView?

    /// Call once at launch.
    func install() {
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: Daily planning reminder

    /// `on` with "HH:mm" schedules it every day; off removes it. Asks for permission the first time.
    func setDailyPlan(on: Bool, time: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [mimiDailyPlanID])
        guard on else { return publishStatus() }
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2, (0..<24).contains(parts[0]), (0..<60).contains(parts[1]) else { return }
        let content = UNMutableNotificationContent()
        content.title = "Plan your day with Mimi 🐾"
        content.body = "What’s on your list today? Tap to add your tasks."
        content.sound = .default
        content.interruptionLevel = .active
        content.threadIdentifier = "mimi-plan"
        var when = DateComponents()
        when.hour = parts[0]
        when.minute = parts[1]
        let request = UNNotificationRequest(identifier: mimiDailyPlanID, content: content,
                                            trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: true))
        Task {
            let granted = await self.ensurePermission()
            if granted { try? await center.add(request) }
            self.publishStatus()
        }
    }

    /// Asks for permission if it hasn't been asked yet; true when notifications are allowed.
    func ensurePermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        default:
            return false
        }
    }

    /// Tells the page whether notifications are allowed: window.__mimiNotifStatus('on' | 'off' | 'ask').
    func publishStatus() {
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            let state: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: state = "on"
            case .notDetermined: state = "ask"
            default: state = "off"
            }
            self.webView?.evaluateJavaScript("window.__mimiNotifStatus && window.__mimiNotifStatus('\(state)');", completionHandler: nil)
        }
    }

    /// Opens this app's notification settings in the Settings app.
    func openSettings() {
        if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    // MARK: UNUserNotificationCenterDelegate

    /// While the app is open: task reminders ring inside the page (Mimi, sound), so iOS only files them in
    /// Notification Center; the planning reminder shows as a normal banner.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if notification.request.identifier == mimiDailyPlanID {
            completionHandler([.banner, .sound, .list])
        } else {
            completionHandler([.list])
        }
    }

    /// A notification was tapped.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                            withCompletionHandler completionHandler: @escaping () -> Void) {
        let id = response.notification.request.identifier
        Task { @MainActor in
            if id == mimiDailyPlanID {
                ActionRouter.shared.enqueue(["type": "add", "text": ""])
            }
            completionHandler()
        }
    }
}
