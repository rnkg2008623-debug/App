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
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading(title: "カテゴリー")
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(categories, id: \.self) { category in
                            categoryRow(category)
                        }
                    }
                }
                HStack {
                    TextField("新しいカテゴリー", text: $newCategoryName).themedField()
                    Button("追加") {
                        let trimmed = newCategoryName.trimmingCharacters(in: .whitespaces)
                        guard !trimmed.isEmpty else { return }
                        selectedCategory = trimmed
                        newCategoryName = ""
                    }
                    .buttonStyle(GlowButtonStyle())
                }
            }
            .padding()
            .frame(minWidth: 200, idealWidth: 220)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    SectionHeading(title: selectedCategory ?? "カテゴリーを選択")
                    Spacer()
                    Button {
                        guard let selectedCategory else { return }
                        let note = Note(category: selectedCategory, title: "新しいノート")
                        store.addNote(note)
                        selectedNoteID = note.id
                    } label: {
                        Label("新規ノート", systemImage: "plus")
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                    .disabled(selectedCategory == nil)
                }

                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(notesInCategory) { note in
                            noteRow(note)
                        }
                    }
                }
            }
            .padding()
            .frame(minWidth: 240, idealWidth: 260)

            if let selectedNote {
                NoteEditorView(note: selectedNote)
                    .id(selectedNote.id)
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "note.text").font(.system(size: 44)).foregroundStyle(Theme.accentGold)
                    Text("ノートを選択するか、新規作成してください").foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .themedBackground()
            }
        }
        .navigationTitle("ノート")
    }

    private func categoryRow(_ category: String) -> some View {
        let isSelected = selectedCategory == category
        return Button {
            selectedCategory = category
        } label: {
            Text(category)
                .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? Theme.accent : Theme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
                )
        }
        .buttonStyle(.plain)
    }

    private func noteRow(_ note: Note) -> some View {
        let isSelected = selectedNoteID == note.id
        return Button {
            selectedNoteID = note.id
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(note.title)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? Theme.accent : Theme.textPrimary)
                Text(note.updatedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(Theme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
            )
        }
        .buttonStyle(.plain)
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
                    .font(.themeTitle(20))
                    .textFieldStyle(.plain)
                    .foregroundStyle(Theme.textPrimary)
                    .onChange(of: note.title) { _ in save() }
                Spacer()
                Button {
                    exportPDF()
                } label: {
                    Label("PDFで保存", systemImage: "doc.richtext")
                }
                .buttonStyle(GlowButtonStyle())
                Button(role: .destructive) {
                    store.removeNote(note.id)
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }
            TextEditor(text: $note.content)
                .font(.body)
                .foregroundStyle(Theme.textPrimary)
                .scrollContentBackground(.hidden)
                .onChange(of: note.content) { _ in save() }
                .panelStyle(padding: 8)
        }
        .padding()
        .themedBackground()
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
