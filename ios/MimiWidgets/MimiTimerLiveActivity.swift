import ActivityKit
import SwiftUI
import WidgetKit

/// The running task timer in the Dynamic Island and on the Lock Screen.
/// Times are drawn with SwiftUI's live timer views, so they keep counting while the app is closed.
struct MimiTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MimiTimerAttributes.self) { context in
            LockScreenTimerView(state: context.state, stale: context.isStale)
                .activityBackgroundTint(Color(red: 0.06, green: 0.09, blue: 0.12))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let state = context.state
            let tint = Color(hex: state.colorHex) ?? .mimiCoral
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    MimiBadge(size: 44)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ElapsedText(state: state)
                        .font(.system(size: 26, weight: .semibold, design: .rounded).monospacedDigit())
                        .foregroundStyle(Color.mimiCoral)
                        .frame(maxWidth: 110, alignment: .trailing)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("FOCUSING")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text(state.title)
                            .font(.system(size: 15, weight: .semibold))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        PlanProgress(state: state, tint: tint)
                        HStack {
                            if !state.list.isEmpty {
                                Label(state.list, systemImage: "circle.fill")
                                    .labelStyle(DotLabelStyle(color: tint))
                            }
                            Spacer()
                            Text(planText(state))
                            Text("·")
                            Text("\(state.done)/\(state.total) done today")
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                MimiBadge(size: 22)
            } compactTrailing: {
                ElapsedText(state: state)
                    .font(.system(size: 13, weight: .semibold, design: .rounded).monospacedDigit())
                    .foregroundStyle(Color.mimiCoral)
                    .frame(maxWidth: 52)
            } minimal: {
                MimiBadge(size: 20)
            }
            .keylineTint(tint)
            .contentMargins(.horizontal, 8, for: .expanded)
        }
    }
}

/// Lock Screen / notification banner version.
private struct LockScreenTimerView: View {
    let state: MimiTimerAttributes.ContentState
    let stale: Bool

    var body: some View {
        let tint = Color(hex: state.colorHex) ?? .mimiCoral
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                MimiBadge(size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(stale ? "STILL RUNNING?" : "FOCUSING")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.6))
                    Text(state.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                ElapsedText(state: state)
                    .font(.system(size: 28, weight: .semibold, design: .rounded).monospacedDigit())
                    .foregroundStyle(Color.mimiCoral)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 120, alignment: .trailing)
            }
            PlanProgress(state: state, tint: tint)
            HStack {
                if !state.list.isEmpty {
                    Label(state.list, systemImage: "circle.fill").labelStyle(DotLabelStyle(color: tint))
                }
                Spacer()
                Text(planText(state))
                Text("·")
                Text("\(state.done)/\(state.total) done today")
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.white.opacity(0.65))
        }
        .padding(16)
    }
}

/// Time spent so far, counting up live (e.g. 12:34, then 1:02:03).
private struct ElapsedText: View {
    let state: MimiTimerAttributes.ContentState
    var body: some View {
        Text(timerInterval: state.startedAt...Date.distantFuture, countsDown: false, showsHours: true)
    }
}

/// Progress through the planned time, filling live; a calm full bar when there is no plan.
private struct PlanProgress: View {
    let state: MimiTimerAttributes.ContentState
    let tint: Color
    var body: some View {
        Group {
            if let end = state.plannedEnd, end > state.startedAt {
                ProgressView(timerInterval: state.startedAt...end, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
            } else {
                ProgressView(value: 1)
            }
        }
        .progressViewStyle(.linear)
        .tint(tint)
    }
}

/// Mimi: a cat face on a warm circle.
private struct MimiBadge: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors: [Color(red: 1, green: 0.96, blue: 0.93), Color(red: 1, green: 0.79, blue: 0.66)],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
            Image(systemName: "cat.fill")
                .font(.system(size: size * 0.52, weight: .semibold))
                .foregroundStyle(Color(red: 0.12, green: 0.13, blue: 0.15))
        }
        .frame(width: size, height: size)
    }
}

private struct DotLabelStyle: LabelStyle {
    let color: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) {
            configuration.icon.font(.system(size: 6)).foregroundStyle(color)
            configuration.title
        }
    }
}

private func planText(_ state: MimiTimerAttributes.ContentState) -> String {
    guard state.plannedMinutes > 0 else { return "No time plan" }
    let m = state.plannedMinutes
    return m >= 60 ? (m % 60 == 0 ? "\(m / 60) hr plan" : String(format: "%.1f hr plan", Double(m) / 60)) : "\(m) min plan"
}

extension Color {
    static let mimiCoral = Color(red: 1, green: 0.42, blue: 0.29)

    /// "#RRGGBB" → Color.
    init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}
