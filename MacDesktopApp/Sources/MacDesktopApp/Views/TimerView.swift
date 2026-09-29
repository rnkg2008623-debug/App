import SwiftUI

struct TimerView: View {
    @EnvironmentObject var store: AppStore
    @State private var labelDraft: String = ""
    @State private var editingEntryID: UUID?
    @State private var editingText: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeading(title: "タイマー")

            VStack(alignment: .leading, spacing: 14) {
                TextField("何の作業をしていますか？", text: labelBinding)
                    .themedField()

                TimelineView(.periodic(from: .now, by: 1)) { context in
                    Text(TimeFormat.hms(elapsed(at: context.date)))
                        .font(.system(size: 52, weight: .light, design: .monospaced))
                        .foregroundStyle(Theme.accent)
                        .shadow(color: Theme.accent.opacity(0.5), radius: 10)
                }

                if store.activeTimer == nil {
                    Button {
                        store.startTimer(label: labelDraft.trimmingCharacters(in: .whitespaces).isEmpty ? "作業" : labelDraft)
                    } label: {
                        Label("開始", systemImage: "play.fill")
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                } else {
                    Button {
                        store.stopTimer()
                        labelDraft = ""
                    } label: {
                        Label("停止", systemImage: "stop.fill")
                    }
                    .buttonStyle(GlowButtonStyle(destructive: true))
                }

                Text("他のタブに移動したりウィンドウが背面にあっても、タイマーは止まらず動き続けます。")
                    .font(.caption2)
                    .foregroundStyle(Theme.textSecondary)
            }
            .panelStyle()

            SectionHeading(title: "記録")
            ScrollView {
                VStack(spacing: 6) {
                    let sorted = store.timeEntries.sorted { $0.startedAt > $1.startedAt }
                    if sorted.isEmpty {
                        Text("まだ記録がありません")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.vertical, 12)
                    } else {
                        ForEach(sorted) { entry in
                            entryRow(entry)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var labelBinding: Binding<String> {
        Binding(
            get: { store.activeTimer?.label ?? labelDraft },
            set: { newValue in
                if store.activeTimer != nil {
                    store.updateActiveTimerLabel(newValue)
                } else {
                    labelDraft = newValue
                }
            }
        )
    }

    private func elapsed(at now: Date) -> Double {
        guard let active = store.activeTimer else { return 0 }
        return now.timeIntervalSince(active.startedAt)
    }

    private func entryRow(_ entry: TimeEntry) -> some View {
        HStack(spacing: 10) {
            if editingEntryID == entry.id {
                TextField("ラベル", text: $editingText, onCommit: {
                    store.updateTimeEntryLabel(entry.id, label: editingText)
                    editingEntryID = nil
                })
                .themedField()
            } else {
                Text(entry.label)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.textPrimary)
                    .onTapGesture {
                        editingEntryID = entry.id
                        editingText = entry.label
                    }
            }

            Spacer()

            Text(entry.startedAt.formatted(date: .abbreviated, time: .shortened))
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)

            Text(TimeFormat.hms(entry.durationSeconds))
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Theme.accent)

            Button {
                store.removeTimeEntry(entry.id)
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
