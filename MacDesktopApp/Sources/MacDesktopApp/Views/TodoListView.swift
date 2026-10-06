import SwiftUI

struct TodoListView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newDetails = ""
    @State private var newDuration = ""
    @State private var editingTodo: TodoItem?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeading(title: "Todoを追加")

            VStack(alignment: .leading, spacing: 8) {
                TextField("タイトル", text: $newTitle).themedField()
                TextField("説明", text: $newDetails).themedField()
                HStack {
                    TextField("所要時間（分）", text: $newDuration)
                        .themedField()
                        .frame(width: 140)
                    Button("追加") {
                        let todo = TodoItem(
                            title: newTitle,
                            details: newDetails,
                            durationMinutes: Int(newDuration) ?? 0
                        )
                        store.addTodo(todo)
                        newTitle = ""
                        newDetails = ""
                        newDuration = ""
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                    .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .panelStyle()

            let doneCount = store.todos.filter { $0.isDone }.count
            let totalMinutes = store.todos.reduce(0) { $0 + $1.durationMinutes }
            Text("完了 \(doneCount) / \(store.todos.count) 件・合計見積もり \(totalMinutes) 分")
                .font(.caption)
                .foregroundStyle(Theme.accentGold)

            if store.todos.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "checklist").font(.system(size: 40)).foregroundStyle(Theme.accentGold)
                    Text("Todoを追加してください").foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(store.todos) { todo in
                            HStack(alignment: .top) {
                                Button {
                                    var updated = todo
                                    updated.isDone.toggle()
                                    store.updateTodo(updated)
                                } label: {
                                    Image(systemName: todo.isDone ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(todo.isDone ? Theme.accent : Theme.textSecondary)
                                }
                                .buttonStyle(.plain)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(todo.title)
                                        .strikethrough(todo.isDone)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.textPrimary)
                                    if !todo.details.isEmpty {
                                        Text(todo.details).font(.caption).foregroundStyle(Theme.textSecondary)
                                    }
                                    if todo.durationMinutes > 0 {
                                        Text("所要時間: \(todo.durationMinutes)分").font(.caption2).foregroundStyle(Theme.accentGold)
                                    }
                                }
                                Spacer()
                                Button("編集") { editingTodo = todo }
                                    .buttonStyle(GlowButtonStyle())
                                Button(role: .destructive) {
                                    store.removeTodo(todo.id)
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(.plain)
                                .foregroundStyle(Theme.textSecondary)
                            }
                            .padding(12)
                            .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .opacity(todo.isDone ? 0.55 : 1)
                        }
                    }
                }
            }
        }
        .padding()
        .sheet(item: $editingTodo) { todo in
            TodoEditor(todo: todo) { updated in
                store.updateTodo(updated)
            }
        }
    }
}

struct TodoEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State private var todo: TodoItem
    let onSave: (TodoItem) -> Void

    init(todo: TodoItem, onSave: @escaping (TodoItem) -> Void) {
        _todo = State(initialValue: todo)
        self.onSave = onSave
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(title: "Todoを編集")
            TextField("タイトル", text: $todo.title).themedField()
            TextField("説明", text: $todo.details).themedField()
            TextField("所要時間（分）", value: $todo.durationMinutes, format: .number).themedField()
            Toggle("完了", isOn: $todo.isDone).tint(Theme.accent)
            HStack {
                Spacer()
                Button("キャンセル") { dismiss() }.buttonStyle(GlowButtonStyle())
                Button("保存") {
                    onSave(todo)
                    dismiss()
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                .keyboardShortcut(.defaultAction)
                .disabled(todo.title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 380)
        .background(Theme.backgroundGradient)
    }
}
