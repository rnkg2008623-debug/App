import SwiftUI
import AppKit

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let r: Double
        let g: Double
        let b: Double
        if cleaned.count == 6 {
            r = Double((value >> 16) & 0xFF) / 255
            g = Double((value >> 8) & 0xFF) / 255
            b = Double(value & 0xFF) / 255
        } else {
            r = 0.12
            g = 0.15
            b = 0.2
        }
        self.init(red: r, green: g, blue: b)
    }

    var toHex: String {
        let nsColor = NSColor(self).usingColorSpace(.deviceRGB)
            ?? NSColor(red: 0.12, green: 0.15, blue: 0.2, alpha: 1)
        let r = Int((nsColor.redComponent * 255).rounded())
        let g = Int((nsColor.greenComponent * 255).rounded())
        let b = Int((nsColor.blueComponent * 255).rounded())
        return String(format: "%02X%02X%02X", r, g, b)
    }
}
