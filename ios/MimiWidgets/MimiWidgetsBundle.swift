import SwiftUI
import WidgetKit

@main
struct MimiWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MimiTimerLiveActivity()
        TodayWidget()
        NextTasksWidget()
        FocusWidget()
        WaterWidget()
        WeekWidget()
    }
}
