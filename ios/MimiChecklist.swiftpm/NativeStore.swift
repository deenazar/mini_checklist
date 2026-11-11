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
/// If the file can't be read, `load` fails and the page doesn't offer saving at all,
/// so a damaged or unreadable file is never overwritten.
final class NativeStore: NSObject, WKScriptMessageHandlerWithReply {
    static let handlerName = "mimiStore"
    static let shared = NativeStore()

    private var data: [String: String] = [:]
    private var loaded = false
    private var saveScheduled = false
    private let io = DispatchQueue(label: "mimi.store.io")

    private let fileURL: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("MimiChecklist", isDirectory: true)
            .appendingPathComponent("store.json", isDirectory: false)
    }()

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
            data[key] = value
            scheduleSave()
            replyHandler(true, nil)
        case "remove":
            guard let key = body["key"] as? String else { return replyHandler(nil, "Bad remove.") }
            if data.removeValue(forKey: key) != nil { scheduleSave() }
            replyHandler(true, nil)
        default:
            replyHandler(nil, "Unknown command.")
        }
    }

    // MARK: File

    private func loadIfNeeded() throws {
        guard !loaded else { return }
        if FileManager.default.fileExists(atPath: fileURL.path) {
            let raw = try Data(contentsOf: fileURL)
            data = try JSONDecoder().decode([String: String].self, from: raw)
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
        let snapshot = data
        let url = fileURL
        let write = {
            do {
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                        withIntermediateDirectories: true)
                let raw = try JSONEncoder().encode(snapshot)
                try raw.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            } catch {
                NSLog("Mimi Checklist: could not save data: %@", error.localizedDescription)
            }
        }
        if waitUntilDone { io.sync(execute: write) } else { io.async(execute: write) }
    }
}
