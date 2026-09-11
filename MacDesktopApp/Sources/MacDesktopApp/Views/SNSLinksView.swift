import SwiftUI
import AppKit

struct SNSLinksView: View {
    @EnvironmentObject var store: AppStore
    @State private var newPlatform = ""
    @State private var newURL = ""
    @State private var newEmoji = "🔗"

    private let emojiOptions = ["🔗", "📷", "🐦", "📘", "🎵", "💼", "📌", "🎮", "▶️", "👻"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeading(title: "SNSリンクを追加")

            HStack {
                Picker("", selection: $newEmoji) {
                    ForEach(emojiOptions, id: \.self) { Text($0) }
                }
                .labelsHidden()
                .frame(width: 70)
                TextField("サービス名（例: Instagram）", text: $newPlatform).themedField()
                TextField("URL", text: $newURL).themedField()
                Button("追加") {
                    guard !newURL.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    store.addSNSLink(
                        SNSLink(platform: newPlatform.isEmpty ? newURL : newPlatform, urlString: newURL, emoji: newEmoji)
                    )
                    newPlatform = ""
                    newURL = ""
                }
                .buttonStyle(GlowButtonStyle(prominent: true))
                .disabled(newURL.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .panelStyle()

            SectionHeading(title: "登録済みリンク")

            if store.snsLinks.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "link").font(.system(size: 40)).foregroundStyle(Theme.accentGold)
                    Text("SNSリンクを追加してください").foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(store.snsLinks) { link in
                            HStack {
                                Text(link.emoji).font(.title2)
                                VStack(alignment: .leading) {
                                    Text(link.platform).font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.textPrimary)
                                    Text(link.urlString).font(.caption).foregroundStyle(Theme.textSecondary).lineLimit(1)
                                }
                                Spacer()
                                Button("開く") {
                                    if let url = URL(string: link.urlString) {
                                        NSWorkspace.shared.open(url)
                                    }
                                }
                                .buttonStyle(GlowButtonStyle())
                                Button(role: .destructive) {
                                    store.removeSNSLink(link.id)
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(.plain)
                                .foregroundStyle(Theme.textSecondary)
                            }
                            .padding(12)
                            .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                }
            }
        }
        .padding()
    }
}
