import SwiftUI
import WidgetKit

// Home Screen and Lock Screen widgets. They read today's summary that the app saves in the shared App Group
// (WidgetSnapshot), refresh when the app sends changes, and open the app (with an action) when tapped.
//
//   Today        small · Lock Screen circle, line and inline   progress ring, what's left
//   Next tasks   medium · large                                the next tasks, + Add
//   Focus        small                                         the running timer, or start the next task
//   Water        small · Lock Screen circle                    today's water, tap to log a glass
//   Week         medium                                        this week's bars, streak, focus time

// MARK: Timeline

struct MimiEntry: TimelineEntry {
    let date: Date
    let snap: WidgetSnapshot
    /// False when the app hasn't shared anything yet (not opened since installing, or no App Group).
    let ready: Bool

    /// The summary as of now: a new day starts empty until the app is opened.
    var today: WidgetSnapshot {
        guard !snap.isToday else { return snap }
        var s = snap
        s.done = 0; s.total = 0; s.next = []; s.waterMl = 0; s.focusMinutes = 0
        return s
    }
}

struct MimiProvider: TimelineProvider {
    func placeholder(in context: Context) -> MimiEntry {
        MimiEntry(date: Date(), snap: .placeholder, ready: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (MimiEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MimiEntry>) -> Void) {
        let now = Date()
        // Refresh at midnight (India) for the new day, and every half hour anyway.
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        let midnight = cal.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0, second: 5), matchingPolicy: .nextTime) ?? now.addingTimeInterval(3600)
        let next = min(midnight, now.addingTimeInterval(30 * 60))
        completion(Timeline(entries: [current(now)], policy: .after(next)))
    }

    private func current(_ date: Date = Date()) -> MimiEntry {
        if let snap = WidgetSnapshot.load() { return MimiEntry(date: date, snap: snap, ready: true) }
        return MimiEntry(date: date, snap: .placeholder, ready: false)
    }
}

// MARK: Look

private enum Palette {
    static let coral = Color(red: 1, green: 0.42, blue: 0.29)
    static let teal = Color(red: 0.17, green: 0.77, blue: 0.75)
    static let lime = Color(red: 0.36, green: 0.72, blue: 0.18)
    static let water = Color(red: 0.12, green: 0.56, blue: 0.88)
    static let sun = Color(red: 1, green: 0.76, blue: 0.3)
    static let ink = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.93, alpha: 1) : UIColor(red: 0.06, green: 0.13, blue: 0.16, alpha: 1) })
    static let sec = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.62, alpha: 1) : UIColor(red: 0.37, green: 0.43, blue: 0.46, alpha: 1) })
    static let track = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.12) : UIColor(red: 0.06, green: 0.13, blue: 0.16, alpha: 0.08) })
    static let background = LinearGradient(
        colors: [Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.08, green: 0.12, blue: 0.16, alpha: 1) : UIColor(red: 0.97, green: 0.98, blue: 1, alpha: 1) }),
                 Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.05, green: 0.09, blue: 0.11, alpha: 1) : UIColor(red: 0.93, green: 0.96, blue: 0.97, alpha: 1) })],
        startPoint: .top, endPoint: .bottom)
}

/// Mimi: a cat face on a warm circle.
private struct Cat: View {
    var size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors: [Color(red: 1, green: 0.96, blue: 0.93), Color(red: 1, green: 0.79, blue: 0.66)],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
            Image(systemName: "cat.fill")
                .font(.system(size: size * 0.52, weight: .semibold))
                .foregroundStyle(Color(red: 0.16, green: 0.14, blue: 0.13))
        }
        .frame(width: size, height: size)
    }
}

private struct Ring: View {
    var value: Double
    var color: Color
    var width: CGFloat = 8
    var body: some View {
        ZStack {
            Circle().stroke(Palette.track, lineWidth: width)
            Circle().trim(from: 0, to: max(0.001, min(1, value)))
                .stroke(color, style: StrokeStyle(lineWidth: width, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

private struct SetUpNote: View {
    var body: some View {
        VStack(spacing: 6) {
            Cat(size: 34)
            Text("Open Mimi Checklist once to fill this widget.")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.sec)
                .multilineTextAlignment(.center)
        }
    }
}

private func url(_ path: String) -> URL { URL(string: "mimichecklist://\(path)")! }

private func leftText(_ s: WidgetSnapshot) -> String {
    if s.total == 0 { return "Nothing planned" }
    let left = s.total - s.done
    return left == 0 ? "All done 🎉" : "\(left) left"
}

// MARK: 1. Today

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MimiToday", provider: MimiProvider()) { entry in
            TodayView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("Your progress today, and what's left.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

private struct TodayView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MimiEntry

    var body: some View {
        let s = entry.today
        switch family {
        case .accessoryCircular:
            Gauge(value: s.fraction) { Image(systemName: "cat.fill") } currentValueLabel: { Text("\(s.done)/\(s.total)") }
                .gaugeStyle(.accessoryCircular)
                .widgetURL(url("open"))
                .containerBackground(.clear, for: .widget)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Label("Mimi · \(s.done)/\(s.total) done", systemImage: "cat.fill").font(.headline)
                Text(s.next.first.map { "Next: \($0.text)" } ?? leftText(s)).font(.caption).lineLimit(2)
            }
            .widgetURL(url("open"))
            .containerBackground(.clear, for: .widget)
        case .accessoryInline:
            Text("✓ \(s.done)/\(s.total)" + (s.next.first.map { " · \($0.text)" } ?? ""))
                .widgetURL(url("open"))
                .containerBackground(.clear, for: .widget)
        default:
            Group {
                if entry.ready {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("TODAY").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.sec)
                            Spacer()
                            Cat(size: 24)
                        }
                        ZStack {
                            Ring(value: s.fraction, color: s.total > 0 && s.done == s.total ? Palette.lime : Palette.coral, width: 9)
                            VStack(spacing: 0) {
                                Text("\(s.done)/\(s.total)").font(.system(size: 22, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                                Text("done").font(.system(size: 10, weight: .semibold)).foregroundStyle(Palette.sec)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        Text(leftText(s)).font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.ink).lineLimit(1)
                    }
                } else { SetUpNote() }
            }
            .widgetURL(url("open"))
            .containerBackground(Palette.background, for: .widget)
        }
    }
}

// MARK: 2. Next tasks

struct NextTasksWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MimiNext", provider: MimiProvider()) { entry in
            NextTasksView(entry: entry)
        }
        .configurationDisplayName("Next tasks")
        .description("Your next tasks for today, with a quick add button.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

private struct NextTasksView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MimiEntry

    var body: some View {
        let s = entry.today
        let rows = family == .systemLarge ? 6 : 3
        Group {
            if entry.ready {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Cat(size: 26)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Today").font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.ink)
                            Text("\(s.done) of \(s.total) done").font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.sec)
                        }
                        Spacer()
                        Link(destination: url("add")) {
                            Label("Add", systemImage: "plus")
                                .font(.system(size: 13, weight: .semibold))
                                .padding(.horizontal, 12).padding(.vertical, 6)
                                .background(Capsule().fill(Palette.coral))
                                .foregroundStyle(.white)
                        }
                    }
                    ProgressView(value: s.fraction).tint(Palette.teal)
                    if s.next.isEmpty {
                        Spacer(minLength: 0)
                        Text(s.total > 0 ? "Everything's done today. Lovely! 🎉" : "Nothing planned yet. Tap Add.")
                            .font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.sec)
                        Spacer(minLength: 0)
                    } else {
                        ForEach(Array(s.next.prefix(rows).enumerated()), id: \.offset) { _, t in
                            HStack(spacing: 8) {
                                Circle().strokeBorder(Color(hex: t.color) ?? Palette.coral, lineWidth: 2).frame(width: 14, height: 14)
                                Text(t.text).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.ink).lineLimit(1)
                                Spacer(minLength: 4)
                                if t.minutes > 0 {
                                    Text(t.minutes >= 60 ? "\(t.minutes / 60)h\(t.minutes % 60 > 0 ? " \(t.minutes % 60)m" : "")" : "\(t.minutes)m")
                                        .font(.system(size: 11, weight: .medium, design: .monospaced)).foregroundStyle(Palette.sec)
                                }
                            }
                        }
                        Spacer(minLength: 0)
                    }
                }
            } else { SetUpNote() }
        }
        .widgetURL(url("open"))
        .containerBackground(Palette.background, for: .widget)
    }
}

// MARK: 3. Focus

struct FocusWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MimiFocus", provider: MimiProvider()) { entry in
            FocusView(entry: entry)
        }
        .configurationDisplayName("Focus")
        .description("Your running task timer, or start the next task.")
        .supportedFamilies([.systemSmall])
    }
}

private struct FocusView: View {
    let entry: MimiEntry

    var body: some View {
        let s = entry.today
        Group {
            if let r = s.running {
                let start = Date(timeIntervalSince1970: r.startedAt / 1000)
                VStack(alignment: .leading, spacing: 6) {
                    Text("FOCUSING").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.coral)
                    Text(r.title).font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.ink).lineLimit(2)
                    Spacer(minLength: 0)
                    Text(timerInterval: start...Date.distantFuture, countsDown: false)
                        .font(.system(size: 28, weight: .bold, design: .rounded).monospacedDigit())
                        .foregroundStyle(Palette.coral)
                    if r.plannedMinutes > 0 {
                        ProgressView(timerInterval: start...start.addingTimeInterval(TimeInterval(r.plannedMinutes * 60)), countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                            .tint(Palette.coral)
                    }
                }
                .widgetURL(url("open"))
            } else if entry.ready {
                VStack(alignment: .leading, spacing: 6) {
                    HStack { Text("FOCUS").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.sec); Spacer(); Cat(size: 24) }
                    Spacer(minLength: 0)
                    Text(s.next.first?.text ?? "Nothing left today")
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.ink).lineLimit(2)
                    HStack(spacing: 6) {
                        Image(systemName: "play.fill")
                        Text(s.next.isEmpty ? "Open Mimi" : "Start focus")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Capsule().fill(Palette.coral))
                    .foregroundStyle(.white)
                    Text("\(s.focusMinutes) min focused today").font(.system(size: 10, weight: .medium)).foregroundStyle(Palette.sec)
                }
                .widgetURL(url(s.next.isEmpty ? "open" : "focus"))
            } else { SetUpNote().widgetURL(url("open")) }
        }
        .containerBackground(Palette.background, for: .widget)
    }
}

// MARK: 4. Water

struct WaterWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MimiWater", provider: MimiProvider()) { entry in
            WaterView(entry: entry)
        }
        .configurationDisplayName("Water")
        .description("Today's water. Tap to log a glass (250 ml).")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

private struct WaterView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MimiEntry

    var body: some View {
        let s = entry.today
        if family == .accessoryCircular {
            Gauge(value: s.waterFraction) { Image(systemName: "drop.fill") } currentValueLabel: { Image(systemName: "drop.fill") }
                .gaugeStyle(.accessoryCircular)
                .widgetURL(url("water?ml=250"))
                .containerBackground(.clear, for: .widget)
        } else {
            Group {
                if entry.ready {
                    VStack(spacing: 6) {
                        HStack {
                            Text("WATER").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.sec)
                            Spacer()
                            Image(systemName: "drop.fill").foregroundStyle(Palette.water)
                        }
                        ZStack {
                            Ring(value: s.waterFraction, color: Palette.water, width: 9)
                            VStack(spacing: 0) {
                                Text("\(Int((s.waterFraction * 100).rounded()))%").font(.system(size: 20, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                                Text(s.waterText(s.waterMl)).font(.system(size: 9.5, weight: .semibold)).foregroundStyle(Palette.sec)
                            }
                        }
                        Text("Tap: +250 ml")
                            .font(.system(size: 11, weight: .semibold))
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Capsule().fill(Palette.water.opacity(0.15)))
                            .foregroundStyle(Palette.water)
                    }
                } else { SetUpNote() }
            }
            .widgetURL(url(entry.ready ? "water?ml=250" : "open"))
            .containerBackground(Palette.background, for: .widget)
        }
    }
}

// MARK: 5. Week

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MimiWeek", provider: MimiProvider()) { entry in
            WeekView(entry: entry)
        }
        .configurationDisplayName("Week")
        .description("Your week at a glance: daily progress, streak and focus time.")
        .supportedFamilies([.systemMedium])
    }
}

private struct WeekView: View {
    let entry: MimiEntry

    var body: some View {
        let s = entry.today
        Group {
            if entry.ready {
                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 8) {
                        Cat(size: 30)
                        Text("This week").font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.ink)
                        Label("\(s.streak)-day streak", systemImage: "flame.fill").font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.coral)
                        Label("\(s.focusMinutes) min today", systemImage: "timer").font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.teal)
                    }
                    HStack(alignment: .bottom, spacing: 7) {
                        ForEach(Array(s.week.enumerated()), id: \.offset) { _, d in
                            VStack(spacing: 4) {
                                GeometryReader { g in
                                    ZStack(alignment: .bottom) {
                                        RoundedRectangle(cornerRadius: 5).fill(Palette.track)
                                        RoundedRectangle(cornerRadius: 5)
                                            .fill(d.today ? AnyShapeStyle(LinearGradient(colors: [Palette.sun, Palette.coral], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(Palette.teal))
                                            .frame(height: max(4, g.size.height * min(1, max(0, d.value))))
                                    }
                                }
                                Text(d.label).font(.system(size: 10, weight: .bold)).foregroundStyle(d.today ? Palette.coral : Palette.sec)
                            }
                        }
                    }
                }
            } else { SetUpNote() }
        }
        .widgetURL(url("open"))
        .containerBackground(Palette.background, for: .widget)
    }
}
