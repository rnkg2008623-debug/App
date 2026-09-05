import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct HomeDesktopView: View {
    @EnvironmentObject var store: AppStore
    @State private var isTargeted = false

    var body: some View {
        GeometryReader { _ in
            ZStack(alignment: .topLeading) {
                backgroundView

                ForEach(store.files) { file in
                    DesktopIconView(file: file)
                        .position(x: CGFloat(file.positionX), y: CGFloat(file.positionY))
                }

                if store.files.isEmpty {
                    VStack(spacing: 14) {
                        Image(systemName: "arrow.down.doc")
                            .font(.system(size: 36))
                            .foregroundStyle(Theme.accentGold)
                        Text("Finderからファイルをここにドラッグ＆ドロップして置けます")
                            .font(.system(size: 15, weight: .medium, design: .serif))
                            .tracking(0.5)
                    }
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .overlay {
                if isTargeted {
                    Rectangle().stroke(Theme.accent, lineWidth: 3)
                }
            }
            .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers, location in
                handleDrop(providers: providers, location: location)
            }
        }
    }

    @ViewBuilder
    private var backgroundView: some View {
        ZStack {
            let path = store.theme.backgroundMediaPath
            switch BackgroundMediaKind.kind(forPath: path) {
            case .video:
                LoopingVideoBackground(url: URL(fileURLWithPath: path!))
            case .animatedGIF:
                AnimatedImageView(path: path!)
            case .image:
                if let nsImage = NSImage(contentsOfFile: path!) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Color(hex: store.theme.backgroundColorHex)
                }
            case .none:
                Color(hex: store.theme.backgroundColorHex)
            }

            LinearGradient(
                colors: [Color.black.opacity(0.5), .clear, .clear, Color.black.opacity(0.6)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    private func handleDrop(providers: [NSItemProvider], location: CGPoint) -> Bool {
        var handled = false
        for provider in providers {
            guard provider.canLoadObject(ofClass: URL.self) else { continue }
            _ = provider.loadObject(ofClass: URL.self) { url, _ in
                guard let url else { return }
                DispatchQueue.main.async {
                    var newFile = StoredFile(path: url.path, displayName: url.lastPathComponent)
                    newFile.positionX = Double(location.x)
                    newFile.positionY = Double(location.y)
                    store.addFile(newFile)
                }
            }
            handled = true
        }
        return handled
    }
}

struct DesktopIconView: View {
    @EnvironmentObject var store: AppStore
    let file: StoredFile
    @GestureState private var dragOffset: CGSize = .zero

    var body: some View {
        VStack(spacing: 4) {
            Image(nsImage: NSWorkspace.shared.icon(forFile: file.path))
                .resizable()
                .frame(width: 48, height: 48)
            Text(file.displayName)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(width: 84)
                .shadow(color: .black.opacity(0.8), radius: 3)
        }
        .padding(6)
        .offset(dragOffset)
        .gesture(
            DragGesture()
                .updating($dragOffset) { value, state, _ in
                    state = value.translation
                }
                .onEnded { value in
                    store.moveFile(file.id, dx: Double(value.translation.width), dy: Double(value.translation.height))
                }
        )
        .onTapGesture(count: 2) {
            NSWorkspace.shared.open(file.url)
        }
        .contextMenu {
            Button("開く") { NSWorkspace.shared.open(file.url) }
            Button("Finderで表示") { NSWorkspace.shared.activateFileViewerSelecting([file.url]) }
            Button("削除", role: .destructive) { store.removeFile(file.id) }
        }
    }
}
