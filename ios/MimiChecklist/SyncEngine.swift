import Foundation
import UIKit
import WebKit

/// Google sign-in and encrypted sync of the checklist through Google Drive's hidden app folder.
///
/// - The page asks for actions with `mimiNative.account(action)`:
///   'status', 'signIn', 'signOut', 'syncNow', 'unlock'.
/// - The app tells the page how things stand with `window.__mimiSyncStatus({...})`.
/// - Data is encrypted with the user's sync password (kept in this iPhone's Keychain) before upload.
/// - Merging is per item: the newer change wins, deletions included. The first time a device syncs,
///   the copy in Google Drive wins any conflicts, so a new phone can't overwrite real data with an empty day.
@MainActor
final class SyncEngine {
    static let shared = SyncEngine()

    weak var webView: WKWebView?

    enum Phase: String { case off, locked, syncing, ok, error }

    private var phase: Phase = .off
    private var message = ""
    private var lastSync: Date? = UserDefaults.standard.object(forKey: "sync.last") as? Date
    private var key: SyncCrypto.Key?
    private var fileId: String?
    private var running = false
    private var again = false
    private var debounce: Task<Void, Never>?
    private var timer: Timer?

    private static let passwordKey = "sync.password"
    private var hasSyncedBefore: Bool {
        get { UserDefaults.standard.bool(forKey: "sync.hasSynced") }
        set { UserDefaults.standard.set(newValue, forKey: "sync.hasSynced") }
    }

    private init() {
        NativeStore.shared.onLocalChange = { [weak self] in self?.localChanged() }
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.appBecameActive() }
        }
        NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.appWentToBackground() }
        }
        if GoogleAuth.shared.isSignedIn { phase = Keychain.get(Self.passwordKey) == nil ? .locked : .ok }
    }

    // MARK: Actions from the page

    func handle(action: String) {
        switch action {
        case "signIn": Task { await signIn() }
        case "signOut": Task { await signOut() }
        case "syncNow": Task { await sync(reason: "manual") }
        case "unlock": Task { await unlock() }
        default: publish()
        }
    }

    // MARK: Triggers

    func appBecameActive() {
        guard GoogleAuth.shared.isSignedIn else { return }
        Task { await sync(reason: "open") }
        timer?.invalidate()
        // Changes sync right away on their own; this only picks up other devices' changes (battery-friendly).
        timer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { _ = Task { await self?.sync(reason: "timer") } }
        }
    }

    private func appWentToBackground() {
        timer?.invalidate()
        timer = nil
        guard GoogleAuth.shared.isSignedIn, debounce != nil else { return }
        debounce?.cancel()
        debounce = nil
        let task = UIApplication.shared.beginBackgroundTask(withName: "Sync checklist")
        Task {
            await sync(reason: "background")
            if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
        }
    }

    private func localChanged() {
        guard GoogleAuth.shared.isSignedIn else { return }
        debounce?.cancel()
        debounce = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled else { return }
            self?.debounce = nil
            await self?.sync(reason: "change")
        }
    }

    // MARK: Sign in / out

    private func signIn() async {
        guard GoogleAuth.shared.isConfigured else {
            set(.error, "Google sign-in isn’t set up in this build yet (see ios/README.md).")
            return
        }
        do {
            set(.syncing, "Signing in…")
            _ = try await GoogleAuth.shared.signIn()
            hasSyncedBefore = false
            key = nil
            fileId = nil
            Keychain.remove(Self.passwordKey)
            set(.locked, "")
            await unlock()
        } catch GoogleAuth.AuthError.cancelled {
            set(.off, "")
        } catch {
            set(GoogleAuth.shared.isSignedIn ? .error : .off, error.localizedDescription)
        }
    }

    private func signOut() async {
        await GoogleAuth.shared.signOut()
        Keychain.remove(Self.passwordKey)
        key = nil
        fileId = nil
        hasSyncedBefore = false
        timer?.invalidate()
        set(.off, "Signed out. Your checklist stays on this iPhone.")
    }

    /// Sets up the sync password: asks for the existing one if Google Drive already has data,
    /// or asks the user to create one.
    private func unlock() async {
        guard GoogleAuth.shared.isSignedIn else { return publish() }
        do {
            set(.syncing, "Checking Google Drive…")
            let remote = try await DriveClient().download()
            fileId = remote?.id
            if let remote {
                let envelope = try SyncCrypto.parse(remote.data)
                while true {
                    guard let answer = await Prompt.password(
                        title: "Enter your sync password",
                        message: "Your checklist in Google Drive is locked with the sync password you chose before.",
                        confirm: false, offerReset: true) else { return set(.locked, "Enter your sync password to turn on sync.") }
                    if answer == Prompt.resetToken {
                        guard await Prompt.confirm(
                            title: "Start over with a new password?",
                            message: "The copy in Google Drive will be replaced with this iPhone’s checklist, locked with a new password. Other devices will need the new password.",
                            action: "Start over") else { continue }
                        try await createPassword(replacing: remote.id)
                        break
                    }
                    let candidate = try await Self.derive(answer, salt: envelope.salt, iterations: envelope.iterations)
                    if (try? SyncCrypto.open(envelope, with: candidate)) != nil {
                        key = candidate
                        Keychain.set(answer, for: Self.passwordKey)
                        break
                    }
                    await Prompt.alert(title: "Wrong password", message: "That password doesn’t open your synced checklist. Try again.")
                }
            } else {
                try await createPassword(replacing: nil)
            }
            await sync(reason: "unlock")
        } catch {
            set(.error, error.localizedDescription)
        }
    }

    private func createPassword(replacing id: String?) async throws {
        guard let password = await Prompt.password(
            title: "Create a sync password",
            message: "Your checklist is encrypted with this password before it goes to Google Drive. You’ll need it on other devices. If you forget it, the synced copy can’t be opened.",
            confirm: true, offerReset: false) else {
            throw GoogleAuth.AuthError.failed("Sync is off until you create a sync password.")
        }
        key = try await Self.derive(password, salt: SyncCrypto.newSalt(), iterations: SyncCrypto.iterations)
        Keychain.set(password, for: Self.passwordKey)
        if let id { try await DriveClient().delete(id: id) }
        fileId = nil
        hasSyncedBefore = true // this device's data is the starting point
    }

    private static func derive(_ password: String, salt: Data, iterations: Int) async throws -> SyncCrypto.Key {
        try await Task.detached(priority: .userInitiated) {
            try SyncCrypto.deriveKey(password: password, salt: salt, iterations: iterations)
        }.value
    }

    // MARK: Sync

    func sync(reason: String) async {
        guard GoogleAuth.shared.isSignedIn else { return publish() }
        if running { again = true; return }
        running = true
        defer { running = false }
        repeat {
            again = false
            await syncOnce()
        } while again
    }

    private struct Payload: Codable {
        var v = 1
        var user: String?
        var entries: [String: Item] = [:]
        struct Item: Codable { var v: String?; var t: Double }
    }

    private func syncOnce() async {
        do {
            set(.syncing, "Syncing…")
            let drive = DriveClient()
            let remote = try await drive.download()
            if let remote { fileId = remote.id } else { fileId = nil }

            // Unlock with the saved password if needed.
            if key == nil {
                guard let password = Keychain.get(Self.passwordKey) else { return set(.locked, "Enter your sync password to turn on sync.") }
                if let remote {
                    let env = try SyncCrypto.parse(remote.data)
                    key = try await Self.derive(password, salt: env.salt, iterations: env.iterations)
                } else {
                    key = try await Self.derive(password, salt: SyncCrypto.newSalt(), iterations: SyncCrypto.iterations)
                }
            }
            guard var key else { return }

            var cloud = Payload()
            if let remote {
                let env = try SyncCrypto.parse(remote.data)
                if env.salt != key.salt || env.iterations != key.iterations {
                    // Another device set a new password: re-derive with the saved one, or ask.
                    guard let password = Keychain.get(Self.passwordKey) else { return set(.locked, "Enter your sync password.") }
                    key = try await Self.derive(password, salt: env.salt, iterations: env.iterations)
                    self.key = key
                }
                do {
                    cloud = try JSONDecoder().decode(Payload.self, from: SyncCrypto.open(env, with: key))
                } catch SyncCrypto.CryptoError.wrongPassword {
                    self.key = nil
                    Keychain.remove(Self.passwordKey)
                    return set(.locked, "The sync password changed on another device. Enter the new one.")
                }
            }

            // Same account everywhere: adopt the synced user id (keeps notes and profile together).
            let store = NativeStore.shared
            var snap = try store.syncSnapshot()
            var reload = false
            if let cloudUser = cloud.user, let localUser = snap.userId, cloudUser != localUser {
                try store.renameUser(from: localUser, to: cloudUser)
                snap = try store.syncSnapshot()
                reload = true
            }
            let user = cloud.user ?? snap.userId

            // Merge item by item: the newer change wins.
            let cloudWinsTies = true
            let firstSync = !hasSyncedBefore
            var toLocal: [String: NativeStore.Entry] = [:]
            var merged = cloud.entries
            var cloudChanged = cloud.user == nil && user != nil
            for path in Set(snap.entries.keys).union(cloud.entries.keys) {
                let local = snap.entries[path]
                let remoteItem = cloud.entries[path]
                switch (local, remoteItem) {
                case let (l?, nil):
                    merged[path] = .init(v: l.value, t: l.time)
                    cloudChanged = true
                case let (nil, r?):
                    if r.v != nil { toLocal[path] = .init(value: r.v, time: r.t) }
                case let (l?, r?):
                    if l.value == r.v { continue }
                    let remoteNewer = firstSync || r.t > l.time || (r.t == l.time && cloudWinsTies)
                    if remoteNewer {
                        toLocal[path] = .init(value: r.v, time: r.t)
                    } else {
                        merged[path] = .init(v: l.value, t: l.time)
                        cloudChanged = true
                    }
                case (nil, nil):
                    break
                }
            }
            // Drop old deletion markers from the cloud copy.
            let cutoff = NativeStore.now() - 90 * 86_400_000
            let beforePrune = merged.count
            merged = merged.filter { $0.value.v != nil || $0.value.t > cutoff }
            if merged.count != beforePrune { cloudChanged = true }

            // Apply to this iPhone and the open page.
            if !toLocal.isEmpty || reload {
                let pageChanges = try store.applyFromSync(toLocal, userId: user)
                if reload { webView?.reload() } else { pushToPage(pageChanges) }
            }

            // Upload when the cloud copy is missing or behind.
            if cloudChanged || remote == nil {
                let payload = Payload(v: 1, user: user, entries: merged)
                let sealed = try SyncCrypto.seal(try JSONEncoder().encode(payload), with: key)
                fileId = try await drive.upload(sealed, replacing: fileId)
            }

            hasSyncedBefore = true
            lastSync = Date()
            UserDefaults.standard.set(lastSync, forKey: "sync.last")
            set(.ok, "")
        } catch {
            set(.error, error.localizedDescription)
        }
    }

    // MARK: Page

    private func pushToPage(_ changes: [String: Any]) {
        guard let webView, !changes.isEmpty,
              let data = try? JSONSerialization.data(withJSONObject: changes),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__mimiStoreApply && window.__mimiStoreApply(\(json));", completionHandler: nil)
    }

    private func set(_ phase: Phase, _ message: String) {
        self.phase = phase
        self.message = message
        publish()
    }

    func publish() {
        let auth = GoogleAuth.shared
        let status: [String: Any] = [
            "available": true,
            "configured": auth.isConfigured,
            "signedIn": auth.isSignedIn,
            "email": auth.profile?.email ?? "",
            "name": auth.profile?.name ?? "",
            "picture": auth.profile?.picture ?? "",
            "phase": auth.isSignedIn ? phase.rawValue : (phase == .syncing ? "syncing" : (phase == .error ? "error" : "off")),
            "message": message,
            "lastSync": lastSync.map { ($0.timeIntervalSince1970 * 1000).rounded() } ?? NSNull()
        ]
        guard let webView, let data = try? JSONSerialization.data(withJSONObject: status),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__mimiSyncStatus && window.__mimiSyncStatus(\(json));", completionHandler: nil)
    }
}

/// Native prompts for the sync password (kept out of the web page).
@MainActor
enum Prompt {
    static let resetToken = "\u{0}reset"

    /// Asks for a password; with `confirm`, asks twice and checks they match. Returns nil if cancelled,
    /// or `resetToken` if the user chose “Forgot password?”.
    static func password(title: String, message: String, confirm: Bool, offerReset: Bool) async -> String? {
        var note = ""
        while true {
            let result: String? = await withCheckedContinuation { cont in
                let alert = UIAlertController(title: title, message: message + (note.isEmpty ? "" : "\n\n" + note), preferredStyle: .alert)
                alert.addTextField { f in f.isSecureTextEntry = true; f.placeholder = "Sync password"; f.textContentType = confirm ? .newPassword : .password }
                if confirm { alert.addTextField { f in f.isSecureTextEntry = true; f.placeholder = "Type it again"; f.textContentType = .newPassword } }
                alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in cont.resume(returning: nil) })
                if offerReset {
                    alert.addAction(UIAlertAction(title: "Forgot password?", style: .destructive) { _ in cont.resume(returning: resetToken) })
                }
                alert.addAction(UIAlertAction(title: confirm ? "Create" : "Unlock", style: .default) { _ in
                    let a = alert.textFields?.first?.text ?? ""
                    let b = confirm ? (alert.textFields?.last?.text ?? "") : a
                    cont.resume(returning: a == b ? a : "\u{0}mismatch")
                })
                guard let top = UIApplication.shared.mimiTopViewController() else { return cont.resume(returning: nil) }
                top.present(alert, animated: true)
            }
            guard let result else { return nil }
            if result == resetToken { return result }
            if result == "\u{0}mismatch" { note = "The two passwords didn’t match."; continue }
            if confirm && result.count < 8 { note = "Use at least 8 characters."; continue }
            if result.isEmpty { note = "Type your password."; continue }
            return result
        }
    }

    static func confirm(title: String, message: String, action: String) async -> Bool {
        await withCheckedContinuation { cont in
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in cont.resume(returning: false) })
            alert.addAction(UIAlertAction(title: action, style: .destructive) { _ in cont.resume(returning: true) })
            guard let top = UIApplication.shared.mimiTopViewController() else { return cont.resume(returning: false) }
            top.present(alert, animated: true)
        }
    }

    static func alert(title: String, message: String) async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in cont.resume() })
            guard let top = UIApplication.shared.mimiTopViewController() else { return cont.resume() }
            top.present(alert, animated: true)
        }
    }
}
