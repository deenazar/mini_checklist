import ActivityKit
import Foundation

/// Starts, updates and ends the task-timer Live Activity when the page says the running task changed.
/// The page sends `{state: 'run', id, title, list, color, startedAt (ms), plannedMin, done, total}`
/// or `{state: 'end'}` through `mimiNative.activity(...)`.
@MainActor
final class LiveActivityController {
    static let shared = LiveActivityController()

    private var current: Activity<MimiTimerAttributes>?

    private init() {
        // Pick up an activity left running from the last time the app was open.
        current = Activity<MimiTimerAttributes>.activities.first
        // Only one at a time: end any extras.
        for extra in Activity<MimiTimerAttributes>.activities.dropFirst() {
            Task { await extra.end(nil, dismissalPolicy: .immediate) }
        }
    }

    func handle(_ message: [String: Any]) {
        guard (message["state"] as? String) == "run",
              let id = message["id"] as? String,
              let startedMs = (message["startedAt"] as? NSNumber)?.doubleValue else {
            end()
            return
        }
        let state = MimiTimerAttributes.ContentState(
            title: String(((message["title"] as? String) ?? "Focus").prefix(60)),
            list: String(((message["list"] as? String) ?? "").prefix(30)),
            colorHex: (message["color"] as? String) ?? "#FF6B4A",
            startedAt: Date(timeIntervalSince1970: startedMs / 1000),
            plannedMinutes: max(0, (message["plannedMin"] as? NSNumber)?.intValue ?? 0),
            done: max(0, (message["done"] as? NSNumber)?.intValue ?? 0),
            total: max(0, (message["total"] as? NSNumber)?.intValue ?? 0)
        )
        start(taskId: String(id.prefix(120)), state: state)
    }

    private func start(taskId: String, state: MimiTimerAttributes.ContentState) {
        // Stale a few hours after it should have ended, so iOS dims a forgotten timer.
        let stale = (state.plannedEnd ?? state.startedAt).addingTimeInterval(4 * 3600)
        let content = ActivityContent(state: state, staleDate: stale)

        if let activity = current, activity.attributes.taskId == taskId, activity.activityState == .active {
            Task { await activity.update(content) }
            return
        }
        end()
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        do {
            current = try Activity.request(attributes: MimiTimerAttributes(taskId: taskId), content: content, pushType: nil)
        } catch {
            NSLog("Mimi Checklist: could not start the Live Activity: %@", error.localizedDescription)
        }
    }

    func end() {
        guard let activity = current else { return }
        current = nil
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }
}
