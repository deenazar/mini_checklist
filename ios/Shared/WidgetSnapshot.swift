import Foundation

/// Today's summary for the widgets. The page sends it to the app (`mimiNative.widgets`), the app saves it in the
/// shared App Group folder, and the widget extension reads it.
struct WidgetSnapshot: Codable, Equatable {
    struct Task: Codable, Hashable {
        var text: String
        var color: String
        var minutes: Int
        var priority: Int
    }
    struct Day: Codable, Hashable {
        var label: String
        var value: Double
        var today: Bool
    }
    struct Running: Codable, Hashable {
        var title: String
        var startedAt: Double // ms since 1970, as if the timer had never paused
        var plannedMinutes: Int
    }

    var date: String          // yyyy-MM-dd in India
    var done: Int
    var total: Int
    var next: [Task]
    var waterMl: Int
    var waterGoalMl: Int
    var waterUnit: String
    var week: [Day]
    var streak: Int
    var focusMinutes: Int
    var running: Running?
    var updatedAt: Double

    static let placeholder = WidgetSnapshot(
        date: WidgetSnapshot.todayKey(), done: 3, total: 5,
        next: [Task(text: "Morning walk", color: "#E5484D", minutes: 30, priority: 1),
               Task(text: "Study session", color: "#3B82F6", minutes: 45, priority: 2),
               Task(text: "Call mom", color: "#8B5CF6", minutes: 0, priority: 2)],
        waterMl: 1250, waterGoalMl: 2500, waterUnit: "ml",
        week: ["M", "T", "W", "T", "F", "S", "S"].enumerated().map { Day(label: $1, value: [0.6, 0.8, 0.4, 1, 0.7, 0.5, 0.6][$0], today: $0 == 6) },
        streak: 4, focusMinutes: 95, running: nil, updatedAt: 0)

    // MARK: Shared storage

    /// The App Group shared by the app and its widgets (Info.plist key `MimiAppGroup`).
    static var groupID: String? {
        guard let id = Bundle.main.object(forInfoDictionaryKey: "MimiAppGroup") as? String, id.hasPrefix("group.") else { return nil }
        return id
    }

    static var fileURL: URL? {
        guard let groupID,
              let folder = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        return folder.appendingPathComponent("widget.json")
    }

    static func load() -> WidgetSnapshot? {
        guard let url = fileURL, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    /// Saves it; returns false when the App Group isn't available.
    @discardableResult
    func save() -> Bool {
        guard let url = Self.fileURL, let data = try? JSONEncoder().encode(self) else { return false }
        return (try? data.write(to: url, options: .atomic)) != nil
    }

    // MARK: Helpers

    /// True when this summary is for today (India time); otherwise the widgets show a fresh day.
    var isToday: Bool { date == Self.todayKey() }

    static func todayKey(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = TimeZone(identifier: "Asia/Kolkata")
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    var fraction: Double { total > 0 ? Double(done) / Double(total) : 0 }
    var waterFraction: Double { waterGoalMl > 0 ? min(1, Double(waterMl) / Double(waterGoalMl)) : 0 }

    func waterText(_ ml: Int) -> String {
        guard waterUnit == "L" else { return "\(ml) ml" }
        let n = NumberFormatter()
        n.minimumFractionDigits = 0
        n.maximumFractionDigits = 2
        return (n.string(from: NSNumber(value: Double(ml) / 1000)) ?? "0") + " L"
    }
}
