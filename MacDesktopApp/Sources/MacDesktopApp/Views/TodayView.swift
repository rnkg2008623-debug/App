import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newHoursText = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SectionHeading(title: "今日")

                Text("ここに追加したタスクは、期限が必ず「今日」に設定されます。")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)

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
                }
                .panelStyle()

                if store.todayTasks.isEmpty {
                    Text("まだタスクがありません")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                } else {
                    VStack(spacing: 14) {
                        ForEach(sortedTasks) { task in
                            TodayTaskCard(task: task)
                        }
                    }
                    .animation(.easeInOut(duration: 0.25), value: sortedTasks)
                }
            }
            .padding()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    /// Finished tasks (100% of their subtasks done) sink to the bottom,
    /// each group otherwise keeping the order tasks were created in.
    private var sortedTasks: [TaskItem] {
        store.todayTasks.filter { $0.completionPercentage < 100 } + store.todayTasks.filter { $0.completionPercentage >= 100 }
    }

    private func addTask() {
        let trimmed = newTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let hours = Double(newHoursText) ?? 0
        store.addTodayTask(TaskItem(title: trimmed, timeSpentHours: hours, dueDate: Date()))
        newTitle = ""
        newHoursText = ""
    }
}

private struct TodayTaskCard: View {
    @EnvironmentObject var store: AppStore
    let task: TaskItem
    @State private var newSubtaskTitle = ""
    @State private var isExpanded = true

    private var isComplete: Bool { task.completionPercentage >= 100 }
    private var completeColor: Color { Color(hex: "5CB85C") }

    private var isOverdue: Bool {
        guard let dueDate = task.dueDate else { return false }
        return dueDate < Calendar.current.startOfDay(for: Date()) && !isComplete
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                    if isComplete {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(completeColor)
                    }
                    Text(task.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    Spacer()
                    if let dueDate = task.dueDate {
                        Label(dueDate.formatted(date: .abbreviated, time: .omitted), systemImage: "sun.max")
                            .font(.system(size: 11))
                            .foregroundStyle(isOverdue ? Color(hex: "E2685C") : Theme.textSecondary)
                    }
                    Text(String(format: "%.1f 時間", task.timeSpentHours))
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Theme.textSecondary)
                    Text(String(format: "%.0f%%", task.completionPercentage))
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(isComplete ? completeColor : Theme.accent)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    isExpanded.toggle()
                }

                Button(role: .destructive) {
                    store.removeTodayTask(task.id)
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }

            if isExpanded {
                ProgressView(value: task.completionPercentage, total: 100)
                    .tint(isComplete ? completeColor : Theme.accent)

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
        }
        .padding(16)
        .background(isComplete ? completeColor.opacity(0.12) : Color.clear)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(isComplete ? completeColor.opacity(0.6) : Theme.panelBorder, lineWidth: isComplete ? 1.5 : 1)
        )
    }

    private func addSubtask() {
        let trimmed = newSubtaskTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        store.addTodaySubtask(toTask: task.id, title: trimmed)
        newSubtaskTitle = ""
    }

    private func isSubtaskOverdue(_ subtask: SubTask) -> Bool {
        guard let dueDate = subtask.dueDate else { return false }
        return dueDate < Calendar.current.startOfDay(for: Date()) && !subtask.isDone
    }

    private func subtaskRow(_ subtask: SubTask) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Button {
                    store.toggleTodaySubtask(taskID: task.id, subtaskID: subtask.id)
                } label: {
                    Image(systemName: subtask.isDone ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(subtask.isDone ? Theme.accent : Theme.textSecondary)
                }
                .buttonStyle(.plain)

                TextField("サブタスク", text: Binding(
                    get: { subtask.title },
                    set: { store.updateTodaySubtaskTitle(taskID: task.id, subtaskID: subtask.id, title: $0) }
                ))
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .foregroundStyle(subtask.isDone ? Theme.textSecondary : Theme.textPrimary)
                .strikethrough(subtask.isDone)

                if let dueDate = subtask.dueDate {
                    Text(dueDate.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 10))
                        .foregroundStyle(isSubtaskOverdue(subtask) ? Color(hex: "E2685C") : Theme.textSecondary)
                }

                Button {
                    store.removeTodaySubtask(taskID: task.id, subtaskID: subtask.id)
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }

            HStack {
                Toggle("期限", isOn: Binding(
                    get: { subtask.dueDate != nil },
                    set: { enabled in
                        store.updateTodaySubtaskDueDate(taskID: task.id, subtaskID: subtask.id, dueDate: enabled ? (subtask.dueDate ?? Date()) : nil)
                    }
                ))
                .toggleStyle(.switch)
                .tint(Theme.accent)
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)

                if subtask.dueDate != nil {
                    DatePicker("", selection: Binding(
                        get: { subtask.dueDate ?? Date() },
                        set: { store.updateTodaySubtaskDueDate(taskID: task.id, subtaskID: subtask.id, dueDate: $0) }
                    ), displayedComponents: .date)
                    .labelsHidden()
                }
                Spacer()
            }
            .padding(.leading, 24)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Color.white.opacity(0.04))
        )
    }
}
