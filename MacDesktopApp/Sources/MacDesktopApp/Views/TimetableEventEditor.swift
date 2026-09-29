import SwiftUI

struct TimetableEventEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State private var event: TimetableEvent
    @State private var startDate: Date
    @State private var endDate: Date

    private let isNew: Bool
    let onSave: (TimetableEvent) -> Void
    let onDelete: (TimetableEvent) -> Void

    private static let colorOptions = [
        "4A90D9", "2E86DE", "1ABC9C", "26C6DA", "5CB85C", "8BC34A",
        "F0AD4E", "FF7043", "D9534F", "E91E8C", "EC407A", "9B59B6",
        "8D6E63", "607D8B", "C0CA33", "5D4037"
    ]

    init(event: TimetableEvent, onSave: @escaping (TimetableEvent) -> Void, onDelete: @escaping (TimetableEvent) -> Void) {
        _event = State(initialValue: event)
        _startDate = State(initialValue: Self.dateFrom(minutes: event.startMinutes))
        _endDate = State(initialValue: Self.dateFrom(minutes: event.endMinutes))
        self.isNew = event.title.isEmpty
        self.onSave = onSave
        self.onDelete = onDelete
    }

    private static func dateFrom(minutes: Int) -> Date {
        var comps = DateComponents()
        comps.hour = minutes / 60
        comps.minute = minutes % 60
        return Calendar.current.date(from: comps) ?? Date()
    }

    private static func minutesFrom(_ date: Date) -> Int {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        return (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeading(title: isNew ? "予定を追加" : "予定を編集")

            TextField("タイトル", text: $event.title).themedField()

            Picker("週", selection: $event.weekType) {
                ForEach(WeekType.allCases) { week in
                    Text(week.rawValue).tag(week)
                }
            }

            Picker("曜日", selection: $event.weekday) {
                ForEach(Weekday.allCases) { day in
                    Text(day.fullLabel).tag(day)
                }
            }

            HStack {
                DatePicker("開始", selection: $startDate, displayedComponents: .hourAndMinute)
                DatePicker("終了", selection: $endDate, displayedComponents: .hourAndMinute)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("色").foregroundStyle(Theme.textSecondary)

                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: 8) {
                    ForEach(Self.colorOptions, id: \.self) { hex in
                        Circle()
                            .fill(Color(hex: hex))
                            .frame(width: 24, height: 24)
                            .overlay(
                                Circle().stroke(Theme.accentGold, lineWidth: event.colorHex.uppercased() == hex ? 2 : 0)
                            )
                            .onTapGesture { event.colorHex = hex }
                    }
                }

                HStack(spacing: 8) {
                    ColorPicker("", selection: Binding(
                        get: { Color(hex: event.colorHex) },
                        set: { event.colorHex = $0.toHex }
                    ))
                    .labelsHidden()
                    .frame(width: 36)

                    Text("#").foregroundStyle(Theme.textSecondary)

                    TextField("RRGGBB", text: Binding(
                        get: { event.colorHex },
                        set: { newValue in
                            let filtered = newValue.uppercased().filter { $0.isHexDigit }
                            event.colorHex = String(filtered.prefix(6))
                        }
                    ))
                    .themedField()
                    .frame(width: 100)

                    Circle()
                        .fill(Color(hex: event.colorHex))
                        .frame(width: 22, height: 22)
                        .overlay(Circle().stroke(Theme.panelBorder, lineWidth: 1))
                }
            }

            TextField("メモ", text: $event.note).themedField()

            HStack {
                if !isNew {
                    Button("削除", role: .destructive) {
                        onDelete(event)
                        dismiss()
                    }
                    .buttonStyle(GlowButtonStyle(destructive: true))
                }
                Spacer()
                Button("キャンセル") { dismiss() }
                    .buttonStyle(GlowButtonStyle())
                Button("保存") {
                    event.startMinutes = Self.minutesFrom(startDate)
                    event.endMinutes = Self.minutesFrom(endDate)
                    onSave(event)
                    dismiss()
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                .keyboardShortcut(.defaultAction)
                .disabled(event.title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 420)
        .background(Theme.backgroundGradient)
    }
}
