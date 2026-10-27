import Foundation

final class AppStore: ObservableObject {
    @Published var files: [StoredFile] = []
    @Published var videos: [VideoLink] = []
    @Published var videoFolders: [VideoFolder] = []
    @Published var events: [TimetableEvent] = []
    @Published var snsLinks: [SNSLink] = []
    @Published var todos: [TodoItem] = []
    @Published var notes: [Note] = []
    @Published var quizFolders: [QuizFolder] = []
    @Published var quizzes: [Quiz] = []
    @Published var pdfItems: [PDFItem] = []
    @Published var pdfFolders: [PDFFolder] = []
    @Published var timeEntries: [TimeEntry] = []
    @Published var activeTimer: ActiveTimerSession? = nil
    @Published var tasks: [TaskItem] = []
    @Published var todayTasks: [TaskItem] = []
    @Published var theme: ThemeSettings = ThemeSettings()
    @Published var backgroundMediaHistory: [String] = []
    @Published var selectedWeek: WeekType = .weekA
    @Published var language: AppLanguage = .japanese

    private let saveURL: URL
    private let maxBackgroundHistory = 24

    private struct PersistedData: Codable {
        var files: [StoredFile] = []
        var videos: [VideoLink] = []
        var videoFolders: [VideoFolder] = []
        var events: [TimetableEvent] = []
        var snsLinks: [SNSLink] = []
        var todos: [TodoItem] = []
        var notes: [Note] = []
        var quizFolders: [QuizFolder] = []
        var quizzes: [Quiz] = []
        var pdfItems: [PDFItem] = []
        var pdfFolders: [PDFFolder] = []
        var timeEntries: [TimeEntry] = []
        var activeTimer: ActiveTimerSession? = nil
        var tasks: [TaskItem] = []
        var todayTasks: [TaskItem] = []
        var theme: ThemeSettings = ThemeSettings()
        var backgroundMediaHistory: [String] = []
        var language: AppLanguage = .japanese

        init(
            files: [StoredFile] = [],
            videos: [VideoLink] = [],
            videoFolders: [VideoFolder] = [],
            events: [TimetableEvent] = [],
            snsLinks: [SNSLink] = [],
            todos: [TodoItem] = [],
            notes: [Note] = [],
            quizFolders: [QuizFolder] = [],
            quizzes: [Quiz] = [],
            pdfItems: [PDFItem] = [],
            pdfFolders: [PDFFolder] = [],
            timeEntries: [TimeEntry] = [],
            activeTimer: ActiveTimerSession? = nil,
            tasks: [TaskItem] = [],
            todayTasks: [TaskItem] = [],
            theme: ThemeSettings = ThemeSettings(),
            backgroundMediaHistory: [String] = [],
            language: AppLanguage = .japanese
        ) {
            self.files = files
            self.videos = videos
            self.videoFolders = videoFolders
            self.events = events
            self.snsLinks = snsLinks
            self.todos = todos
            self.notes = notes
            self.quizFolders = quizFolders
            self.quizzes = quizzes
            self.pdfItems = pdfItems
            self.pdfFolders = pdfFolders
            self.timeEntries = timeEntries
            self.activeTimer = activeTimer
            self.tasks = tasks
            self.todayTasks = todayTasks
            self.theme = theme
            self.backgroundMediaHistory = backgroundMediaHistory
            self.language = language
        }

        // Decoded field-by-field with `decodeIfPresent` so that adding a new
        // field in a future update never breaks loading of data saved by an
        // older version of the app (a missing key falls back to its default
        // instead of failing the entire decode).
        enum CodingKeys: String, CodingKey {
            case files, videos, videoFolders, events, snsLinks, todos, notes, quizFolders, quizzes, pdfItems, pdfFolders, timeEntries, activeTimer, tasks, todayTasks, theme, backgroundMediaHistory, language
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            files = try container.decodeIfPresent([StoredFile].self, forKey: .files) ?? []
            videos = try container.decodeIfPresent([VideoLink].self, forKey: .videos) ?? []
            videoFolders = try container.decodeIfPresent([VideoFolder].self, forKey: .videoFolders) ?? []
            events = try container.decodeIfPresent([TimetableEvent].self, forKey: .events) ?? []
            snsLinks = try container.decodeIfPresent([SNSLink].self, forKey: .snsLinks) ?? []
            todos = try container.decodeIfPresent([TodoItem].self, forKey: .todos) ?? []
            notes = try container.decodeIfPresent([Note].self, forKey: .notes) ?? []
            quizFolders = try container.decodeIfPresent([QuizFolder].self, forKey: .quizFolders) ?? []
            quizzes = try container.decodeIfPresent([Quiz].self, forKey: .quizzes) ?? []
            pdfItems = try container.decodeIfPresent([PDFItem].self, forKey: .pdfItems) ?? []
            pdfFolders = try container.decodeIfPresent([PDFFolder].self, forKey: .pdfFolders) ?? []
            timeEntries = try container.decodeIfPresent([TimeEntry].self, forKey: .timeEntries) ?? []
            activeTimer = try container.decodeIfPresent(ActiveTimerSession.self, forKey: .activeTimer)
            tasks = try container.decodeIfPresent([TaskItem].self, forKey: .tasks) ?? []
            todayTasks = try container.decodeIfPresent([TaskItem].self, forKey: .todayTasks) ?? []
            theme = try container.decodeIfPresent(ThemeSettings.self, forKey: .theme) ?? ThemeSettings()
            backgroundMediaHistory = try container.decodeIfPresent([String].self, forKey: .backgroundMediaHistory) ?? []
            language = try container.decodeIfPresent(AppLanguage.self, forKey: .language) ?? .japanese
        }
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
            videoFolders = [VideoFolder(name: t("フォルダ1")), VideoFolder(name: t("フォルダ2"))]
            save()
        }
    }

    // MARK: - 言語

    /// Translates a Japanese UI string into the currently selected display
    /// language. Japanese itself needs no lookup, and any key with no entry in
    /// `Localization.translations` simply falls back to the original Japanese
    /// text, so a missing translation can never show a blank or broken label.
    func t(_ key: String) -> String {
        guard language != .japanese else { return key }
        return Localization.translations[key]?[language] ?? key
    }

    func updateLanguage(_ newValue: AppLanguage) {
        language = newValue
        save()
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
        quizFolders = decoded.quizFolders
        quizzes = decoded.quizzes
        pdfItems = decoded.pdfItems
        pdfFolders = decoded.pdfFolders
        timeEntries = decoded.timeEntries
        activeTimer = decoded.activeTimer
        tasks = decoded.tasks
        todayTasks = decoded.todayTasks
        theme = decoded.theme
        backgroundMediaHistory = decoded.backgroundMediaHistory
        language = decoded.language
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
            quizFolders: quizFolders,
            quizzes: quizzes,
            pdfItems: pdfItems,
            pdfFolders: pdfFolders,
            timeEntries: timeEntries,
            activeTimer: activeTimer,
            tasks: tasks,
            todayTasks: todayTasks,
            theme: theme,
            backgroundMediaHistory: backgroundMediaHistory,
            language: language
        )
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        if FileManager.default.fileExists(atPath: saveURL.path) {
            let backupURL = saveURL.deletingLastPathComponent().appendingPathComponent("store.backup.json")
            try? FileManager.default.removeItem(at: backupURL)
            try? FileManager.default.copyItem(at: saveURL, to: backupURL)
        }
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

    // MARK: - 学習（クイズ）

    func addQuizFolder(_ folder: QuizFolder) {
        quizFolders.append(folder)
        save()
    }

    func renameQuizFolder(_ id: UUID, name: String) {
        guard let idx = quizFolders.firstIndex(where: { $0.id == id }) else { return }
        quizFolders[idx].name = name
        save()
    }

    func removeQuizFolder(_ id: UUID) {
        quizFolders.removeAll { $0.id == id }
        for idx in quizzes.indices where quizzes[idx].folderID == id {
            quizzes[idx].folderID = nil
        }
        save()
    }

    func addQuizzes(_ newQuizzes: [Quiz]) {
        quizzes.append(contentsOf: newQuizzes)
        save()
    }

    func removeQuiz(_ id: UUID) {
        quizzes.removeAll { $0.id == id }
        save()
    }

    func recordQuizAttempt(_ id: UUID, correct: Bool) {
        guard let idx = quizzes.firstIndex(where: { $0.id == id }) else { return }
        quizzes[idx].attemptCount += 1
        if correct { quizzes[idx].correctCount += 1 }
        save()
    }

    // MARK: - PDFライブラリ

    func addPDFItem(_ item: PDFItem) {
        pdfItems.append(item)
        save()
    }

    func removePDFItem(_ id: UUID) {
        pdfItems.removeAll { $0.id == id }
        save()
    }

    func addPDFFolder(_ folder: PDFFolder) {
        pdfFolders.append(folder)
        save()
    }

    func renamePDFFolder(_ id: UUID, name: String) {
        guard let idx = pdfFolders.firstIndex(where: { $0.id == id }) else { return }
        pdfFolders[idx].name = name
        save()
    }

    func removePDFFolder(_ id: UUID) {
        pdfFolders.removeAll { $0.id == id }
        for idx in pdfItems.indices where pdfItems[idx].folderID == id {
            pdfItems[idx].folderID = nil
        }
        save()
    }

    // MARK: - タイマー

    /// Anchors the running session to a fixed start `Date` rather than an
    /// incrementing counter, so elapsed time stays correct — computed as
    /// `Date().timeIntervalSince(startedAt)` — no matter whether this view is
    /// mounted, another tab is active, or the app is simply in the
    /// background; only quitting the app stops the clock.
    func startTimer(label: String) {
        guard activeTimer == nil else { return }
        activeTimer = ActiveTimerSession(label: label, startedAt: Date())
        save()
    }

    func stopTimer() {
        guard let active = activeTimer else { return }
        let duration = max(0, Date().timeIntervalSince(active.startedAt))
        timeEntries.append(TimeEntry(label: active.label, startedAt: active.startedAt, durationSeconds: duration))
        activeTimer = nil
        save()
    }

    func updateActiveTimerLabel(_ label: String) {
        guard activeTimer != nil else { return }
        activeTimer?.label = label
        save()
    }

    func updateTimeEntryLabel(_ id: UUID, label: String) {
        guard let idx = timeEntries.firstIndex(where: { $0.id == id }) else { return }
        timeEntries[idx].label = label
        save()
    }

    func removeTimeEntry(_ id: UUID) {
        timeEntries.removeAll { $0.id == id }
        save()
    }

    // MARK: - タスク

    func addTask(_ task: TaskItem) {
        tasks.append(task)
        save()
    }

    func updateTaskTitle(_ id: UUID, title: String) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].title = title
        save()
    }

    func updateTaskTimeSpent(_ id: UUID, hours: Double) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].timeSpentHours = max(0, hours)
        save()
    }

    func updateTaskDueDate(_ id: UUID, dueDate: Date?) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].dueDate = dueDate
        save()
    }

    func removeTask(_ id: UUID) {
        tasks.removeAll { $0.id == id }
        save()
    }

    func addSubtask(toTask taskID: UUID, title: String) {
        guard let idx = tasks.firstIndex(where: { $0.id == taskID }) else { return }
        tasks[idx].subtasks.append(SubTask(title: title))
        save()
    }

    func toggleSubtask(taskID: UUID, subtaskID: UUID) {
        guard let taskIdx = tasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = tasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        tasks[taskIdx].subtasks[subtaskIdx].isDone.toggle()
        save()
    }

    func updateSubtaskTitle(taskID: UUID, subtaskID: UUID, title: String) {
        guard let taskIdx = tasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = tasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        tasks[taskIdx].subtasks[subtaskIdx].title = title
        save()
    }

    func updateSubtaskDueDate(taskID: UUID, subtaskID: UUID, dueDate: Date?) {
        guard let taskIdx = tasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = tasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        tasks[taskIdx].subtasks[subtaskIdx].dueDate = dueDate
        save()
    }

    func removeSubtask(taskID: UUID, subtaskID: UUID) {
        guard let taskIdx = tasks.firstIndex(where: { $0.id == taskID }) else { return }
        tasks[taskIdx].subtasks.removeAll { $0.id == subtaskID }
        save()
    }

    // MARK: - 今日

    /// A parallel task list where every item's due date is fixed to the day
    /// it was created — there is no update method for it, since "today" is
    /// meant to be a hard constraint of this section rather than something
    /// the user edits like a regular task's due date.
    func addTodayTask(_ task: TaskItem) {
        todayTasks.append(task)
        save()
    }

    func updateTodayTaskTimeSpent(_ id: UUID, hours: Double) {
        guard let idx = todayTasks.firstIndex(where: { $0.id == id }) else { return }
        todayTasks[idx].timeSpentHours = max(0, hours)
        save()
    }

    func removeTodayTask(_ id: UUID) {
        todayTasks.removeAll { $0.id == id }
        save()
    }

    func addTodaySubtask(toTask taskID: UUID, title: String) {
        guard let idx = todayTasks.firstIndex(where: { $0.id == taskID }) else { return }
        todayTasks[idx].subtasks.append(SubTask(title: title))
        save()
    }

    func toggleTodaySubtask(taskID: UUID, subtaskID: UUID) {
        guard let taskIdx = todayTasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = todayTasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        todayTasks[taskIdx].subtasks[subtaskIdx].isDone.toggle()
        save()
    }

    func updateTodaySubtaskTitle(taskID: UUID, subtaskID: UUID, title: String) {
        guard let taskIdx = todayTasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = todayTasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        todayTasks[taskIdx].subtasks[subtaskIdx].title = title
        save()
    }

    func updateTodaySubtaskDueDate(taskID: UUID, subtaskID: UUID, dueDate: Date?) {
        guard let taskIdx = todayTasks.firstIndex(where: { $0.id == taskID }),
              let subtaskIdx = todayTasks[taskIdx].subtasks.firstIndex(where: { $0.id == subtaskID }) else { return }
        todayTasks[taskIdx].subtasks[subtaskIdx].dueDate = dueDate
        save()
    }

    func removeTodaySubtask(taskID: UUID, subtaskID: UUID) {
        guard let taskIdx = todayTasks.firstIndex(where: { $0.id == taskID }) else { return }
        todayTasks[taskIdx].subtasks.removeAll { $0.id == subtaskID }
        save()
    }

    // MARK: - テーマ

    func updateTheme(_ theme: ThemeSettings) {
        self.theme = theme
        save()
    }

    func addBackgroundMediaHistory(_ path: String) {
        backgroundMediaHistory.removeAll { $0 == path }
        backgroundMediaHistory.insert(path, at: 0)
        if backgroundMediaHistory.count > maxBackgroundHistory {
            backgroundMediaHistory = Array(backgroundMediaHistory.prefix(maxBackgroundHistory))
        }
        save()
    }

    func removeBackgroundMediaHistory(_ path: String) {
        backgroundMediaHistory.removeAll { $0 == path }
        save()
    }
}
