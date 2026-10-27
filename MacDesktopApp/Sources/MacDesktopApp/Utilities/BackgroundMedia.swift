import SwiftUI
import AppKit
import AVFoundation

enum BackgroundMediaKind {
    case none
    case video
    case animatedGIF
    case image

    static func kind(forPath path: String?) -> BackgroundMediaKind {
        guard let path else { return .none }
        switch (path as NSString).pathExtension.lowercased() {
        case "mp4", "mov", "m4v": return .video
        case "gif": return .animatedGIF
        default: return .image
        }
    }
}

/// Renders a static image or an animated GIF full-bleed, using NSImageView so
/// GIF animation (which SwiftUI's `Image` does not play) works correctly.
struct AnimatedImageView: NSViewRepresentable {
    let path: String

    final class Coordinator {
        var loadedPath: String?
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> NSImageView {
        let view = NSImageView()
        view.imageScaling = .scaleAxesIndependently
        view.animates = true
        return view
    }

    func updateNSView(_ nsView: NSImageView, context: Context) {
        guard context.coordinator.loadedPath != path else { return }
        context.coordinator.loadedPath = path
        nsView.image = NSImage(contentsOfFile: path)
        nsView.animates = true
    }
}

/// Loops a video file silently as a full-bleed background using AVFoundation,
/// since SwiftUI has no built-in looping/muted background video player.
final class LoopingPlayerView: NSView {
    private var queuePlayer: AVQueuePlayer?
    private var playerLooper: AVPlayerLooper?
    private var playerLayer: AVPlayerLayer?
    private var currentURL: URL?

    func configure(url: URL) {
        guard url != currentURL else { return }
        currentURL = url

        wantsLayer = true
        let item = AVPlayerItem(url: url)
        let player = AVQueuePlayer()
        player.isMuted = true
        let looper = AVPlayerLooper(player: player, templateItem: item)
        let newLayer = AVPlayerLayer(player: player)
        newLayer.videoGravity = .resizeAspectFill
        newLayer.frame = bounds

        playerLayer?.removeFromSuperlayer()
        layer = newLayer

        queuePlayer = player
        playerLooper = looper
        playerLayer = newLayer
        player.play()
    }

    override func layout() {
        super.layout()
        playerLayer?.frame = bounds
    }
}

struct LoopingVideoBackground: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> LoopingPlayerView {
        let view = LoopingPlayerView()
        view.configure(url: url)
        return view
    }

    func updateNSView(_ nsView: LoopingPlayerView, context: Context) {
        nsView.configure(url: url)
    }
}
