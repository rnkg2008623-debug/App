import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct ImportView: View {
    @EnvironmentObject var store: AppStore
    @State private var targetFolderID: UUID?
    @State private var showNewFolderAlert = false
    @State private var newFolderName = ""
    @State private var pasteText = ""
    @State private var resultMessage: String?
    @State private var resultIsError = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeading(title: "インポート")

            VStack(alignment: .leading, spacing: 14) {
                Text("2つの形式に対応しています。①4択クイズ形式：「質問,選択肢1,選択肢2,選択肢3,選択肢4,正解の番号(1〜4)」の6列。②単語帳形式：「単語, 意味」の2列（例: Apple, りんご）— 他の単語の意味が自動でダミーの選択肢になり4択クイズになります（最低4語必要）。1行目に見出しがあっても自動でスキップされます。")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)

                HStack {
                    Picker("インポート先フォルダ", selection: $targetFolderID) {
                        Text("フォルダを選択…").tag(Optional<UUID>.none)
                        ForEach(store.quizFolders) { folder in
                            Text(folder.name).tag(Optional(folder.id))
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

                Button {
                    importFromFile()
                } label: {
                    Label("CSVファイルを選択してインポート", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                .disabled(targetFolderID == nil)

                if let resultMessage {
                    Text(resultMessage)
                        .font(.subheadline)
                        .foregroundStyle(resultIsError ? Color(hex: "E2685C") : Theme.accent)
                }
            }
            .panelStyle()

            SectionHeading(title: "コピー＆ペーストでインポート")
            VStack(alignment: .leading, spacing: 10) {
                Text("上と同じ形式のテキストを直接貼り付けられます。例:\nApple, りんご\nBanana, バナナ\nCherry, さくらんぼ\nGrape, ぶどう")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)

                TextEditor(text: $pasteText)
                    .font(.system(.body, design: .monospaced))
                    .foregroundStyle(Theme.textPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 140)
                    .panelStyle(padding: 8)

                Button {
                    importFromPaste()
                } label: {
                    Label("貼り付けた内容をインポート", systemImage: "doc.on.clipboard")
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                .disabled(targetFolderID == nil || pasteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .panelStyle()

            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .alert("新しいフォルダ", isPresented: $showNewFolderAlert) {
            TextField("フォルダ名", text: $newFolderName)
            Button("作成") {
                let trimmed = newFolderName.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return }
                let folder = QuizFolder(name: trimmed)
                store.addQuizFolder(folder)
                targetFolderID = folder.id
            }
            Button("キャンセル", role: .cancel) {}
        }
    }

    private func importFromFile() {
        guard let targetFolderID else { return }

        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.commaSeparatedText, .plainText]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK, let url = panel.url else { return }

        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            resultIsError = true
            resultMessage = "ファイルを読み込めませんでした。"
            return
        }

        applyImport(CSVParser.parse(text), targetFolderID: targetFolderID)
    }

    private func importFromPaste() {
        guard let targetFolderID else { return }
        applyImport(CSVParser.parse(pasteText), targetFolderID: targetFolderID)
        pasteText = ""
    }

    private func applyImport(_ rows: [[String]], targetFolderID: UUID) {
        let (quizzes, skipped, note) = Self.buildQuizzes(from: rows, folderID: targetFolderID)

        guard !quizzes.isEmpty else {
            resultIsError = true
            resultMessage = note ?? "インポートできる内容がありませんでした（\(skipped)行をスキップ）。"
            return
        }

        store.addQuizzes(quizzes)
        resultIsError = false
        var message = "\(quizzes.count)件のクイズをインポートしました。"
        if let note {
            message += "\n" + note
        } else if skipped > 0 {
            message = "\(quizzes.count)件のクイズをインポートしました（\(skipped)行をスキップ）。"
        }
        resultMessage = message
    }

    /// Rows with 6+ columns are treated as a fully-specified quiz
    /// (question,choice1..4,answerNumber). Rows with exactly 2 columns are
    /// treated as word/definition pairs: each word's own definition becomes
    /// the correct answer, and 3 other pasted definitions are drawn at
    /// random as distractors, so a plain vocabulary list turns into 4-choice
    /// quizzes automatically (at least 4 pairs are needed to have 3 distinct
    /// wrong answers to pick from).
    private static func buildQuizzes(from rows: [[String]], folderID: UUID) -> (quizzes: [Quiz], skipped: Int, note: String?) {
        var fullRows: [[String]] = []
        var wordDefPairs: [(word: String, definition: String)] = []
        var skipped = 0

        for row in rows {
            if row.count >= 6 {
                fullRows.append(row)
            } else if row.count >= 2, !row[0].isEmpty, !row[1].isEmpty {
                wordDefPairs.append((row[0], row[1]))
            } else {
                skipped += 1
            }
        }

        var quizzes: [Quiz] = []

        for row in fullRows {
            let question = row[0]
            let choices = Array(row[1...4])
            guard let answerNumber = Int(row[5]), (1...4).contains(answerNumber),
                  !question.isEmpty, choices.allSatisfy({ !$0.isEmpty }) else {
                skipped += 1
                continue
            }
            quizzes.append(Quiz(folderID: folderID, question: question, choices: choices, correctIndex: answerNumber - 1))
        }

        var note: String?

        if !wordDefPairs.isEmpty {
            if wordDefPairs.count < 4 {
                // Each word needs 3 *other* definitions to use as wrong answers,
                // so fewer than 4 pairs can never produce a 4-choice quiz.
                note = "単語帳形式（単語, 意味）は4択の選択肢を作るために最低4語必要です（現在\(wordDefPairs.count)語のみ貼り付けられています）。"
                skipped += wordDefPairs.count
            } else {
                for (index, entry) in wordDefPairs.enumerated() {
                    let otherDefinitions = wordDefPairs.enumerated()
                        .filter { $0.offset != index && $0.element.definition != entry.definition }
                        .map { $0.element.definition }
                    let distractors = Array(Set(otherDefinitions)).shuffled().prefix(3)
                    guard distractors.count == 3 else {
                        skipped += 1
                        continue
                    }
                    var choices = Array(distractors) + [entry.definition]
                    choices.shuffle()
                    guard let correctIndex = choices.firstIndex(of: entry.definition) else { continue }
                    quizzes.append(Quiz(
                        folderID: folderID,
                        question: "「\(entry.word)」の意味は？",
                        choices: choices,
                        correctIndex: correctIndex
                    ))
                }
            }
        }

        return (quizzes, skipped, note)
    }
}
