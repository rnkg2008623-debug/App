import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct NotesView: View {
    @EnvironmentObject var store: AppStore
    @State private var selectedCategory: String?
    @State private var selectedNoteID: UUID?
    @State private var newCategoryName = ""

    private var categories: [String] {
        Array(Set(store.notes.map { $0.category })).sorted()
    }

    private var notesInCategory: [Note] {
        guard let selectedCategory else { return [] }
        return store.notes
            .filter { $0.category == selectedCategory }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    private var selectedNote: Note? {
        store.notes.first { $0.id == selectedNoteID }
    }

    var body: some View {
        HSplitView {
            VStack(alignment: .leading, spacing: 0) {
                Text("カテゴリー").font(.headline).padding([.horizontal, .top])
                List(categories, id: \.self, selection: $selectedCategory) { category in
                    Text(category).tag(category)
                }
                HStack {
                    TextField("新しいカテゴリー", text: $newCategoryName).textFieldStyle(.roundedBorder)
                    Button("追加") {
                        let trimmed = newCategoryName.trimmingCharacters(in: .whitespaces)
                        guard !trimmed.isEmpty else { return }
                        selectedCategory = trimmed
                        newCategoryName = ""
                    }
                }
                .padding(8)
            }
            .frame(minWidth: 180, idealWidth: 200)

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(selectedCategory ?? "カテゴリーを選択").font(.headline)
                    Spacer()
                    Button {
                        guard let selectedCategory else { return }
                        let note = Note(category: selectedCategory, title: "新しいノート")
                        store.addNote(note)
                        selectedNoteID = note.id
                    } label: {
                        Label("新規ノート", systemImage: "plus")
                    }
                    .disabled(selectedCategory == nil)
                }
                .padding()

                List(notesInCategory, selection: $selectedNoteID) { note in
                    VStack(alignment: .leading) {
                        Text(note.title).font(.subheadline)
                        Text(note.updatedAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .tag(note.id)
                }
            }
            .frame(minWidth: 220, idealWidth: 240)

            if let selectedNote {
                NoteEditorView(note: selectedNote)
                    .id(selectedNote.id)
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "note.text").font(.system(size: 44))
                    Text("ノートを選択するか、新規作成してください")
                }
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle("ノート")
    }
}

struct NoteEditorView: View {
    @EnvironmentObject var store: AppStore
    @State private var note: Note

    init(note: Note) {
        _note = State(initialValue: note)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                TextField("タイトル", text: $note.title)
                    .font(.title2)
                    .textFieldStyle(.plain)
                    .onChange(of: note.title) { _ in save() }
                Spacer()
                Button {
                    exportPDF()
                } label: {
                    Label("PDFで保存", systemImage: "doc.richtext")
                }
                Button(role: .destructive) {
                    store.removeNote(note.id)
                } label: {
                    Image(systemName: "trash")
                }
            }
            TextEditor(text: $note.content)
                .font(.body)
                .onChange(of: note.content) { _ in save() }
                .border(Color.gray.opacity(0.2))
        }
        .padding()
    }

    private func save() {
        note.updatedAt = Date()
        store.updateNote(note)
    }

    private func exportPDF() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = note.title.isEmpty ? "ノート.pdf" : "\(note.title).pdf"
        panel.allowedContentTypes = [.pdf]
        guard panel.runModal() == .OK, let url = panel.url else { return }
        PDFExporter.export(title: note.title, content: note.content, to: url)
    }
}
