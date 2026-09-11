import SwiftUI
import Charts

private enum StatsRange: String, CaseIterable, Identifiable {
    case threeDays = "3日"
    case oneWeek = "1週間"
    case twoWeeks = "2週間"
    case threeWeeks = "3週間"
    case oneMonth = "1ヶ月"
    case threeMonths = "3ヶ月"

    var id: String { rawValue }

    var days: Int {
        switch self {
        case .threeDays: return 3
        case .oneWeek: return 7
        case .twoWeeks: return 14
        case .threeWeeks: return 21
        case .oneMonth: return 30
        case .threeMonths: return 90
        }
    }
}

private struct DailyTotal: Identifiable {
    var id: Date { day }
    let day: Date
    let totalSeconds: Double
}

struct StatisticsView: View {
    @EnvironmentObject var store: AppStore
    @State private var range: StatsRange = .oneWeek

    private var totalSeconds: Double {
        store.timeEntries.reduce(0) { $0 + $1.durationSeconds }
    }

    private var dailyTotals: [DailyTotal] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let earliest = calendar.date(byAdding: .day, value: -(range.days - 1), to: today) else { return [] }

        var buckets: [Date: Double] = [:]
        var day = earliest
        while day <= today {
            buckets[day] = 0
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }

        for entry in store.timeEntries {
            let entryDay = calendar.startOfDay(for: entry.startedAt)
            guard entryDay >= earliest, entryDay <= today else { continue }
            buckets[entryDay, default: 0] += entry.durationSeconds
        }

        return buckets.keys.sorted().map { DailyTotal(day: $0, totalSeconds: buckets[$0] ?? 0) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SectionHeading(title: "統計")

                HStack(spacing: 16) {
                    statTile(title: "合計（秒）", value: String(format: "%.0f 秒", totalSeconds))
                    statTile(title: "合計（時間）", value: String(format: "%.2f 時間", totalSeconds / 3600))
                    statTile(title: "合計（日）", value: String(format: "%.2f 日", totalSeconds / 86400))
                }

                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        SectionHeading(title: "期間ごとのグラフ")
                        Spacer()
                        Picker("期間", selection: $range) {
                            ForEach(StatsRange.allCases) { r in
                                Text(r.rawValue).tag(r)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(width: 130)
                    }

                    if dailyTotals.allSatisfy({ $0.totalSeconds == 0 }) {
                        Text("この期間の記録がありません")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .frame(maxWidth: .infinity, minHeight: 180)
                    } else {
                        Chart(dailyTotals) { item in
                            BarMark(
                                x: .value("日付", item.day, unit: .day),
                                y: .value("時間", item.totalSeconds / 3600)
                            )
                            .foregroundStyle(Theme.accent.gradient)
                            .cornerRadius(4)
                        }
                        .frame(height: 260)
                        .chartYAxisLabel("時間")
                        .chartXAxis {
                            AxisMarks(values: .stride(by: .day, count: max(range.days / 7, 1))) { value in
                                AxisGridLine()
                                AxisValueLabel(format: .dateTime.month().day())
                            }
                        }
                        .chartYAxis {
                            AxisMarks { value in
                                AxisGridLine()
                                AxisValueLabel()
                            }
                        }
                    }
                }
                .panelStyle()

                Spacer()
            }
            .padding()
        }
    }

    private func statTile(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.caption).foregroundStyle(Theme.textSecondary)
            Text(value).font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .panelStyle()
    }
}
