import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct FileStorageView: View {
    @EnvironmentObject var store: AppStore
    @State private var searchText = ""
    @State private var showImporter = false

    private var filtered: [StoredFile] {
        guard !searchText.isEmpty else { return store.files }
        return store.files.filter { $0.displayName.localizedCaseInsensitiveContains(searchText) }
    }

    private let columns = [GridItem(.adaptive(minimum: 120), spacing: 20)]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("検索", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 260)
                Spacer()
                Button {
                    showImporter = true
                } label: {
                    Label("ファイルを追加", systemImage: "plus")
                }
            }
            .padding()

            if filtered.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "tray").font(.system(size: 40)).foregroundStyle(.secondary)
                    Text("ファイルがありません。「ファイルを追加」から取り込んでください。")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 24) {
                        ForEach(filtered) { file in
                            VStack(spacing: 6) {
                                Image(nsImage: NSWorkspace.shared.icon(forFile: file.path))
                                    .resizable()
                                    .frame(width: 56, height: 56)
                                Text(file.displayName)
                                    .font(.caption)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(10)
                            .frame(width: 130)
                            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
                            .onTapGesture(count: 2) { NSWorkspace.shared.open(file.url) }
                            .contextMenu {
                                Button("開く") { NSWorkspace.shared.open(file.url) }
                                Button("Finderで表示") { NSWorkspace.shared.activateFileViewerSelecting([file.url]) }
                                Button("削除", role: .destructive) { store.removeFile(file.id) }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("ファイル")
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
            if case .success(let urls) = result {
                for url in urls {
                    store.addFile(StoredFile(path: url.path, displayName: url.lastPathComponent))
                }
            }
        }
    }
}
