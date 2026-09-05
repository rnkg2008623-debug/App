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
            GroupBox("SNSリンクを追加") {
                HStack {
                    Picker("", selection: $newEmoji) {
                        ForEach(emojiOptions, id: \.self) { Text($0) }
                    }
                    .labelsHidden()
                    .frame(width: 70)
                    TextField("サービス名（例: Instagram）", text: $newPlatform).textFieldStyle(.roundedBorder)
                    TextField("URL", text: $newURL).textFieldStyle(.roundedBorder)
                    Button("追加") {
                        guard !newURL.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                        store.addSNSLink(
                            SNSLink(platform: newPlatform.isEmpty ? newURL : newPlatform, urlString: newURL, emoji: newEmoji)
                        )
                        newPlatform = ""
                        newURL = ""
                    }
                    .disabled(newURL.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(8)
            }

            if store.snsLinks.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "link").font(.system(size: 40)).foregroundStyle(.secondary)
                    Text("SNSリンクを追加してください")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(store.snsLinks) { link in
                        HStack {
                            Text(link.emoji).font(.title2)
                            VStack(alignment: .leading) {
                                Text(link.platform).font(.headline)
                                Text(link.urlString).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            }
                            Spacer()
                            Button("開く") {
                                if let url = URL(string: link.urlString) {
                                    NSWorkspace.shared.open(url)
                                }
                            }
                            Button(role: .destructive) {
                                store.removeSNSLink(link.id)
                            } label: {
                                Image(systemName: "trash")
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .padding()
        .navigationTitle("SNSアカウント")
    }
}
