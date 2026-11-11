import Foundation
import UIKit
import WebKit

/// Keeps the checklist's data in a file inside the app:
/// Application Support/MimiChecklist/store.json (included in iCloud and computer backups of the iPhone).
///
/// The page (`local-runtime.js`) asks for everything with `{cmd: 'load'}` each time it loads, then sends
/// each change with `{cmd: 'set', key, value}` or `{cmd: 'remove', key}`. Changes are saved together
/// shortly after they happen, and right away when the app goes to the background.
///
/// For Google sync it also remembers when each item last changed, and when items were deleted
/// (meta.json), so two devices can be merged item by item: the newer change wins.
///
/// If the file can't be read, `load` fails and the page doesn't offer saving at all,
/// so a damaged or unreadable file is never overwritten.
final class NativeStore: NSObject, WKScriptMessageHandlerWithReply {
    static let handlerName = "mimiStore"
    static let shared = NativeStore()

    /// Items that sync: the page's database documents.
    static let syncedPrefix = "mimi-db:"
    static let userIdKey = "mimi-user-id"

    /// Called on the main thread after the page changes a synced item.
    var onLocalChange: (() -> Void)?

    private var data: [String: String] = [:]
    private var meta = Meta()
    private var loaded = false
    private var saveScheduled = false
    private let io = DispatchQueue(label: "mimi.store.io")

    struct Meta: Codable {
        /// When each synced item last changed (ms since 1970).
        var changed: [String: Double] = [:]
        /// When synced items were deleted (ms since 1970), so deletions sync too.
        var deleted: [String: Double] = [:]
    }

    private let folder: URL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("MimiChecklist", isDirectory: true)
    private var fileURL: URL { folder.appendingPathComponent("store.json", isDirectory: false) }
    private var metaURL: URL { folder.appendingPathComponent("meta.json", isDirectory: false) }

    private override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(flush),
                                               name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(flush),
                                               name: UIApplication.willTerminateNotification, object: nil)
    }

    // MARK: Messages from the page (main thread)

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard AppOrigin.isAppPage(message.frameInfo) else { return replyHandler(nil, "Not allowed.") }
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else {
            return replyHandler(nil, "Bad message.")
        }
        do {
            try loadIfNeeded()
        } catch {
            return replyHandler(nil, "Saved data could not be read: \(error.localizedDescription)")
        }

        switch cmd {
        case "load":
            guard let json = try? JSONSerialization.data(withJSONObject: data),
                  let text = String(data: json, encoding: .utf8) else {
                return replyHandler(nil, "Saved data could not be prepared.")
            }
            replyHandler(text, nil)
        case "set":
            guard let key = body["key"] as? String, let value = body["value"] as? String else {
                return replyHandler(nil, "Bad set.")
            }
            if data[key] != value {
                data[key] = value
                if key.hasPrefix(Self.syncedPrefix) {
                    meta.changed[key] = Self.now()
                    meta.deleted.removeValue(forKey: key)
                    onLocalChange?()
                }
                scheduleSave()
            }
            replyHandler(true, nil)
        case "remove":
            guard let key = body["key"] as? String else { return replyHandler(nil, "Bad remove.") }
            if data.removeValue(forKey: key) != nil {
                if key.hasPrefix(Self.syncedPrefix) {
                    meta.changed.removeValue(forKey: key)
                    meta.deleted[key] = Self.now()
                    onLocalChange?()
                }
                scheduleSave()
            }
            replyHandler(true, nil)
        default:
            replyHandler(nil, "Unknown command.")
        }
    }

    // MARK: Sync support (main thread)

    /// One synced item: its value (nil when deleted) and when it last changed.
    struct Entry: Equatable {
        var value: String?
        var time: Double
    }

    /// Every synced item, including deletions, plus this device's user id.
    func syncSnapshot() throws -> (entries: [String: Entry], userId: String?) {
        try loadIfNeeded()
        var out: [String: Entry] = [:]
        for (key, value) in data where key.hasPrefix(Self.syncedPrefix) {
            out[key] = Entry(value: value, time: meta.changed[key] ?? 0)
        }
        for (key, time) in meta.deleted where data[key] == nil {
            out[key] = Entry(value: nil, time: time)
        }
        return (out, data[Self.userIdKey])
    }

    /// Applies merged items from sync. Returns the page-level changes (key → value, or NSNull when removed).
    func applyFromSync(_ changes: [String: Entry], userId: String?) throws -> [String: Any] {
        try loadIfNeeded()
        var page: [String: Any] = [:]
        for (key, entry) in changes where key.hasPrefix(Self.syncedPrefix) {
            if let value = entry.value {
                data[key] = value
                meta.changed[key] = entry.time
                meta.deleted.removeValue(forKey: key)
                page[key] = value
            } else {
                data.removeValue(forKey: key)
                meta.changed.removeValue(forKey: key)
                meta.deleted[key] = entry.time
                page[key] = NSNull()
            }
        }
        if let userId, data[Self.userIdKey] != userId {
            data[Self.userIdKey] = userId
            page[Self.userIdKey] = userId
        }
        // Forget deletions older than 90 days.
        let cutoff = Self.now() - 90 * 86_400_000
        meta.deleted = meta.deleted.filter { $0.value > cutoff }
        if !page.isEmpty { saveScheduled = true; save(waitUntilDone: false) }
        return page
    }

    /// Moves this device's private items (notes, profile, vault) to another user id, before
    /// adopting the synced account's id.
    func renameUser(from old: String, to new: String) throws {
        try loadIfNeeded()
        let oldPrefix = Self.syncedPrefix + "data/users/\(old)/"
        let newPrefix = Self.syncedPrefix + "data/users/\(new)/"
        for key in data.keys where key.hasPrefix(oldPrefix) {
            let moved = newPrefix + key.dropFirst(oldPrefix.count)
            if data[moved] == nil {
                data[moved] = data[key]
                meta.changed[moved] = meta.changed[key] ?? Self.now()
            }
            data.removeValue(forKey: key)
            meta.changed.removeValue(forKey: key)
        }
        data[Self.userIdKey] = new
        saveScheduled = true
        save(waitUntilDone: false)
    }

    static func now() -> Double { (Date().timeIntervalSince1970 * 1000).rounded() }

    // MARK: Files

    private func loadIfNeeded() throws {
        guard !loaded else { return }
        if FileManager.default.fileExists(atPath: fileURL.path) {
            data = try JSONDecoder().decode([String: String].self, from: Data(contentsOf: fileURL))
        }
        if FileManager.default.fileExists(atPath: metaURL.path),
           let raw = try? Data(contentsOf: metaURL), let m = try? JSONDecoder().decode(Meta.self, from: raw) {
            meta = m
        }
        loaded = true
    }

    private func scheduleSave() {
        guard !saveScheduled else { return }
        saveScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in self?.save(waitUntilDone: false) }
    }

    @objc private func flush() {
        guard saveScheduled else { return }
        let task = UIApplication.shared.beginBackgroundTask(withName: "Save checklist")
        save(waitUntilDone: true)
        if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
    }

    private func save(waitUntilDone: Bool) {
        guard saveScheduled, loaded else { return }
        saveScheduled = false
        let snapshot = data, metaSnapshot = meta
        let folder = self.folder, fileURL = self.fileURL, metaURL = self.metaURL
        let write = {
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                try JSONEncoder().encode(snapshot)
                    .write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                try JSONEncoder().encode(metaSnapshot)
                    .write(to: metaURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            } catch {
                NSLog("Mimi Checklist: could not save data: %@", error.localizedDescription)
            }
        }
        if waitUntilDone { io.sync(execute: write) } else { io.async(execute: write) }
    }
}
