import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        HStack(alignment: .top, spacing: 20) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    SectionHeading(title: "外観モード")
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("モード", selection: Binding(
                            get: { store.theme.mode },
                            set: { newValue in
                                var theme = store.theme
                                theme.mode = newValue
                                store.updateTheme(theme)
                            }
                        )) {
                            ForEach(AppThemeMode.allCases) { mode in
                                Text(mode.label).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                    }
                    .panelStyle()

                    SectionHeading(title: "ホーム画面の背景")
                    VStack(alignment: .leading, spacing: 14) {
                        ColorPicker("背景色", selection: Binding(
                            get: { Color(hex: store.theme.backgroundColorHex) },
                            set: { newColor in
                                var theme = store.theme
                                theme.backgroundColorHex = newColor.toHex
                                theme.backgroundMediaPath = nil
                                store.updateTheme(theme)
                            }
                        ))
                        .foregroundStyle(Theme.textPrimary)

                        Text("画像・GIF・動画（mp4/mov/m4v）を背景に設定できます。動画・GIFは自動でループ再生されます。")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)

                        HStack {
                            Button("背景メディアを選択…") {
                                let panel = NSOpenPanel()
                                panel.allowedContentTypes = [.image, .movie]
                                panel.allowsMultipleSelection = false
                                panel.canChooseDirectories = false
                                if panel.runModal() == .OK, let url = panel.url {
                                    var theme = store.theme
                                    theme.backgroundMediaPath = url.path
                                    store.updateTheme(theme)
                                    store.addBackgroundMediaHistory(url.path)
                                }
                            }
                            .buttonStyle(GlowButtonStyle())

                            if store.theme.backgroundMediaPath != nil {
                                Button("メディアをやめて色に戻す") {
                                    var theme = store.theme
                                    theme.backgroundMediaPath = nil
                                    store.updateTheme(theme)
                                }
                                .buttonStyle(GlowButtonStyle())
                            }
                        }
                    }
                    .panelStyle()

                    Spacer()
                }
                .padding()
            }
            .frame(maxWidth: 520)

            if !store.backgroundMediaHistory.isEmpty {
                Rectangle().fill(Theme.panelBorder).frame(width: 1)

                VStack(alignment: .leading, spacing: 12) {
                    SectionHeading(title: "背景の履歴")
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(store.backgroundMediaHistory, id: \.self) { path in
                                BackgroundHistoryThumbnail(
                                    path: path,
                                    isSelected: store.theme.backgroundMediaPath == path
                                )
                                .onTapGesture {
                                    var theme = store.theme
                                    theme.backgroundMediaPath = path
                                    store.updateTheme(theme)
                                    store.addBackgroundMediaHistory(path)
                                }
                                .contextMenu {
                                    Button("履歴から削除", role: .destructive) {
                                        store.removeBackgroundMediaHistory(path)
                                    }
                                }
                            }
                        }
                        .padding(.trailing, 8)
                    }
                }
                .padding()
                .frame(minWidth: 260, maxWidth: 320)
            }
        }
    }
}

private struct BackgroundHistoryThumbnail: View {
    let path: String
    let isSelected: Bool

    private var kind: BackgroundMediaKind { BackgroundMediaKind.kind(forPath: path) }
    private var fileName: String { (path as NSString).lastPathComponent }
    private var exists: Bool { FileManager.default.fileExists(atPath: path) }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.black.opacity(0.25))

                if exists {
                    switch kind {
                    case .video:
                        Image(systemName: "film")
                            .font(.system(size: 26))
                            .foregroundStyle(Theme.textSecondary)
                    case .animatedGIF, .image:
                        if let nsImage = NSImage(contentsOfFile: path) {
                            Image(nsImage: nsImage)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        } else {
                            Image(systemName: "photo")
                                .font(.system(size: 26))
                                .foregroundStyle(Theme.textSecondary)
                        }
                    case .none:
                        EmptyView()
                    }
                } else {
                    Image(systemName: "questionmark.folder")
                        .font(.system(size: 22))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .frame(height: 84)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Theme.accentGold : Theme.panelBorder, lineWidth: isSelected ? 2 : 1)
            )

            Text(fileName)
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .contentShape(Rectangle())
    }
}
