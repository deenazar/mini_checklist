import SwiftUI

/// The checklist page this app opens.
let checklistURL = URL(string: "https://claude.ai/artifact/HPnWLxmpMNayHV278scX6m")!

struct ContentView: View {
    @StateObject private var model = WebModel()

    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground).ignoresSafeArea()

            ChecklistWebView(model: model)
                .ignoresSafeArea(.container, edges: .bottom)
                .opacity(model.firstLoadDone ? 1 : 0)
                .animation(.easeOut(duration: 0.35), value: model.firstLoadDone)

            if !model.firstLoadDone && model.error == nil {
                SplashView()
                    .transition(.opacity)
            }

            if let error = model.error {
                OfflineView(message: error) { model.reload() }
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: model.error)
    }
}

private struct SplashView: View {
    @State private var bounce = false
    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "checklist")
                .font(.system(size: 54, weight: .semibold))
                .foregroundStyle(Color("AccentColor"))
                .scaleEffect(bounce ? 1.08 : 0.94)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: bounce)
            Text("Mimi Checklist")
                .font(.title2.weight(.bold))
            ProgressView()
        }
        .onAppear { bounce = true }
    }
}

private struct OfflineView: View {
    let message: String
    let retry: () -> Void
    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 46, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("Can’t reach your checklist")
                .font(.title3.weight(.bold))
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button(action: retry) {
                Label("Try again", systemImage: "arrow.clockwise")
                    .font(.headline)
                    .padding(.horizontal, 22)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color("AccentColor"))
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .systemBackground))
    }
}
