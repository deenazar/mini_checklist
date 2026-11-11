import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

/// Google sign-in for the app, using OAuth 2.0 with PKCE in the system sign-in sheet
/// (ASWebAuthenticationSession). Google allows this, unlike sign-in inside a web view.
///
/// Needs an iOS OAuth client ID from Google Cloud Console, set as GOOGLE_CLIENT_ID in
/// ios/Config/Local.xcconfig (it reaches the app as the Info.plist key `MimiGoogleClientID`).
/// Asks only for the user's name and email, and for the app's own hidden folder in Google Drive
/// (drive.appdata): the app cannot see any other files.
@MainActor
final class GoogleAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleAuth()

    struct Profile: Codable, Equatable {
        var email: String
        var name: String
        var picture: String
    }

    enum AuthError: LocalizedError {
        case notConfigured, cancelled, failed(String)
        var errorDescription: String? {
            switch self {
            case .notConfigured: return "Google sign-in isn’t set up in this build of the app yet."
            case .cancelled: return "Sign-in was cancelled."
            case .failed(let why): return why
            }
        }
    }

    private static let scopes = "openid email profile https://www.googleapis.com/auth/drive.appdata"
    private static let refreshKey = "google.refreshToken"
    private static let profileKey = "google.profile"

    private var accessToken: String?
    private var accessExpiry = Date.distantPast
    private var session: ASWebAuthenticationSession?

    private(set) var profile: Profile? = {
        guard let raw = Keychain.get(GoogleAuth.profileKey), let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Profile.self, from: data)
    }()

    var isSignedIn: Bool { Keychain.get(Self.refreshKey) != nil }

    /// The iOS client ID, if this build has one.
    var clientID: String? {
        guard let id = Bundle.main.object(forInfoDictionaryKey: "MimiGoogleClientID") as? String else { return nil }
        let trimmed = id.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.hasSuffix(".apps.googleusercontent.com") ? trimmed : nil
    }

    var isConfigured: Bool { clientID != nil }

    /// Google's redirect for iOS clients: the client ID reversed, e.g. com.googleusercontent.apps.123-abc
    private var redirectScheme: String? {
        clientID.map { "com.googleusercontent.apps." + $0.replacingOccurrences(of: ".apps.googleusercontent.com", with: "") }
    }

    // MARK: Sign in / out

    func signIn() async throws -> Profile {
        guard let clientID, let scheme = redirectScheme else { throw AuthError.notConfigured }
        let redirect = scheme + ":/oauth2redirect"
        let verifier = Self.randomURLSafe(48)
        let challenge = Self.base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
        let state = Self.randomURLSafe(24)

        var auth = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        auth.queryItems = [
            .init(name: "client_id", value: clientID),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: Self.scopes),
            .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256"),
            .init(name: "state", value: state),
            .init(name: "prompt", value: "select_account")
        ]

        let callback: URL = try await withCheckedThrowingContinuation { cont in
            let session = ASWebAuthenticationSession(url: auth.url!, callbackURLScheme: scheme) { url, error in
                if let url { cont.resume(returning: url) }
                else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    cont.resume(throwing: AuthError.cancelled)
                } else {
                    cont.resume(throwing: AuthError.failed(error?.localizedDescription ?? "Sign-in failed."))
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() { cont.resume(throwing: AuthError.failed("The sign-in sheet couldn’t open.")) }
        }
        session = nil

        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        if let err = items.first(where: { $0.name == "error" })?.value { throw AuthError.failed("Google said: \(err)") }
        guard items.first(where: { $0.name == "state" })?.value == state,
              let code = items.first(where: { $0.name == "code" })?.value else {
            throw AuthError.failed("Google’s answer didn’t match. Please try again.")
        }

        let tokens = try await tokenRequest([
            "client_id": clientID,
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirect
        ])
        guard let refresh = tokens["refresh_token"] as? String else {
            throw AuthError.failed("Google didn’t allow offline access. Please try again.")
        }
        Keychain.set(refresh, for: Self.refreshKey)
        store(tokens)
        let profile = Self.profile(fromIDToken: tokens["id_token"] as? String)
        self.profile = profile
        if let data = try? JSONEncoder().encode(profile), let raw = String(data: data, encoding: .utf8) {
            Keychain.set(raw, for: Self.profileKey)
        }
        return profile
    }

    func signOut() async {
        let token = Keychain.get(Self.refreshKey)
        Keychain.remove(Self.refreshKey)
        Keychain.remove(Self.profileKey)
        accessToken = nil
        accessExpiry = .distantPast
        profile = nil
        // Tell Google to forget this app's access (best effort).
        if let token, let url = URL(string: "https://oauth2.googleapis.com/revoke") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            req.httpBody = Self.form(["token": token])
            _ = try? await URLSession.shared.data(for: req)
        }
    }

    // MARK: Access tokens

    /// A valid access token, refreshed when needed.
    func token(forceRefresh: Bool = false) async throws -> String {
        if !forceRefresh, let accessToken, accessExpiry > Date().addingTimeInterval(60) { return accessToken }
        guard let clientID else { throw AuthError.notConfigured }
        guard let refresh = Keychain.get(Self.refreshKey) else { throw AuthError.failed("Please sign in with Google again.") }
        let tokens = try await tokenRequest(["client_id": clientID, "refresh_token": refresh, "grant_type": "refresh_token"])
        store(tokens)
        guard let accessToken else { throw AuthError.failed("Google didn’t return an access token.") }
        return accessToken
    }

    private func store(_ tokens: [String: Any]) {
        accessToken = tokens["access_token"] as? String
        let seconds = (tokens["expires_in"] as? NSNumber)?.doubleValue ?? 3000
        accessExpiry = Date().addingTimeInterval(seconds)
    }

    private func tokenRequest(_ fields: [String: String]) async throws -> [String: Any] {
        var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = Self.form(fields)
        let (data, response) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            let reason = (json["error_description"] as? String) ?? (json["error"] as? String) ?? "Google sign-in failed."
            if (json["error"] as? String) == "invalid_grant" {
                // The refresh token was revoked or expired: sign in again.
                Keychain.remove(Self.refreshKey)
            }
            throw AuthError.failed(reason)
        }
        return json
    }

    // MARK: Presentation

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scene = UIApplication.shared.connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
            return scene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
        }
    }

    // MARK: Helpers

    private static func profile(fromIDToken token: String?) -> Profile {
        var p = Profile(email: "", name: "", picture: "")
        guard let token else { return p }
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return p }
        var b64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64 += "=" }
        guard let data = Data(base64Encoded: b64),
              let claims = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return p }
        p.email = (claims["email"] as? String) ?? ""
        p.name = (claims["name"] as? String) ?? (claims["given_name"] as? String) ?? ""
        p.picture = (claims["picture"] as? String) ?? ""
        return p
    }

    private static func form(_ fields: [String: String]) -> Data {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return fields.map { key, value in
            "\(key)=\(value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value)"
        }.joined(separator: "&").data(using: .utf8)!
    }

    static func base64URL(_ data: Data) -> String {
        data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func randomURLSafe(_ bytes: Int) -> String {
        var raw = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &raw)
        return base64URL(Data(raw))
    }
}
