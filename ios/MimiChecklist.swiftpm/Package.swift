// swift-tools-version: 5.9

// Mimi Checklist — iPhone app.
// Open this folder (MimiChecklist.swiftpm) in Xcode, pick your iPhone, set your Team under
// Signing & Capabilities, and press Run.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Mimi Checklist",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "Mimi Checklist",
            targets: ["AppModule"],
            bundleIdentifier: "com.azarudeen.mimichecklist",
            teamIdentifier: "",
            displayVersion: "1.1",
            bundleVersion: "2",
            appIcon: .asset("AppIcon"),
            accentColor: .asset("AccentColor"),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ],
            capabilities: [
                .microphone(purposeString: "Mimi listens when you tap the mic or say “Hey Mimi”, so you can add tasks, log water and take notes by voice."),
                .speechRecognition(purposeString: "Mimi turns what you say into text so she can understand your requests."),
                .camera(purposeString: "Take a new profile photo for your checklist."),
                .photoLibrary(purposeString: "Choose a profile photo for your checklist.")
            ],
            appCategory: .productivity
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
