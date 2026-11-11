import Foundation
import WebKit
import Speech
import AVFoundation

/// Gives the checklist page speech recognition inside the app.
///
/// iPhone web views have no working speech recognition of their own, so this injects a small
/// `SpeechRecognition` object into the page that hands listening to Apple's on-device speech
/// recognizer and sends the words back. The page's mic button and “Hey Mimi” use it automatically.
final class SpeechBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "mimiSpeech"

    /// Runs in every frame of the page (the checklist lives in a frame inside claude.ai).
    static let pageScript = #"""
    (function () {
      var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mimiSpeech;
      if (!h) return;
      var active = null, seq = 0;
      function SR() {
        this.lang = 'en-US'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1;
        this.onresult = null; this.onerror = null; this.onend = null; this.onstart = null;
        this._id = ++seq;
      }
      SR.prototype.start = function () {
        if (active && active !== this) { var old = active; active = null; if (old.onend) try { old.onend({}); } catch (e) {} }
        active = this;
        h.postMessage({ cmd: 'start', id: this._id, lang: this.lang || 'en-US', continuous: !!this.continuous });
      };
      SR.prototype.stop = function () { h.postMessage({ cmd: 'stop', id: this._id }); };
      SR.prototype.abort = SR.prototype.stop;
      SR.prototype.addEventListener = function (type, fn) { this['on' + type] = fn; };
      SR.prototype.removeEventListener = function (type) { this['on' + type] = null; };
      window.__mimiSpeech = function (ev) {
        var r = active;
        if (!r || ev.id !== r._id) return;
        try {
          if (ev.type === 'start') { if (r.onstart) r.onstart({}); }
          else if (ev.type === 'result') {
            var alt = { transcript: ev.text, confidence: 1 };
            var res = [alt]; res.isFinal = !!ev.isFinal; res.item = function (i) { return res[i]; };
            var list = [res]; list.item = function (i) { return list[i]; };
            if (r.onresult) r.onresult({ resultIndex: 0, results: list });
          }
          else if (ev.type === 'error') { if (r.onerror) r.onerror({ error: ev.error }); }
          else if (ev.type === 'end') { active = null; if (r.onend) r.onend({}); }
        } catch (e) {}
      };
      try {
        Object.defineProperty(window, 'webkitSpeechRecognition', { value: SR, configurable: true, writable: true });
        Object.defineProperty(window, 'SpeechRecognition', { value: SR, configurable: true, writable: true });
      } catch (e) { window.webkitSpeechRecognition = SR; window.SpeechRecognition = SR; }
    })();
    """#

    weak var webView: WKWebView?

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?
    private var frame: WKFrameInfo?
    private var currentId = 0
    private var silenceTimer: Timer?
    private var lastText = ""
    private var running = false

    // MARK: Messages from the page

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        let id = (body["id"] as? NSNumber)?.intValue ?? 0
        switch cmd {
        case "start":
            if running { end(sendFinal: false) }
            frame = message.frameInfo
            currentId = id
            let lang = (body["lang"] as? String) ?? "en-US"
            authorize { [weak self] ok in
                guard let self, self.currentId == id else { return }
                if ok { self.begin(lang: lang) } else {
                    self.send(["type": "error", "error": "not-allowed"])
                    self.send(["type": "end"])
                }
            }
        case "stop":
            if id == currentId && running { end(sendFinal: true) }
        default:
            break
        }
    }

    // MARK: Permissions

    private func authorize(_ done: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { DispatchQueue.main.async { done(false) }; return }
            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async { done(granted) }
            }
        }
    }

    // MARK: Listening

    private func begin(lang: String) {
        let locale = Locale(identifier: lang.replacingOccurrences(of: "_", with: "-"))
        guard let rec = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer(), rec.isAvailable else {
            send(["type": "error", "error": "service-not-allowed"])
            send(["type": "end"])
            return
        }
        recognizer = rec
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement,
                                    options: [.defaultToSpeaker, .duckOthers, .allowBluetooth])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            req.addsPunctuation = true
            request = req

            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.request?.append(buffer)
            }
            engine.prepare()
            try engine.start()

            running = true
            lastText = ""
            send(["type": "start"])

            task = rec.recognitionTask(with: req) { [weak self] result, error in
                DispatchQueue.main.async {
                    guard let self, self.running else { return }
                    if let result {
                        let text = result.bestTranscription.formattedString
                        if result.isFinal { self.lastText = text; self.end(sendFinal: true); return }
                        if text != self.lastText {
                            self.lastText = text
                            self.send(["type": "result", "text": text, "isFinal": false])
                            self.armSilence(seconds: 1.4)
                        }
                    } else if error != nil {
                        self.end(sendFinal: true)
                    }
                }
            }
            armSilence(seconds: 12) // stop if nobody speaks
        } catch {
            cleanUp()
            send(["type": "error", "error": "audio-capture"])
            send(["type": "end"])
        }
    }

    /// When the speaker pauses, treat what was heard as final.
    private func armSilence(seconds: TimeInterval) {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
            guard let self, self.running else { return }
            self.end(sendFinal: true)
        }
    }

    private func end(sendFinal: Bool) {
        guard running else { return }
        running = false
        let text = lastText.trimmingCharacters(in: .whitespacesAndNewlines)
        cleanUp()
        if sendFinal && !text.isEmpty {
            send(["type": "result", "text": text, "isFinal": true])
        }
        send(["type": "end"])
    }

    private func cleanUp() {
        silenceTimer?.invalidate()
        silenceTimer = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        // Back to normal playback so Mimi’s voice is loud and clear.
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? session.setActive(true)
    }

    func shutDown() {
        if running { running = false; cleanUp() }
    }

    // MARK: Messages to the page

    private func send(_ payload: [String: Any]) {
        guard let webView else { return }
        var body = payload
        body["id"] = currentId
        guard let data = try? JSONSerialization.data(withJSONObject: body),
              let json = String(data: data, encoding: .utf8) else { return }
        let js = "window.__mimiSpeech && window.__mimiSpeech(\(json));"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(js, in: self.frame, in: .page) { _ in }
        }
    }
}
