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
                            theme.backgroundImagePath = nil
                            store.updateTheme(theme)
                        }
                    ))
                    .foregroundStyle(Theme.textPrimary)

                    HStack {
                        Button("背景画像を選択…") {
                            let panel = NSOpenPanel()
                            panel.allowedContentTypes = [.image]
                            panel.allowsMultipleSelection = false
                            panel.canChooseDirectories = false
                            if panel.runModal() == .OK, let url = panel.url {
                                var theme = store.theme
                                theme.backgroundImagePath = url.path
                                store.updateTheme(theme)
                            }
                        }
                        .buttonStyle(GlowButtonStyle())

                        if store.theme.backgroundImagePath != nil {
                            Button("画像をやめて色に戻す") {
                                var theme = store.theme
                                theme.backgroundImagePath = nil
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
        .navigationTitle("設定")
    }
}
