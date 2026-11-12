import ActivityKit
import Foundation

/// The Live Activity for a running task timer: shown in the Dynamic Island and on the Lock Screen.
/// Shared by the app (which starts, updates and ends it) and the widget extension (which draws it).
struct MimiTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// The task's name.
        var title: String
        /// The task's list, e.g. "Learning", and its colour as "#RRGGBB".
        var list: String
        var colorHex: String
        /// When the timer would have started if it had never been paused (now − time spent).
        var startedAt: Date
        /// Planned minutes for the task; 0 means no plan.
        var plannedMinutes: Int
        /// Today's progress.
        var done: Int
        var total: Int

        /// When the planned time runs out, if there is a plan.
        var plannedEnd: Date? {
            plannedMinutes > 0 ? startedAt.addingTimeInterval(TimeInterval(plannedMinutes * 60)) : nil
        }
    }

    /// The task this activity belongs to.
    var taskId: String
}
