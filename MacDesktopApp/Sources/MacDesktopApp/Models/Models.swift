import Foundation

// MARK: - ホーム画面 / ファイル保存（機能: メイン画面, 機能2）

struct StoredFile: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var path: String
    var displayName: String
    var addedAt: Date = Date()
    var positionX: Double = 60
    var positionY: Double = 60

    var url: URL { URL(fileURLWithPath: path) }
}

// MARK: - 動画（機能1）

struct VideoLink: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var urlString: String
    var addedAt: Date = Date()
}

// MARK: - タイムテーブル（機能3）

enum WeekType: String, Codable, CaseIterable, Identifiable, Hashable {
    case weekA = "週A"
    case weekB = "週B"
    case everyWeek = "毎週"

    var id: String { rawValue }
}

enum Weekday: Int, Codable, CaseIterable, Identifiable, Hashable {
    case monday = 0
    case tuesday
    case wednesday
    case thursday
    case friday
    case saturday
    case sunday

    var id: Int { rawValue }

    var shortLabel: String {
        switch self {
        case .monday: return "月"
        case .tuesday: return "火"
        case .wednesday: return "水"
        case .thursday: return "木"
        case .friday: return "金"
        case .saturday: return "土"
        case .sunday: return "日"
        }
    }

    var fullLabel: String { shortLabel + "曜日" }
}

struct TimetableEvent: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var weekType: WeekType = .everyWeek
    var weekday: Weekday = .monday
    var startMinutes: Int = 9 * 60
    var endMinutes: Int = 10 * 60
    var colorHex: String = "4A90D9"
    var note: String = ""
}

// MARK: - SNSアカウント一覧（機能4）

struct SNSLink: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var platform: String
    var urlString: String
    var emoji: String = "🔗"
}

// MARK: - Todoリスト（機能6）

struct TodoItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var details: String = ""
    var durationMinutes: Int = 0
    var isDone: Bool = false
    var createdAt: Date = Date()
}

// MARK: - ノート（機能8）

struct Note: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var category: String
    var title: String
    var content: String = ""
    var updatedAt: Date = Date()
}

// MARK: - テーマ（機能7）

enum AppThemeMode: String, Codable, CaseIterable, Identifiable, Hashable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: return "システムに合わせる"
        case .light: return "ライト"
        case .dark: return "ダーク"
        }
    }
}

struct ThemeSettings: Codable, Hashable {
    var mode: AppThemeMode = .system
    var backgroundColorHex: String = "1E2733"
    var backgroundImagePath: String? = nil
}
