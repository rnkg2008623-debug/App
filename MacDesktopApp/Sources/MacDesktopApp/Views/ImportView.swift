import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct ImportView: View {
    @EnvironmentObject var store: AppStore
    @State private var targetFolderID: UUID?
    @State private var showNewFolderAlert = false
    @State private var newFolderName = ""
    @State private var resultMessage: String?
    @State private var resultIsError = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeading(title: "インポート")

            VStack(alignment: .leading, spacing: 14) {
                Text("クイズをCSV形式でインポートできます。各行は「質問,選択肢1,選択肢2,選択肢3,選択肢4,正解の番号(1〜4)」の6列で入力してください。1行目に見出しがあっても自動でスキップされます。")
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
                    importCSV()
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

    private func importCSV() {
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

        var imported: [Quiz] = []
        var skipped = 0

        for row in CSVParser.parse(text) {
            guard row.count >= 6 else { skipped += 1; continue }
            let question = row[0]
            let choices = Array(row[1...4])
            guard let answerNumber = Int(row[5]), (1...4).contains(answerNumber) else {
                skipped += 1
                continue
            }
            guard !question.isEmpty, choices.allSatisfy({ !$0.isEmpty }) else {
                skipped += 1
                continue
            }
            imported.append(Quiz(
                folderID: targetFolderID,
                question: question,
                choices: choices,
                correctIndex: answerNumber - 1
            ))
        }

        guard !imported.isEmpty else {
            resultIsError = true
            resultMessage = "インポートできる行がありませんでした（\(skipped)行をスキップ）。"
            return
        }

        store.addQuizzes(imported)
        resultIsError = false
        resultMessage = "\(imported.count)件のクイズをインポートしました" + (skipped > 0 ? "（\(skipped)行をスキップ）。" : "。")
    }
}
