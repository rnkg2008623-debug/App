import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct HomeDesktopView: View {
    @EnvironmentObject var store: AppStore
    @State private var isTargeted = false

    @State private var selectedFileIDs: Set<UUID> = []
    @State private var marqueeStart: CGPoint?
    @State private var marqueeCurrent: CGPoint?

    @State private var draggingFileID: UUID?
    @State private var dragTranslation: CGSize = .zero

    private let iconHitWidth: CGFloat = 84
    private let iconHitHeight: CGFloat = 90

    private var marqueeRect: CGRect? {
        guard let marqueeStart, let marqueeCurrent else { return nil }
        return CGRect(
            x: min(marqueeStart.x, marqueeCurrent.x),
            y: min(marqueeStart.y, marqueeCurrent.y),
            width: abs(marqueeCurrent.x - marqueeStart.x),
            height: abs(marqueeCurrent.y - marqueeStart.y)
        )
    }

    var body: some View {
        GeometryReader { _ in
            ZStack(alignment: .topLeading) {
                backgroundView
                    .gesture(marqueeGesture)
                    .onTapGesture { selectedFileIDs.removeAll() }

                ForEach(store.files) { file in
                    let isSelected = selectedFileIDs.contains(file.id)
                    // When a drag starts, the dragged file is always added to the selection first
                    // (see handleDragChanged), so checking selection membership alone is enough to
                    // know whether this icon should move together with the one being dragged.
                    let isInLiveDrag = draggingFileID != nil && isSelected

                    DesktopIconView(
                        file: file,
                        isSelected: isSelected,
                        liveOffset: isInLiveDrag ? dragTranslation : .zero,
                        onSelectTap: { handleTap(file) },
                        onDragChanged: { translation in handleDragChanged(file, translation: translation) },
                        onDragEnded: { handleDragEnded(file) },
                        onOpen: { NSWorkspace.shared.open(file.url) },
                        onRevealInFinder: { NSWorkspace.shared.activateFileViewerSelecting([file.url]) },
                        onDelete: {
                            store.removeFile(file.id)
                            selectedFileIDs.remove(file.id)
                        }
                    )
                    .position(x: CGFloat(file.positionX), y: CGFloat(file.positionY))
                }

                if let rect = marqueeRect {
                    Rectangle()
                        .fill(Theme.accent.opacity(0.15))
                        .overlay(Rectangle().stroke(Theme.accent, lineWidth: 1))
                        .frame(width: rect.width, height: rect.height)
                        .position(x: rect.midX, y: rect.midY)
                        .allowsHitTesting(false)
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
                    .allowsHitTesting(false)
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

    private var marqueeGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if marqueeStart == nil { marqueeStart = value.startLocation }
                marqueeCurrent = value.location
                updateLiveMarqueeSelection()
            }
            .onEnded { _ in
                marqueeStart = nil
                marqueeCurrent = nil
            }
    }

    private func updateLiveMarqueeSelection() {
        guard let rect = marqueeRect else { return }
        var newSelection: Set<UUID> = []
        for file in store.files {
            let iconFrame = CGRect(
                x: CGFloat(file.positionX) - iconHitWidth / 2,
                y: CGFloat(file.positionY) - iconHitHeight / 2,
                width: iconHitWidth,
                height: iconHitHeight
            )
            if rect.intersects(iconFrame) {
                newSelection.insert(file.id)
            }
        }
        selectedFileIDs = newSelection
    }

    private func handleTap(_ file: StoredFile) {
        if NSEvent.modifierFlags.contains(.command) {
            if selectedFileIDs.contains(file.id) {
                selectedFileIDs.remove(file.id)
            } else {
                selectedFileIDs.insert(file.id)
            }
        } else {
            selectedFileIDs = [file.id]
        }
    }

    private func handleDragChanged(_ file: StoredFile, translation: CGSize) {
        if draggingFileID == nil {
            draggingFileID = file.id
            if !selectedFileIDs.contains(file.id) {
                selectedFileIDs = [file.id]
            }
        }
        dragTranslation = translation
    }

    private func handleDragEnded(_ file: StoredFile) {
        let idsToMove = selectedFileIDs.contains(file.id) ? selectedFileIDs : [file.id]
        for id in idsToMove {
            store.moveFile(id, dx: Double(dragTranslation.width), dy: Double(dragTranslation.height))
        }
        draggingFileID = nil
        dragTranslation = .zero
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
        .contentShape(Rectangle())
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
    let file: StoredFile
    let isSelected: Bool
    let liveOffset: CGSize
    let onSelectTap: () -> Void
    let onDragChanged: (CGSize) -> Void
    let onDragEnded: () -> Void
    let onOpen: () -> Void
    let onRevealInFinder: () -> Void
    let onDelete: () -> Void

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
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(isSelected ? Theme.accent.opacity(0.28) : Color.clear)
        )
        .contentShape(Rectangle())
        .offset(liveOffset)
        .gesture(
            DragGesture()
                .onChanged { value in onDragChanged(value.translation) }
                .onEnded { _ in onDragEnded() }
        )
        .onTapGesture(count: 2) { onOpen() }
        .onTapGesture(count: 1) { onSelectTap() }
        .contextMenu {
            Button("開く") { onOpen() }
            Button("Finderで表示") { onRevealInFinder() }
            Button("削除", role: .destructive) { onDelete() }
        }
    }
}
