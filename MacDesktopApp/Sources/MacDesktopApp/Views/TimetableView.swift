import SwiftUI

struct TimetableView: View {
    @EnvironmentObject var store: AppStore
    @State private var editingEvent: TimetableEvent?

    private let dayStartHour = 6
    private let dayEndHour = 23
    private let hourHeight: CGFloat = 60
    private let dayColumnWidth: CGFloat = 130

    private var visibleEvents: [TimetableEvent] {
        store.events.filter { $0.weekType == .everyWeek || $0.weekType == store.selectedWeek }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Picker("週", selection: $store.selectedWeek) {
                    Text(WeekType.weekA.rawValue).tag(WeekType.weekA)
                    Text(WeekType.weekB.rawValue).tag(WeekType.weekB)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)

                Spacer()

                Button {
                    editingEvent = TimetableEvent(title: "", weekType: store.selectedWeek)
                } label: {
                    Label("予定を追加", systemImage: "plus")
                }
            }
            .padding()

            HStack(spacing: 0) {
                Color.clear.frame(width: 50)
                ForEach(Weekday.allCases) { day in
                    Text(day.shortLabel)
                        .font(.headline)
                        .frame(width: dayColumnWidth)
                }
            }
            .padding(.bottom, 4)

            ScrollView(.vertical) {
                HStack(alignment: .top, spacing: 0) {
                    VStack(spacing: 0) {
                        ForEach(dayStartHour...dayEndHour, id: \.self) { hour in
                            Text(String(format: "%02d:00", hour))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .frame(width: 50, height: hourHeight, alignment: .top)
                        }
                    }

                    ForEach(Weekday.allCases) { day in
                        ZStack(alignment: .top) {
                            VStack(spacing: 0) {
                                ForEach(dayStartHour...dayEndHour, id: \.self) { _ in
                                    Divider().frame(height: hourHeight)
                                }
                            }
                            ForEach(eventsFor(day)) { event in
                                eventBlock(event)
                            }
                        }
                        .frame(width: dayColumnWidth)
                        .overlay(Rectangle().stroke(Color.gray.opacity(0.2)))
                    }
                }
            }
        }
        .navigationTitle("タイムテーブル")
        .sheet(item: $editingEvent) { event in
            TimetableEventEditor(
                event: event,
                onSave: { saved in
                    if store.events.contains(where: { $0.id == saved.id }) {
                        store.updateEvent(saved)
                    } else {
                        store.addEvent(saved)
                    }
                },
                onDelete: { toDelete in
                    store.removeEvent(toDelete.id)
                }
            )
        }
    }

    private func eventsFor(_ day: Weekday) -> [TimetableEvent] {
        visibleEvents.filter { $0.weekday == day }
    }

    @ViewBuilder
    private func eventBlock(_ event: TimetableEvent) -> some View {
        let top = CGFloat(event.startMinutes - dayStartHour * 60) / 60 * hourHeight
        let height = max(CGFloat(event.endMinutes - event.startMinutes) / 60 * hourHeight, 20)

        VStack(alignment: .leading, spacing: 2) {
            Text(event.title).font(.caption).bold().lineLimit(2)
            Text("\(minutesToLabel(event.startMinutes))-\(minutesToLabel(event.endMinutes))")
                .font(.caption2)
        }
        .padding(4)
        .frame(width: dayColumnWidth - 10, height: height, alignment: .topLeading)
        .background(Color(hex: event.colorHex).opacity(0.85))
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .offset(x: 4, y: top)
        .onTapGesture { editingEvent = event }
    }

    private func minutesToLabel(_ minutes: Int) -> String {
        String(format: "%02d:%02d", minutes / 60, minutes % 60)
    }
}
