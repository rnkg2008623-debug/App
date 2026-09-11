import SwiftUI

extension AppThemeMode {
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

@main
struct DesktopApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(store.theme.mode.colorScheme)
                .frame(minWidth: 1080, minHeight: 700)
        }
        .windowStyle(.hiddenTitleBar)
    }
}
