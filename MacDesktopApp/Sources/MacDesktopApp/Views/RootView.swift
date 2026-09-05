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
    @State private var selection: AppTab = .home

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            detailView
                .themedBackground()
        }
        .tint(Theme.accent)
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("MAC DESKTOP")
                    .font(.system(size: 12, weight: .bold))
                    .tracking(3)
                    .foregroundStyle(Theme.accentGold)
                Rectangle()
                    .fill(Theme.accentGold.opacity(0.5))
                    .frame(width: 36, height: 2)
            }
            .padding(.horizontal, 20)
            .padding(.top, 24)
            .padding(.bottom, 20)

            ScrollView {
                VStack(spacing: 2) {
                    ForEach(AppTab.allCases) { tab in
                        sidebarRow(tab)
                    }
                }
                .padding(.horizontal, 10)
            }

            Spacer()
        }
        .frame(minWidth: 220)
        .background(Color(hex: "080D12"))
    }

    private func sidebarRow(_ tab: AppTab) -> some View {
        let isSelected = selection == tab
        return Button {
            selection = tab
        } label: {
            HStack(spacing: 12) {
                Image(systemName: tab.icon)
                    .frame(width: 18)
                Text(tab.rawValue)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                Spacer()
            }
            .foregroundStyle(isSelected ? Theme.accent : Theme.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
            )
            .overlay(alignment: .leading) {
                if isSelected {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Theme.accentGold)
                        .frame(width: 3)
                        .padding(.vertical, 6)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var detailView: some View {
        switch selection {
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
