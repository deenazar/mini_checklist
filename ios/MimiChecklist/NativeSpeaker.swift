import AVFoundation
import WebKit

/// Mimi's voice in the app: iOS's own speech engine with the most natural voice installed for the language
/// (Premium, then Enhanced, then the standard voice), at a natural pitch and pace.
///
/// The page calls `mimiNative.speak(text, lang)` and `mimiNative.stopSpeaking()`; the app reports back with
/// `window.__mimiSpeaking(true/false)` so the page can show the Stop button while Mimi talks.
///
/// More natural voices: Settings › Accessibility › Spoken Content › Voices › pick the language and download
/// an “Enhanced” or “Premium” voice (e.g. English (India): Isha or Rishi; Tamil: Vani).
@MainActor
final class NativeSpeaker: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = NativeSpeaker()

    weak var webView: WKWebView?
    private let synth = AVSpeechSynthesizer()

    private override init() {
        super.init()
        synth.delegate = self
    }

    var isSpeaking: Bool { synth.isSpeaking }

    func speak(_ text: String, language: String) {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        synth.stopSpeaking(at: .immediate)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? session.setActive(true)

        let utterance = AVSpeechUtterance(string: String(clean.prefix(1200)))
        utterance.voice = Self.bestVoice(for: language)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 1.02
        utterance.pitchMultiplier = 1.06 // a touch bright, still natural
        utterance.postUtteranceDelay = 0.05
        synth.speak(utterance)
    }

    func stop() {
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
    }

    /// The best installed voice for a language like "en-IN" or "ta-IN".
    static func bestVoice(for language: String) -> AVSpeechSynthesisVoice? {
        let wanted = language.replacingOccurrences(of: "_", with: "-").lowercased()
        let base = String(wanted.prefix { $0 != "-" })
        let usable = AVSpeechSynthesisVoice.speechVoices().filter { voice in
            !voice.voiceTraits.contains(.isNoveltyVoice) && !voice.voiceTraits.contains(.isPersonalVoice)
        }
        func rank(_ v: AVSpeechSynthesisVoice) -> Int {
            let lang = v.language.lowercased()
            var score = 0
            switch v.quality {
            case .premium: score += 300
            case .enhanced: score += 200
            default: score += 100
            }
            if lang == wanted { score += 50 }
            else if base == "en" && lang == "en-gb" { score += 20 } // a clear alternative for Indian English
            if v.gender == .female { score += 5 } // Mimi is a she
            return score
        }
        let exact = usable.filter { $0.language.lowercased() == wanted }
        let sameLanguage = usable.filter { $0.language.lowercased().hasPrefix(base + "-") || $0.language.lowercased() == base }
        let pool = exact.contains { $0.quality != .default } ? exact : (sameLanguage.isEmpty ? exact : sameLanguage)
        return pool.max { rank($0) < rank($1) } ?? AVSpeechSynthesisVoice(language: language)
    }

    // MARK: AVSpeechSynthesizerDelegate

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        Task { @MainActor in self.report(true) }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in self.finished() }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in self.finished() }
    }

    private func finished() {
        guard !synth.isSpeaking else { return }
        report(false)
        // Let music come back, unless the microphone has taken over the audio meanwhile.
        let session = AVAudioSession.sharedInstance()
        if session.category == .playback {
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    private func report(_ speaking: Bool) {
        webView?.evaluateJavaScript("window.__mimiSpeaking && window.__mimiSpeaking(\(speaking));", completionHandler: nil)
    }
}
