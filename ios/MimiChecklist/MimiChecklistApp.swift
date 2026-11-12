import SwiftUI

@main
struct MimiChecklistApp: App {
    init() {
        // From launch, so tapping a notification works even when the app was closed.
        MainActor.assumeIsolated { NotificationRouter.shared.install() }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
