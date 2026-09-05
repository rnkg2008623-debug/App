import SwiftUI

struct VideoPlayerView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newURL = ""
    @State private var selected: VideoLink?

    var body: some View {
        HSplitView {
            VStack(alignment: .leading, spacing: 10) {
                Text("動画リンクを追加").font(.headline)
                TextField("タイトル", text: $newTitle).textFieldStyle(.roundedBorder)
                TextField("URL（YouTubeなど）", text: $newURL).textFieldStyle(.roundedBorder)
                Button("追加") {
                    guard !newURL.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    let link = VideoLink(title: newTitle.isEmpty ? newURL : newTitle, urlString: newURL)
                    store.addVideo(link)
                    selected = link
                    newTitle = ""
                    newURL = ""
                }
                .disabled(newURL.trimmingCharacters(in: .whitespaces).isEmpty)

                Divider()

                Text("保存した動画").font(.headline)
                List(store.videos, selection: $selected) { video in
                    HStack {
                        Text(video.title).lineLimit(1)
                        Spacer()
                        Button {
                            store.removeVideo(video.id)
                            if selected?.id == video.id { selected = nil }
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.plain)
                    }
                    .tag(video)
                }
            }
            .padding()
            .frame(minWidth: 260, idealWidth: 300)

            Group {
                if let selected, let url = URL(string: selected.urlString) {
                    WebView(url: url)
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "play.rectangle")
                            .font(.system(size: 50))
                        Text("左のリストから動画を選択してください")
                    }
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .navigationTitle("動画プレイヤー")
    }
}
