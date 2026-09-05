import SwiftUI

struct CalculatorView: View {
    @StateObject private var engine = CalculatorEngine()
    @State private var showFunctions = true

    private let basicRows: [[String]] = [
        ["C", "±", "%", "÷"],
        ["7", "8", "9", "×"],
        ["4", "5", "6", "-"],
        ["1", "2", "3", "+"],
        ["0", ".", "="]
    ]

    private let functionButtons = ["log", "ln", "sin", "cos", "tan", "√", "x²", "xʸ", "1/x", "x!"]

    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 14) {
                SectionHeading(title: "電卓")

                Text(engine.display)
                    .font(.system(size: 46, weight: .light, design: .monospaced))
                    .foregroundStyle(Theme.accent)
                    .shadow(color: Theme.accent.opacity(0.5), radius: 10)
                    .lineLimit(1)
                    .minimumScaleFactor(0.4)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding()
                    .panelStyle()

                ForEach(basicRows, id: \.self) { row in
                    HStack(spacing: 10) {
                        ForEach(row, id: \.self) { key in
                            CalcButton(label: key, isOperator: isOperatorKey(key)) { handle(key) }
                        }
                    }
                }

                Toggle("関数パネルを表示", isOn: $showFunctions)
                    .toggleStyle(.switch)
                    .tint(Theme.accent)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.top, 6)

                Spacer()
            }
            .padding()
            .frame(width: 340)

            if showFunctions {
                Rectangle().fill(Theme.panelBorder).frame(width: 1)
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeading(title: "関数")
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(functionButtons, id: \.self) { fn in
                            Button(fn) {
                                if fn == "xʸ" {
                                    engine.setOperator("xʸ")
                                } else {
                                    engine.applyFunction(fn)
                                }
                            }
                            .buttonStyle(GlowButtonStyle())
                            .frame(maxWidth: .infinity)
                        }
                    }

                    SectionHeading(title: "履歴")
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(engine.history.reversed(), id: \.self) { line in
                                Text(line).font(.caption).foregroundStyle(Theme.textSecondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding()
                .frame(minWidth: 240)
            }
        }
        .navigationTitle("電卓")
    }

    private func isOperatorKey(_ key: String) -> Bool {
        ["÷", "×", "-", "+", "="].contains(key)
    }

    private func handle(_ key: String) {
        switch key {
        case "C": engine.clear()
        case "±": engine.applyFunction("±")
        case "%": engine.percent()
        case "+", "-", "×", "÷": engine.setOperator(key)
        case "=": engine.equals()
        default: engine.input(key)
        }
    }
}

struct CalcButton: View {
    let label: String
    var isOperator: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 18, weight: .medium))
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(GlowButtonStyle(prominent: isOperator))
    }
}
