import SwiftUI

struct StudyView: View {
    @EnvironmentObject var store: AppStore
    @State private var selectedFolderID: UUID?

    @State private var showNewFolderAlert = false
    @State private var newFolderName = ""
    @State private var renamingFolder: QuizFolder?
    @State private var renameText = ""

    private var selectedFolder: QuizFolder? {
        store.quizFolders.first { $0.id == selectedFolderID }
    }

    var body: some View {
        HSplitView {
            folderPane
            detailPane
        }
        .alert("新しいフォルダ", isPresented: $showNewFolderAlert) {
            TextField("フォルダ名", text: $newFolderName)
            Button("作成") {
                let trimmed = newFolderName.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return }
                let folder = QuizFolder(name: trimmed)
                store.addQuizFolder(folder)
                selectedFolderID = folder.id
            }
            Button("キャンセル", role: .cancel) {}
        }
        .alert("フォルダ名を変更", isPresented: Binding(
            get: { renamingFolder != nil },
            set: { if !$0 { renamingFolder = nil } }
        )) {
            TextField("フォルダ名", text: $renameText)
            Button("保存") {
                if let folder = renamingFolder {
                    let trimmed = renameText.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty {
                        store.renameQuizFolder(folder.id, name: trimmed)
                    }
                }
                renamingFolder = nil
            }
            Button("キャンセル", role: .cancel) { renamingFolder = nil }
        }
    }

    private var folderPane: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeading(title: "学習フォルダ")

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(store.quizFolders) { folder in
                        folderRow(folder)
                            .contextMenu {
                                Button("名前を変更") {
                                    renamingFolder = folder
                                    renameText = folder.name
                                }
                                Button("削除", role: .destructive) {
                                    store.removeQuizFolder(folder.id)
                                    if selectedFolderID == folder.id { selectedFolderID = nil }
                                }
                            }
                    }
                }
            }

            Button {
                newFolderName = ""
                showNewFolderAlert = true
            } label: {
                Label("新しいフォルダ", systemImage: "folder.badge.plus")
            }
            .buttonStyle(GlowButtonStyle())
        }
        .padding()
        .frame(minWidth: 240, idealWidth: 270)
    }

    private func folderRow(_ folder: QuizFolder) -> some View {
        let isSelected = selectedFolderID == folder.id
        let accuracy = averageAccuracy(for: folder.id)
        return Button {
            selectedFolderID = folder.id
        } label: {
            HStack {
                Text(folder.name)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? Theme.accent : Theme.textPrimary)
                Spacer()
                Text(accuracyLabel(accuracy))
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }

    private func averageAccuracy(for folderID: UUID) -> Double? {
        store.quizzes.filter { $0.folderID == folderID }.averageAccuracy
    }

    private func accuracyLabel(_ accuracy: Double?) -> String {
        guard let accuracy else { return "—" }
        return String(format: "%.0f%%", accuracy * 100)
    }

    @ViewBuilder
    private var detailPane: some View {
        if let selectedFolder {
            QuizFolderDetailView(folder: selectedFolder)
        } else {
            VStack(spacing: 10) {
                Image(systemName: "graduationcap").font(.system(size: 44)).foregroundStyle(Theme.accentGold)
                Text("左のフォルダを選択するか、新規作成してください").foregroundStyle(Theme.textSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .themedBackground()
        }
    }
}

private struct QuizFolderDetailView: View {
    @EnvironmentObject var store: AppStore
    let folder: QuizFolder

    @State private var sessionOrder: [UUID] = []
    @State private var sessionIndex = 0
    @State private var selectedChoice: Int?

    private var quizzesInFolder: [Quiz] {
        store.quizzes.filter { $0.folderID == folder.id }
    }

    private var sessionActive: Bool { !sessionOrder.isEmpty }

    private var currentQuiz: Quiz? {
        guard sessionIndex < sessionOrder.count else { return nil }
        let id = sessionOrder[sessionIndex]
        return quizzesInFolder.first { $0.id == id }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                SectionHeading(title: folder.name)
                Spacer()
                if !quizzesInFolder.isEmpty {
                    Button {
                        startSession()
                    } label: {
                        Label(sessionActive ? "最初からやり直す" : "4択テストを開始", systemImage: "play.fill")
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                }
            }

            if quizzesInFolder.isEmpty {
                Text("このフォルダにはまだクイズがありません。インポートタブからCSVで追加してください。")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if sessionActive {
                sessionView
            } else {
                quizListView
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func startSession() {
        sessionOrder = quizzesInFolder.map(\.id).shuffled()
        sessionIndex = 0
        selectedChoice = nil
    }

    @ViewBuilder
    private var sessionView: some View {
        if let quiz = currentQuiz {
            VStack(alignment: .leading, spacing: 18) {
                Text("問題 \(sessionIndex + 1) / \(sessionOrder.count)")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)

                Text(quiz.question)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)

                VStack(spacing: 10) {
                    ForEach(Array(quiz.choices.enumerated()), id: \.offset) { index, choice in
                        choiceButton(quiz: quiz, index: index, text: choice)
                    }
                }

                if selectedChoice != nil {
                    Button("次へ") {
                        sessionIndex += 1
                        selectedChoice = nil
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                }
            }
            .panelStyle()
        } else {
            VStack(spacing: 14) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Theme.accentGold)
                Text("テスト終了！")
                    .font(.system(size: 24, weight: .bold, design: .serif))
                    .foregroundStyle(Theme.textPrimary)
                Button("もう一度挑戦する") {
                    startSession()
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                Button("クイズ一覧に戻る") {
                    sessionOrder = []
                }
                .buttonStyle(GlowButtonStyle())
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func choiceButton(quiz: Quiz, index: Int, text: String) -> some View {
        let isSelected = selectedChoice == index
        let isCorrectChoice = index == quiz.correctIndex
        let revealed = selectedChoice != nil

        return Button {
            guard selectedChoice == nil else { return }
            selectedChoice = index
            store.recordQuizAttempt(quiz.id, correct: index == quiz.correctIndex)
        } label: {
            HStack {
                Text(text)
                    .font(.system(size: 14))
                Spacer()
                if revealed && isCorrectChoice {
                    Image(systemName: "checkmark.circle.fill")
                } else if revealed && isSelected {
                    Image(systemName: "xmark.circle.fill")
                }
            }
            .foregroundStyle(choiceForeground(revealed: revealed, isSelected: isSelected, isCorrectChoice: isCorrectChoice))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(choiceBackground(revealed: revealed, isSelected: isSelected, isCorrectChoice: isCorrectChoice))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Theme.panelBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(revealed)
    }

    private func choiceForeground(revealed: Bool, isSelected: Bool, isCorrectChoice: Bool) -> Color {
        guard revealed else { return Theme.textPrimary }
        if isCorrectChoice { return Color(hex: "5CB85C") }
        if isSelected { return Color(hex: "E2685C") }
        return Theme.textSecondary
    }

    private func choiceBackground(revealed: Bool, isSelected: Bool, isCorrectChoice: Bool) -> Color {
        guard revealed else { return Color.white.opacity(0.04) }
        if isCorrectChoice { return Color(hex: "5CB85C").opacity(0.15) }
        if isSelected { return Color(hex: "E2685C").opacity(0.15) }
        return Color.white.opacity(0.04)
    }

    private var quizListView: some View {
        ScrollView {
            VStack(spacing: 6) {
                ForEach(quizzesInFolder) { quiz in
                    HStack {
                        Text(quiz.question)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.textPrimary)
                            .lineLimit(1)
                        Spacer()
                        Text(quiz.accuracy.map { String(format: "%.0f%%", $0 * 100) } ?? "未挑戦")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(Theme.textSecondary)
                        Button {
                            store.removeQuiz(quiz.id)
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(Theme.textSecondary)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(Color.white.opacity(0.04))
                    )
                }
            }
        }
    }
}
