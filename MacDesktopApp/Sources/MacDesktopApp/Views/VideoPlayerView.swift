import SwiftUI

struct VideoPlayerView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newURL = ""
    @State private var selected: VideoLink?

    var body: some View {
        HSplitView {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeading(title: "動画リンクを追加")

                VStack(alignment: .leading, spacing: 8) {
                    TextField("タイトル", text: $newTitle).themedField()
                    TextField("URL（YouTubeなど）", text: $newURL).themedField()
                    Button("追加") {
                        guard !newURL.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                        let link = VideoLink(title: newTitle.isEmpty ? newURL : newTitle, urlString: newURL)
                        store.addVideo(link)
                        selected = link
                        newTitle = ""
                        newURL = ""
                    }
                    .buttonStyle(GlowButtonStyle(prominent: true))
                    .disabled(newURL.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .panelStyle()

                SectionHeading(title: "保存した動画")

                ScrollView {
                    VStack(spacing: 6) {
                        ForEach(store.videos) { video in
                            Button {
                                selected = video
                            } label: {
                                HStack {
                                    Text(video.title)
                                        .font(.system(size: 13, weight: selected?.id == video.id ? .semibold : .regular))
                                        .foregroundStyle(selected?.id == video.id ? Theme.accent : Theme.textPrimary)
                                        .lineLimit(1)
                                    Spacer()
                                    Button {
                                        store.removeVideo(video.id)
                                        if selected?.id == video.id { selected = nil }
                                    } label: {
                                        Image(systemName: "trash")
                                    }
                                    .buttonStyle(.plain)
                                    .foregroundStyle(Theme.textSecondary)
                                }
                                .padding(10)
                                .background(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .fill(selected?.id == video.id ? Theme.accent.opacity(0.12) : Color.white.opacity(0.04))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding()
            .frame(minWidth: 280, idealWidth: 320)

            Group {
                if let selected, let url = URL(string: selected.urlString) {
                    WebView(url: url)
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "play.rectangle")
                            .font(.system(size: 50))
                            .foregroundStyle(Theme.accentGold)
                        Text("左のリストから動画を選択してください")
                            .foregroundStyle(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .themedBackground()
                }
            }
        }
        .navigationTitle("動画プレイヤー")
    }
}
