// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ClipboardBridge",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "clipboard-bridge",
            path: ".",
            sources: ["ClipboardBridge.swift"],
            linkerSettings: [
                .linkedFramework("AppKit")
            ]
        )
    ]
)
