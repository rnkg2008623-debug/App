// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MacDesktopApp",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "MacDesktopApp",
            path: "Sources/MacDesktopApp"
        )
    ]
)
