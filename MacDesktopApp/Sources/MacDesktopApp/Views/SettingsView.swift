import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
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
    }
}
