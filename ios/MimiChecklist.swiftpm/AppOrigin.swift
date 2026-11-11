import Foundation
import WebKit

/// The checklist is a web app bundled inside the app (the `Web` folder), opened from a file URL.
/// Only that page may use the native extras: saved data, microphone and speech,
/// notifications, haptics, clipboard and sharing.
enum AppOrigin {
    /// The bundled `Web` folder.
    static let webRoot: URL? = {
        for bundle in [Bundle.module, Bundle.main] {
            if let url = bundle.url(forResource: "Web", withExtension: nil) { return url }
        }
        return nil
    }()

    static var indexURL: URL? { webRoot?.appendingPathComponent("index.html") }

    private static let rootPath: String? = webRoot.map { $0.resolvingSymlinksInPath().standardizedFileURL.path }

    /// True for files inside the bundled `Web` folder.
    static func isAppFile(_ url: URL) -> Bool {
        guard url.isFileURL, let root = rootPath else { return false }
        let path = url.resolvingSymlinksInPath().standardizedFileURL.path
        return path == root || path.hasPrefix(root + "/")
    }

    /// True when a message or request comes from the bundled checklist page itself.
    static func isAppPage(_ frame: WKFrameInfo) -> Bool {
        guard frame.isMainFrame, frame.securityOrigin.protocol.lowercased() == "file" else { return false }
        guard let url = frame.request.url else { return false }
        return isAppFile(url)
    }
}
