import CommonCrypto
import CryptoKit
import Foundation

/// Encrypts the synced checklist with the user's sync password before it leaves the iPhone.
///
/// Format (JSON, readable by WebCrypto too):
///   { "format": "mimi-sync-encrypted", "v": 1,
///     "kdf":    { "name": "PBKDF2-SHA256", "iterations": 210000, "salt": base64 },
///     "cipher": { "name": "AES-256-GCM", "iv": base64 },
///     "data":   base64(ciphertext + 16-byte tag),
///     "updatedAt": ISO 8601 }
/// Google only ever stores this envelope; without the password it can't be read.
enum SyncCrypto {
    static let iterations = 210_000

    enum CryptoError: LocalizedError {
        case badFormat, wrongPassword, keyDerivation
        var errorDescription: String? {
            switch self {
            case .badFormat: return "The synced data isn’t in a format this app understands."
            case .wrongPassword: return "That sync password doesn’t open your data."
            case .keyDerivation: return "Couldn’t prepare the encryption key."
            }
        }
    }

    struct Key {
        let key: SymmetricKey
        let salt: Data
        let iterations: Int
    }

    /// Slow on purpose (PBKDF2), so run it off the main thread.
    static func deriveKey(password: String, salt: Data, iterations: Int = iterations) throws -> Key {
        guard !password.isEmpty, !salt.isEmpty else { throw CryptoError.keyDerivation }
        var derived = [UInt8](repeating: 0, count: 32)
        let pw = Array(password.utf8)
        let status = salt.withUnsafeBytes { saltPtr -> Int32 in
            pw.withUnsafeBufferPointer { pwPtr -> Int32 in
                pwPtr.baseAddress!.withMemoryRebound(to: CChar.self, capacity: pw.count) { pwChars in
                    CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2),
                                         pwChars, pw.count,
                                         saltPtr.bindMemory(to: UInt8.self).baseAddress, salt.count,
                                         CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                                         UInt32(iterations),
                                         &derived, derived.count)
                }
            }
        }
        guard status == kCCSuccess else { throw CryptoError.keyDerivation }
        return Key(key: SymmetricKey(data: derived), salt: salt, iterations: iterations)
    }

    static func newSalt() -> Data {
        var raw = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, raw.count, &raw)
        return Data(raw)
    }

    static func seal(_ plain: Data, with key: Key) throws -> Data {
        let box = try AES.GCM.seal(plain, using: key.key, nonce: AES.GCM.Nonce())
        let envelope: [String: Any] = [
            "format": "mimi-sync-encrypted",
            "v": 1,
            "kdf": ["name": "PBKDF2-SHA256", "iterations": key.iterations, "salt": key.salt.base64EncodedString()],
            "cipher": ["name": "AES-256-GCM", "iv": Data(box.nonce).base64EncodedString()],
            "data": (box.ciphertext + box.tag).base64EncodedString(),
            "updatedAt": ISO8601DateFormatter().string(from: Date())
        ]
        return try JSONSerialization.data(withJSONObject: envelope, options: [.sortedKeys])
    }

    struct Envelope {
        let salt: Data
        let iterations: Int
        let iv: Data
        let sealed: Data
    }

    static func parse(_ raw: Data) throws -> Envelope {
        guard let json = (try? JSONSerialization.jsonObject(with: raw)) as? [String: Any],
              json["format"] as? String == "mimi-sync-encrypted",
              let kdf = json["kdf"] as? [String: Any], let cipher = json["cipher"] as? [String: Any],
              let salt = (kdf["salt"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let iterations = (kdf["iterations"] as? NSNumber)?.intValue, iterations >= 10_000,
              let iv = (cipher["iv"] as? String).flatMap({ Data(base64Encoded: $0) }), iv.count == 12,
              let sealed = (json["data"] as? String).flatMap({ Data(base64Encoded: $0) }), sealed.count >= 16 else {
            throw CryptoError.badFormat
        }
        return Envelope(salt: salt, iterations: iterations, iv: iv, sealed: sealed)
    }

    static func open(_ envelope: Envelope, with key: Key) throws -> Data {
        do {
            let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: envelope.iv),
                                            ciphertext: envelope.sealed.prefix(envelope.sealed.count - 16),
                                            tag: envelope.sealed.suffix(16))
            return try AES.GCM.open(box, using: key.key)
        } catch {
            throw CryptoError.wrongPassword
        }
    }
}
