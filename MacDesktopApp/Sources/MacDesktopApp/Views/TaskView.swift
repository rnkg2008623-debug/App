import SwiftUI

struct TaskView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newHoursText = ""
    @State private var hasDueDate = false
    @State private var newDueDate = Date()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SectionHeading(title: "タスク")

                VStack(alignment: .leading, spacing: 12) {
                    Text("タスクを作成")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)

                    HStack {
                        TextField("タスク名", text: $newTitle).themedField()
                        TextField("時間", text: $newHoursText)
                            .themedField()
                            .frame(width: 80)
                        Text("時間")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                        Button("追加") {
                            addTask()
                        }
                        .buttonStyle(GlowButtonStyle(prominent: true))
                        .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                    }

                    HStack {
                        Toggle("期限を設定", isOn: $hasDueDate)
                            .toggleStyle(.switch)
                            .tint(Theme.accent)
                            .foregroundStyle(Theme.textSecondary)
                        if hasDueDate {
                            DatePicker("", selection: $newDueDate, displayedComponents: .date)
                                .labelsHidden()
                        }
                        Spacer()
                    }
                }
                .panelStyle()

                if store.tasks.isEmpty {
                    Text("まだタスクがありません")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                } else {
                    VStack(spacing: 14) {
                        ForEach(store.tasks) { task in
                            TaskCard(task: task)
                        }
                    }
                }
            }
            .padding()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func addTask() {
        let trimmed = newTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let hours = Double(newHoursText) ?? 0
        store.addTask(TaskItem(title: trimmed, timeSpentHours: hours, dueDate: hasDueDate ? newDueDate : nil))
        newTitle = ""
        newHoursText = ""
        hasDueDate = false
        newDueDate = Date()
    }
}

private struct TaskCard: View {
    @EnvironmentObject var store: AppStore
    let task: TaskItem
    @State private var newSubtaskTitle = ""

    private var isOverdue: Bool {
        guard let dueDate = task.dueDate else { return false }
        return dueDate < Calendar.current.startOfDay(for: Date()) && task.completionPercentage < 100
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(task.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                if let dueDate = task.dueDate {
                    Label(dueDate.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                        .font(.system(size: 11))
                        .foregroundStyle(isOverdue ? Color(hex: "E2685C") : Theme.textSecondary)
                }
                Text(String(format: "%.1f 時間", task.timeSpentHours))
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Theme.textSecondary)
                Text(String(format: "%.0f%%", task.completionPercentage))
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Theme.accent)
                Button(role: .destructive) {
                    store.removeTask(task.id)
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }

            HStack {
                Toggle("期限", isOn: Binding(
                    get: { task.dueDate != nil },
                    set: { enabled in
                        store.updateTaskDueDate(task.id, dueDate: enabled ? (task.dueDate ?? Date()) : nil)
                    }
                ))
                .toggleStyle(.switch)
                .tint(Theme.accent)
                .foregroundStyle(Theme.textSecondary)
                .font(.caption)

                if task.dueDate != nil {
                    DatePicker("", selection: Binding(
                        get: { task.dueDate ?? Date() },
                        set: { store.updateTaskDueDate(task.id, dueDate: $0) }
                    ), displayedComponents: .date)
                    .labelsHidden()
                }
                Spacer()
            }

            ProgressView(value: task.completionPercentage, total: 100)
                .tint(Theme.accent)

            if !task.subtasks.isEmpty {
                VStack(spacing: 4) {
                    ForEach(task.subtasks) { subtask in
                        subtaskRow(subtask)
                    }
                }
            }

            HStack {
                TextField("細かいタスクを追加", text: $newSubtaskTitle)
                    .themedField()
                    .onSubmit { addSubtask() }
                Button("追加") {
                    addSubtask()
                }
                .buttonStyle(GlowButtonStyle())
                .disabled(newSubtaskTitle.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .panelStyle()
    }

    private func addSubtask() {
        let trimmed = newSubtaskTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        store.addSubtask(toTask: task.id, title: trimmed)
        newSubtaskTitle = ""
    }

    private func subtaskRow(_ subtask: SubTask) -> some View {
        Button {
            store.toggleSubtask(taskID: task.id, subtaskID: subtask.id)
        } label: {
            HStack {
                Image(systemName: subtask.isDone ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(subtask.isDone ? Theme.accent : Theme.textSecondary)
                Text(subtask.title)
                    .font(.system(size: 13))
                    .foregroundStyle(subtask.isDone ? Theme.textSecondary : Theme.textPrimary)
                    .strikethrough(subtask.isDone)
                Spacer()
                Button {
                    store.removeSubtask(taskID: task.id, subtaskID: subtask.id)
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.white.opacity(0.04))
            )
        }
        .buttonStyle(.plain)
    }
}
