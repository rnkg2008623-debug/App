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
            VStack(spacing: 12) {
                Text(engine.display)
                    .font(.system(size: 48, weight: .light, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.4)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding()

                ForEach(basicRows, id: \.self) { row in
                    HStack(spacing: 10) {
                        ForEach(row, id: \.self) { key in
                            CalcButton(label: key) { handle(key) }
                        }
                    }
                }

                Toggle("関数パネルを表示", isOn: $showFunctions)
                    .toggleStyle(.switch)
                    .padding(.top, 6)

                Spacer()
            }
            .padding()
            .frame(width: 340)

            if showFunctions {
                Divider()
                VStack(alignment: .leading, spacing: 10) {
                    Text("関数").font(.headline)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(functionButtons, id: \.self) { fn in
                            Button(fn) {
                                if fn == "xʸ" {
                                    engine.setOperator("xʸ")
                                } else {
                                    engine.applyFunction(fn)
                                }
                            }
                            .buttonStyle(.bordered)
                            .frame(maxWidth: .infinity)
                        }
                    }

                    Divider()
                    Text("履歴").font(.headline)
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(engine.history.reversed(), id: \.self) { line in
                                Text(line).font(.caption).foregroundStyle(.secondary)
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
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.title2)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
    }
}
