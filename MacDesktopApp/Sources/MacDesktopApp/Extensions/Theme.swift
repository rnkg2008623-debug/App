import SwiftUI

enum Theme {
    static let accent = Color(hex: "3FD7C4")
    static let accentGold = Color(hex: "D9B872")
    static let panelBorder = Color.white.opacity(0.10)
    static let textPrimary = Color(hex: "EAF0F2")
    static let textSecondary = Color(hex: "8FA0AC")

    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [Color(hex: "0A121A"), Color(hex: "0F1F22"), Color(hex: "090D12")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

extension Font {
    static func themeTitle(_ size: CGFloat = 22) -> Font {
        .system(size: size, weight: .semibold, design: .serif)
    }
}

struct SectionHeading: View {
    let title: String

    var body: some View {
        HStack(spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .bold))
                .tracking(2.5)
                .foregroundStyle(Theme.accentGold)
            Rectangle()
                .fill(Theme.accentGold.opacity(0.35))
                .frame(height: 1)
        }
    }
}

struct GlowButtonStyle: ButtonStyle {
    var prominent: Bool = false
    var destructive: Bool = false

    private var tint: Color {
        destructive ? Color(hex: "E2685C") : Theme.accent
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .tracking(0.4)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(prominent
                          ? tint.opacity(configuration.isPressed ? 0.7 : 0.9)
                          : Color.white.opacity(configuration.isPressed ? 0.10 : 0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(prominent ? tint : (destructive ? tint.opacity(0.6) : Theme.panelBorder), lineWidth: 1)
            )
            .foregroundStyle(prominent ? Color.black : (destructive ? tint : Theme.textPrimary))
            .shadow(color: prominent ? tint.opacity(configuration.isPressed ? 0.15 : 0.4) : .clear,
                    radius: configuration.isPressed ? 2 : 8)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct PanelBackground: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Theme.panelBorder, lineWidth: 1)
            )
    }
}

extension View {
    func panelStyle(padding: CGFloat = 16) -> some View {
        modifier(PanelBackground(padding: padding))
    }

    func themedField() -> some View {
        self
            .textFieldStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Theme.panelBorder, lineWidth: 1)
            )
    }

    func themedBackground() -> some View {
        background(
            Theme.backgroundGradient
                .ignoresSafeArea()
        )
    }
}
