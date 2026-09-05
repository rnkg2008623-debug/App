import Foundation

final class AppStore: ObservableObject {
    @Published var files: [StoredFile] = []
    @Published var videos: [VideoLink] = []
    @Published var videoFolders: [VideoFolder] = []
    @Published var events: [TimetableEvent] = []
    @Published var snsLinks: [SNSLink] = []
    @Published var todos: [TodoItem] = []
    @Published var notes: [Note] = []
    @Published var theme: ThemeSettings = ThemeSettings()
    @Published var selectedWeek: WeekType = .weekA

    private let saveURL: URL

    private struct PersistedData: Codable {
        var files: [StoredFile] = []
        var videos: [VideoLink] = []
        var videoFolders: [VideoFolder] = []
        var events: [TimetableEvent] = []
        var snsLinks: [SNSLink] = []
        var todos: [TodoItem] = []
        var notes: [Note] = []
        var theme: ThemeSettings = ThemeSettings()
    }

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.homeDirectoryForCurrentUser
        let dir = base.appendingPathComponent("MacDesktopApp", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        saveURL = dir.appendingPathComponent("store.json")
        let isFirstRun = !FileManager.default.fileExists(atPath: saveURL.path)
        load()
        if isFirstRun {
            videoFolders = [VideoFolder(name: "フォルダ1"), VideoFolder(name: "フォルダ2")]
            save()
        }
    }

    func load() {
        guard let data = try? Data(contentsOf: saveURL),
              let decoded = try? JSONDecoder().decode(PersistedData.self, from: data) else { return }
        files = decoded.files
        videos = decoded.videos
        videoFolders = decoded.videoFolders
        events = decoded.events
        snsLinks = decoded.snsLinks
        todos = decoded.todos
        notes = decoded.notes
        theme = decoded.theme
    }

    func save() {
        let data = PersistedData(
            files: files,
            videos: videos,
            videoFolders: videoFolders,
            events: events,
            snsLinks: snsLinks,
            todos: todos,
            notes: notes,
            theme: theme
        )
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        try? encoded.write(to: saveURL, options: .atomic)
    }

    // MARK: - ホーム画面 / ファイル

    func addFile(_ file: StoredFile) {
        files.append(file)
        save()
    }

    func removeFile(_ id: UUID) {
        files.removeAll { $0.id == id }
        save()
    }

    func moveFile(_ id: UUID, dx: Double, dy: Double) {
        guard let idx = files.firstIndex(where: { $0.id == id }) else { return }
        files[idx].positionX += dx
        files[idx].positionY += dy
        save()
    }

    // MARK: - 動画

    func addVideo(_ video: VideoLink) {
        videos.append(video)
        save()
    }

    func removeVideo(_ id: UUID) {
        videos.removeAll { $0.id == id }
        save()
    }

    func addVideoFolder(_ folder: VideoFolder) {
        videoFolders.append(folder)
        save()
    }

    func renameVideoFolder(_ id: UUID, name: String) {
        guard let idx = videoFolders.firstIndex(where: { $0.id == id }) else { return }
        videoFolders[idx].name = name
        save()
    }

    func removeVideoFolder(_ id: UUID) {
        videoFolders.removeAll { $0.id == id }
        for idx in videos.indices where videos[idx].folderID == id {
            videos[idx].folderID = nil
        }
        save()
    }

    // MARK: - タイムテーブル

    func addEvent(_ event: TimetableEvent) {
        events.append(event)
        save()
    }

    func updateEvent(_ event: TimetableEvent) {
        guard let idx = events.firstIndex(where: { $0.id == event.id }) else { return }
        events[idx] = event
        save()
    }

    func removeEvent(_ id: UUID) {
        events.removeAll { $0.id == id }
        save()
    }

    // MARK: - SNS

    func addSNSLink(_ link: SNSLink) {
        snsLinks.append(link)
        save()
    }

    func removeSNSLink(_ id: UUID) {
        snsLinks.removeAll { $0.id == id }
        save()
    }

    // MARK: - Todo

    func addTodo(_ todo: TodoItem) {
        todos.append(todo)
        save()
    }

    func updateTodo(_ todo: TodoItem) {
        guard let idx = todos.firstIndex(where: { $0.id == todo.id }) else { return }
        todos[idx] = todo
        save()
    }

    func removeTodo(_ id: UUID) {
        todos.removeAll { $0.id == id }
        save()
    }

    // MARK: - ノート

    func addNote(_ note: Note) {
        notes.append(note)
        save()
    }

    func updateNote(_ note: Note) {
        guard let idx = notes.firstIndex(where: { $0.id == note.id }) else { return }
        notes[idx] = note
        save()
    }

    func removeNote(_ id: UUID) {
        notes.removeAll { $0.id == id }
        save()
    }

    // MARK: - テーマ

    func updateTheme(_ theme: ThemeSettings) {
        self.theme = theme
        save()
    }
}
