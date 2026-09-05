import SwiftUI

enum AppTab: String, CaseIterable, Identifiable, Hashable {
    case home = "ホーム"
    case video = "動画"
    case files = "ファイル"
    case timetable = "タイムテーブル"
    case sns = "SNS"
    case calculator = "電卓"
    case todo = "Todo"
    case notes = "ノート"
    case settings = "設定"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .home: return "square.grid.2x2"
        case .video: return "play.rectangle"
        case .files: return "folder"
        case .timetable: return "calendar"
        case .sns: return "link"
        case .calculator: return "function"
        case .todo: return "checklist"
        case .notes: return "note.text"
        case .settings: return "gearshape"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: AppStore
    @State private var selection: AppTab? = .home

    var body: some View {
        NavigationSplitView {
            List(AppTab.allCases, selection: $selection) { tab in
                Label(tab.rawValue, systemImage: tab.icon).tag(tab)
            }
            .navigationTitle("メニュー")
            .listStyle(.sidebar)
        } detail: {
            switch selection ?? .home {
            case .home: HomeDesktopView()
            case .video: VideoPlayerView()
            case .files: FileStorageView()
            case .timetable: TimetableView()
            case .sns: SNSLinksView()
            case .calculator: CalculatorView()
            case .todo: TodoListView()
            case .notes: NotesView()
            case .settings: SettingsView()
            }
        }
    }
}
