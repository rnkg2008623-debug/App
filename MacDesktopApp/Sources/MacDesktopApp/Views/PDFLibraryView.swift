import SwiftUI
import AppKit
import PDFKit
import UniformTypeIdentifiers

struct PDFLibraryView: View {
    @EnvironmentObject var store: AppStore
    @State private var selected: PDFItem?
    @State private var selectedFolderFilter: UUID?

    @State private var showNewFolderAlert = false
    @State private var newFolderName = ""
    @State private var renamingFolder: PDFFolder?
    @State private var renameText = ""

    var body: some View {
        HSplitView {
            folderPane
            viewerPane
        }
        .alert("新しいフォルダ", isPresented: $showNewFolderAlert) {
            TextField("フォルダ名", text: $newFolderName)
            Button("作成") {
                let trimmed = newFolderName.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return }
                store.addPDFFolder(PDFFolder(name: trimmed))
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
                        store.renamePDFFolder(folder.id, name: trimmed)
                    }
                }
                renamingFolder = nil
            }
            Button("キャンセル", role: .cancel) { renamingFolder = nil }
        }
    }

    private var folderPane: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeading(title: "PDFライブラリ")

            Button {
                importPDFs()
            } label: {
                Label("PDFをアップロード", systemImage: "doc.badge.plus")
            }
            .buttonStyle(GlowButtonStyle(prominent: true))

            Text("PDFをアップロードして、選べるセクション・フォルダーなどを作成可能")
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)

            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    folderSection(id: nil, name: "すべてのPDF")

                    ForEach(store.pdfFolders) { folder in
                        folderSection(id: folder.id, name: folder.name)
                            .contextMenu {
                                Button("名前を変更") {
                                    renamingFolder = folder
                                    renameText = folder.name
                                }
                                Button("削除", role: .destructive) {
                                    store.removePDFFolder(folder.id)
                                    if selectedFolderFilter == folder.id { selectedFolderFilter = nil }
                                }
                            }
                    }
                }
            }

            Button {
                newFolderName = ""
                showNewFolderAlert = true
            } label: {
                Label("新しいフォルダ", systemImage: "folder.badge.plus")
            }
            .buttonStyle(GlowButtonStyle())
        }
        .padding()
        .frame(minWidth: 240, idealWidth: 270)
    }

    private func importPDFs() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.pdf]
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK else { return }
        for url in panel.urls {
            let item = PDFItem(
                title: url.deletingPathExtension().lastPathComponent,
                path: url.path,
                folderID: selectedFolderFilter
            )
            store.addPDFItem(item)
            selected = item
        }
    }

    @ViewBuilder
    private func folderSection(id: UUID?, name: String) -> some View {
        let isExpanded = selectedFolderFilter == id
        VStack(alignment: .leading, spacing: 2) {
            folderRow(name: name, isSelected: isExpanded) {
                selectedFolderFilter = id
            }

            if isExpanded {
                let items = id == nil ? store.pdfItems : store.pdfItems.filter { $0.folderID == id }
                if items.isEmpty {
                    Text("PDFがありません")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                        .padding(.leading, 18)
                        .padding(.vertical, 4)
                } else {
                    VStack(spacing: 3) {
                        ForEach(items) { item in
                            pdfRow(item)
                        }
                    }
                    .padding(.leading, 12)
                }
            }
        }
    }

    private func pdfRow(_ item: PDFItem) -> some View {
        Button {
            selected = item
        } label: {
            HStack {
                Image(systemName: "doc.text")
                Text(item.title)
                    .font(.system(size: 12, weight: selected?.id == item.id ? .semibold : .regular))
                    .foregroundStyle(selected?.id == item.id ? Theme.accent : Theme.textPrimary)
                    .lineLimit(1)
                Spacer()
                Button {
                    store.removePDFItem(item.id)
                    if selected?.id == item.id { selected = nil }
                } label: {
                    Image(systemName: "trash")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(selected?.id == item.id ? Theme.accent.opacity(0.12) : Color.white.opacity(0.04))
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

    private var viewerPane: some View {
        Group {
            if let selected, FileManager.default.fileExists(atPath: selected.path) {
                PDFKitRepresentable(url: URL(fileURLWithPath: selected.path))
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 44))
                        .foregroundStyle(Theme.accentGold)
                    Text("選択されたPDFを展開する場所")
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundStyle(Theme.textPrimary)
                        .multilineTextAlignment(.center)
                    Text("左のリストからPDFを選択してください")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Theme.panelBorder, lineWidth: 1)
        )
        .padding()
    }
}

private struct PDFKitRepresentable: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.document = PDFDocument(url: url)
        return view
    }

    func updateNSView(_ nsView: PDFView, context: Context) {
        if nsView.document?.documentURL != url {
            nsView.document = PDFDocument(url: url)
        }
    }
}
