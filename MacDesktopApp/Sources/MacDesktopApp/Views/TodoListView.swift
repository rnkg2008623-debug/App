import SwiftUI

struct TodoListView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newDetails = ""
    @State private var newDuration = ""
    @State private var editingTodo: TodoItem?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            GroupBox("Todoを追加") {
                VStack(alignment: .leading, spacing: 8) {
                    TextField("タイトル", text: $newTitle).textFieldStyle(.roundedBorder)
                    TextField("説明", text: $newDetails).textFieldStyle(.roundedBorder)
                    HStack {
                        TextField("所要時間（分）", text: $newDuration)
                            .textFieldStyle(.roundedBorder)
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
                        .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .padding(8)
            }

            let doneCount = store.todos.filter { $0.isDone }.count
            let totalMinutes = store.todos.reduce(0) { $0 + $1.durationMinutes }
            Text("完了 \(doneCount) / \(store.todos.count) 件・合計見積もり \(totalMinutes) 分")
                .font(.caption)
                .foregroundStyle(.secondary)

            if store.todos.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "checklist").font(.system(size: 40)).foregroundStyle(.secondary)
                    Text("Todoを追加してください")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(store.todos) { todo in
                        HStack(alignment: .top) {
                            Button {
                                var updated = todo
                                updated.isDone.toggle()
                                store.updateTodo(updated)
                            } label: {
                                Image(systemName: todo.isDone ? "checkmark.circle.fill" : "circle")
                            }
                            .buttonStyle(.plain)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(todo.title)
                                    .strikethrough(todo.isDone)
                                    .font(.headline)
                                if !todo.details.isEmpty {
                                    Text(todo.details).font(.caption).foregroundStyle(.secondary)
                                }
                                if todo.durationMinutes > 0 {
                                    Text("所要時間: \(todo.durationMinutes)分").font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Button("編集") { editingTodo = todo }
                            Button(role: .destructive) {
                                store.removeTodo(todo.id)
                            } label: {
                                Image(systemName: "trash")
                            }
                        }
                        .padding(.vertical, 4)
                        .opacity(todo.isDone ? 0.55 : 1)
                    }
                }
            }
        }
        .padding()
        .navigationTitle("Todo")
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
            Text("Todoを編集").font(.title2).bold()
            TextField("タイトル", text: $todo.title).textFieldStyle(.roundedBorder)
            TextField("説明", text: $todo.details).textFieldStyle(.roundedBorder)
            TextField("所要時間（分）", value: $todo.durationMinutes, format: .number)
                .textFieldStyle(.roundedBorder)
            Toggle("完了", isOn: $todo.isDone)
            HStack {
                Spacer()
                Button("キャンセル") { dismiss() }
                Button("保存") {
                    onSave(todo)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(todo.title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 380)
    }
}
