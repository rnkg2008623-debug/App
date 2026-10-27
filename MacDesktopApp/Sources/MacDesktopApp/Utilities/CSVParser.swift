import Foundation

enum CSVParser {
    /// Splits one CSV line into fields, treating commas inside a
    /// double-quoted field as literal characters rather than separators.
    static func parseLine(_ line: String) -> [String] {
        var fields: [String] = []
        var current = ""
        var insideQuotes = false
        for char in line {
            if char == "\"" {
                insideQuotes.toggle()
            } else if char == "," && !insideQuotes {
                fields.append(current)
                current = ""
            } else {
                current.append(char)
            }
        }
        fields.append(current)
        return fields.map { $0.trimmingCharacters(in: .whitespaces) }
    }

    static func parse(_ text: String) -> [[String]] {
        text
            .split(separator: "\n", omittingEmptySubsequences: true)
            .map { parseLine(String($0)) }
    }
}
