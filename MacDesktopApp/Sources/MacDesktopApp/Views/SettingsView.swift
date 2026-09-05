import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        Form {
            Section("外観モード") {
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
            }

            Section("ホーム画面の背景") {
                ColorPicker("背景色", selection: Binding(
                    get: { Color(hex: store.theme.backgroundColorHex) },
                    set: { newColor in
                        var theme = store.theme
                        theme.backgroundColorHex = newColor.toHex
                        theme.backgroundImagePath = nil
                        store.updateTheme(theme)
                    }
                ))

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
                    if store.theme.backgroundImagePath != nil {
                        Button("画像をやめて色に戻す") {
                            var theme = store.theme
                            theme.backgroundImagePath = nil
                            store.updateTheme(theme)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: 480)
        .navigationTitle("設定")
    }
}
