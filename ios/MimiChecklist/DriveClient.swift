import Foundation

/// The app's one file in Google Drive's hidden app folder (appDataFolder).
/// Only this app can see it; it doesn't appear in the user's Drive.
@MainActor
struct DriveClient {
    static let fileName = "mimi-checklist-sync.json"

    struct RemoteFile {
        let id: String
        let data: Data
    }

    enum DriveError: LocalizedError {
        case http(Int, String)
        var errorDescription: String? {
            switch self {
            case .http(let code, let why): return "Google Drive error \(code): \(why)"
            }
        }
    }

    /// Finds and downloads the sync file, or nil if there isn't one yet.
    func download() async throws -> RemoteFile? {
        var list = URLComponents(string: "https://www.googleapis.com/drive/v3/files")!
        list.queryItems = [
            .init(name: "spaces", value: "appDataFolder"),
            .init(name: "q", value: "name = '\(Self.fileName)' and trashed = false"),
            .init(name: "fields", value: "files(id,modifiedTime)"),
            .init(name: "orderBy", value: "modifiedTime desc"),
            .init(name: "pageSize", value: "10")
        ]
        let listing = try await send(URLRequest(url: list.url!))
        let files = ((try? JSONSerialization.jsonObject(with: listing)) as? [String: Any])?["files"] as? [[String: Any]] ?? []
        guard let id = files.first?["id"] as? String else { return nil }
        let content = try await send(URLRequest(url: URL(string: "https://www.googleapis.com/drive/v3/files/\(id)?alt=media")!))
        return RemoteFile(id: id, data: content)
    }

    /// Creates the sync file, or replaces its contents. Returns the file id.
    @discardableResult
    func upload(_ data: Data, replacing id: String?) async throws -> String {
        var req: URLRequest
        if let id {
            req = URLRequest(url: URL(string: "https://www.googleapis.com/upload/drive/v3/files/\(id)?uploadType=media&fields=id")!)
            req.httpMethod = "PATCH"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = data
        } else {
            let boundary = "mimi-" + UUID().uuidString
            let meta = try JSONSerialization.data(withJSONObject: [
                "name": Self.fileName, "parents": ["appDataFolder"], "mimeType": "application/json"
            ])
            var body = Data()
            body.append("--\(boundary)\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".data(using: .utf8)!)
            body.append(meta)
            body.append("\r\n--\(boundary)\r\nContent-Type: application/json\r\n\r\n".data(using: .utf8)!)
            body.append(data)
            body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
            req = URLRequest(url: URL(string: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id")!)
            req.httpMethod = "POST"
            req.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
        }
        let answer = try await send(req)
        return (((try? JSONSerialization.jsonObject(with: answer)) as? [String: Any])?["id"] as? String) ?? (id ?? "")
    }

    func delete(id: String) async throws {
        var req = URLRequest(url: URL(string: "https://www.googleapis.com/drive/v3/files/\(id)")!)
        req.httpMethod = "DELETE"
        _ = try await send(req)
    }

    /// Sends a request with the user's access token, refreshing it once if Google says it expired.
    private func send(_ request: URLRequest) async throws -> Data {
        var req = request
        req.timeoutInterval = 30
        for attempt in 0..<2 {
            let token = try await GoogleAuth.shared.token(forceRefresh: attempt > 0)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if (200..<300).contains(code) { return data }
            if code == 401 && attempt == 0 { continue }
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let why = ((json?["error"] as? [String: Any])?["message"] as? String) ?? HTTPURLResponse.localizedString(forStatusCode: code)
            throw DriveError.http(code, why)
        }
        throw DriveError.http(401, "Not signed in.")
    }
}
