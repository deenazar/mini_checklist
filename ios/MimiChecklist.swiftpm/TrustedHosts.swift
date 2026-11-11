import Foundation
import WebKit

/// Claude's own sites. Only these may use the native extras (microphone, speech,
/// notifications, haptics, clipboard) and stay inside the app.
enum TrustedHosts {
    static let domains = ["claude.ai", "claude.com", "anthropic.com", "claudeusercontent.com"]

    static func contains(_ host: String?) -> Bool {
        guard let host = host?.lowercased(), !host.isEmpty else { return false }
        return domains.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    /// True when a frame or permission request comes from a Claude page over HTTPS.
    static func contains(_ origin: WKSecurityOrigin) -> Bool {
        origin.protocol.lowercased() == "https" && contains(origin.host)
    }
}
