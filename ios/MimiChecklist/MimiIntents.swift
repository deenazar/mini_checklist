import AppIntents
import Foundation

// Shortcuts for Siri, the Shortcuts app, Spotlight, the Action button and Back Tap
// (Settings › Accessibility › Touch › Back Tap › Double Tap › your shortcut).
// Each one opens Mimi Checklist and does the action there.

struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add a task"
    static var description = IntentDescription("Adds a task to today in Mimi Checklist.")
    static var openAppWhenRun = true

    @Parameter(title: "Task", requestValueDialog: "What should I add?")
    var task: String

    @MainActor
    func perform() async throws -> some IntentResult {
        ActionRouter.shared.enqueue(["type": "add", "text": task])
        return .result()
    }
}

struct LogWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "Log water"
    static var description = IntentDescription("Logs a glass of water in Mimi Checklist.")
    static var openAppWhenRun = true

    @Parameter(title: "Amount (ml)", default: 250, inclusiveRange: (10, 5000))
    var amount: Int

    @MainActor
    func perform() async throws -> some IntentResult {
        ActionRouter.shared.enqueue(["type": "water", "ml": amount])
        return .result()
    }
}

struct StartFocusIntent: AppIntent {
    static var title: LocalizedStringResource = "Start focus"
    static var description = IntentDescription("Starts the timer on your next task in Mimi Checklist.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ActionRouter.shared.enqueue(["type": "focus"])
        return .result()
    }
}

struct WhatsLeftIntent: AppIntent {
    static var title: LocalizedStringResource = "What's left today"
    static var description = IntentDescription("Mimi tells you how your day is going.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ActionRouter.shared.enqueue(["type": "summary"])
        return .result()
    }
}

struct TalkToMimiIntent: AppIntent {
    static var title: LocalizedStringResource = "Talk to Mimi"
    static var description = IntentDescription("Opens Mimi Checklist and starts listening.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ActionRouter.shared.enqueue(["type": "talk"])
        return .result()
    }
}

/// Ready-made shortcuts: they appear in the Shortcuts app and Spotlight, work with Siri, and can be picked
/// for the Action button. Phrases must mention the app's name.
struct MimiShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: AddTaskIntent(),
                    phrases: ["Add a task in \(.applicationName)", "Add to \(.applicationName)"],
                    shortTitle: "Add task", systemImageName: "plus.circle.fill")
        AppShortcut(intent: LogWaterIntent(),
                    phrases: ["Log water in \(.applicationName)", "I drank water \(.applicationName)"],
                    shortTitle: "Log water", systemImageName: "drop.fill")
        AppShortcut(intent: StartFocusIntent(),
                    phrases: ["Start focus in \(.applicationName)", "Start my next task in \(.applicationName)"],
                    shortTitle: "Start focus", systemImageName: "timer")
        AppShortcut(intent: WhatsLeftIntent(),
                    phrases: ["What's left in \(.applicationName)", "How is my day in \(.applicationName)"],
                    shortTitle: "What's left", systemImageName: "checklist")
        AppShortcut(intent: TalkToMimiIntent(),
                    phrases: ["Talk to \(.applicationName)", "Hey \(.applicationName)"],
                    shortTitle: "Talk to Mimi", systemImageName: "mic.fill")
    }
}
