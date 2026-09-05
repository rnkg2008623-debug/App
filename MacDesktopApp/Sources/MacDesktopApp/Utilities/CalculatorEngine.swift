import Foundation

final class CalculatorEngine: ObservableObject {
    @Published var display: String = "0"
    @Published var history: [String] = []

    private var pendingValue: Double?
    private var pendingOp: String?
    private var startingNewNumber = true

    func input(_ digit: String) {
        if startingNewNumber || display == "0" {
            display = digit == "." ? "0." : digit
            startingNewNumber = false
        } else {
            if digit == "." && display.contains(".") { return }
            display += digit
        }
    }

    func setOperator(_ op: String) {
        guard let value = Double(display) else { return }
        if let pendingOp, let pendingValue {
            let result = apply(pendingOp, pendingValue, value)
            display = format(result)
            self.pendingValue = result
        } else {
            pendingValue = value
        }
        pendingOp = op
        startingNewNumber = true
    }

    func equals() {
        guard let op = pendingOp, let pendingValue, let value = Double(display) else { return }
        let result = apply(op, pendingValue, value)
        history.append("\(format(pendingValue)) \(op) \(format(value)) = \(format(result))")
        display = format(result)
        self.pendingValue = nil
        pendingOp = nil
        startingNewNumber = true
    }

    func applyFunction(_ name: String) {
        guard let value = Double(display) else { return }
        let result: Double
        switch name {
        case "log": result = log10(value)
        case "ln": result = log(value)
        case "sin": result = sin(value * .pi / 180)
        case "cos": result = cos(value * .pi / 180)
        case "tan": result = tan(value * .pi / 180)
        case "√": result = sqrt(value)
        case "x²": result = value * value
        case "1/x": result = value == 0 ? .nan : 1 / value
        case "x!": result = factorial(value)
        case "±": result = -value
        default: result = value
        }
        if name != "±" {
            history.append("\(name)(\(format(value))) = \(format(result))")
        }
        display = format(result)
        startingNewNumber = true
    }

    func percent() {
        guard let value = Double(display) else { return }
        display = format(value / 100)
        startingNewNumber = true
    }

    func clear() {
        display = "0"
        pendingValue = nil
        pendingOp = nil
        startingNewNumber = true
    }

    private func apply(_ op: String, _ a: Double, _ b: Double) -> Double {
        switch op {
        case "+": return a + b
        case "-": return a - b
        case "×": return a * b
        case "÷": return b == 0 ? .nan : a / b
        case "xʸ": return pow(a, b)
        default: return b
        }
    }

    private func factorial(_ n: Double) -> Double {
        guard n >= 0, n == n.rounded(), n <= 170 else { return .nan }
        var result: Double = 1
        var i: Double = 2
        while i <= n {
            result *= i
            i += 1
        }
        return result
    }

    private func format(_ value: Double) -> String {
        if value.isNaN || value.isInfinite { return "エラー" }
        if value == value.rounded() && abs(value) < 1e15 {
            return String(format: "%.0f", value)
        }
        return String(format: "%.10g", value)
    }
}
