import SwiftUI

struct VideoPlayerView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTitle = ""
    @State private var newURL = ""
    @State private var newFolderID: UUID?
    @State private var selected: VideoLink?
    @State private var selectedFolderFilter: UUID?

    @State private var showNewFolderAlert = false
    @State private var newFolderName = ""
    @State private var renamingFolder: VideoFolder?
    @State private var renameText = ""

    private var filteredVideos: [VideoLink] {
        guard let selectedFolderFilter else { return store.videos }
        return store.videos.filter { $0.folderID == selectedFolderFilter }
    }

    var body: some View {
        HSplitView {
            addAndListPane
            playerPane
            folderPane
        }
        .navigationTitle("動画プレイヤー")
        .onChange(of: selectedFolderFilter) { newFolderID = $0 }
        .alert("新しいフォルダ", isPresented: $showNewFolderAlert) {
            TextField("フォルダ名", text: $newFolderName)
            Button("作成") {
                let trimmed = newFolderName.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return }
                store.addVideoFolder(VideoFolder(name: trimmed))
            }
            Button("キャンセル", role: .cancel) {}
        }
        .alert("フォルダ名を変更", isPresented: Binding(
            get: { renamingFolder != nil },
            set: { if !$0 { renamingFolder = nil } }
        )) {
            TextField("フォルダ名", text: $renameText)
            Button("保存") {
                if let folder = renamingFolder {
                    let trimmed = renameText.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty {
                        store.renameVideoFolder(folder.id, name: trimmed)
                    }
                }
                renamingFolder = nil
            }
            Button("キャンセル", role: .cancel) { renamingFolder = nil }
        }
    }

    private var addAndListPane: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeading(title: "動画リンクを追加")

            VStack(alignment: .leading, spacing: 8) {
                TextField("タイトル", text: $newTitle).themedField()
                TextField("URL（YouTubeなど）", text: $newURL).themedField()

                Picker("フォルダ", selection: $newFolderID) {
                    Text("フォルダなし").tag(Optional<UUID>.none)
                    ForEach(store.videoFolders) { folder in
                        Text(folder.name).tag(Optional(folder.id))
                    }
                }

                Button("追加") {
                    guard !newURL.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    let link = VideoLink(
                        title: newTitle.isEmpty ? newURL : newTitle,
                        urlString: newURL,
                        folderID: newFolderID
                    )
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
                    ForEach(filteredVideos) { video in
                        videoRow(video)
                    }
                }
            }
        }
        .padding()
        .frame(minWidth: 300, idealWidth: 340)
    }

    private var playerPane: some View {
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

    private var folderPane: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeading(title: "動画ファイル")

            folderRow(name: "保存した動画（すべて）", isSelected: selectedFolderFilter == nil) {
                selectedFolderFilter = nil
            }

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(store.videoFolders) { folder in
                        folderRow(name: folder.name, isSelected: selectedFolderFilter == folder.id) {
                            selectedFolderFilter = folder.id
                        }
                        .contextMenu {
                            Button("名前を変更") {
                                renamingFolder = folder
                                renameText = folder.name
                            }
                            Button("削除", role: .destructive) {
                                store.removeVideoFolder(folder.id)
                                if selectedFolderFilter == folder.id { selectedFolderFilter = nil }
                                if newFolderID == folder.id { newFolderID = nil }
                            }
                        }
                    }
                }
            }

            Spacer()

            Button {
                newFolderName = ""
                showNewFolderAlert = true
            } label: {
                Label("新しいフォルダ", systemImage: "folder.badge.plus")
            }
            .buttonStyle(GlowButtonStyle())
        }
        .padding()
        .frame(minWidth: 220, idealWidth: 250)
    }

    private func videoRow(_ video: VideoLink) -> some View {
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

    private func folderRow(name: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(name)
                .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? Theme.accent : Theme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
                )
        }
        .buttonStyle(.plain)
    }
}
