# MacDesktopApp

MacBook上で動く、**完全無料**のMacネイティブデスクトップアプリです。Swift / SwiftUI のみで作られており、App StoreやApple Developer Programの有料登録なしで、自分のMacでビルド・実行できます。すべてのデータはMac内（`~/Library/Application Support/MacDesktopApp/store.json`）に保存され、外部サーバーへの送信は一切ありません。

## 主な機能

1. **メイン画面（ホーム）**: MacBookのデスクトップのような画面。Finderからファイルをドラッグ＆ドロップして自由な位置に置け、ダブルクリックで開けます。背景は設定タブから変更できます。
2. **動画**: YouTubeなどの動画リンクをタイトル付きで保存し、アプリ内蔵のブラウザで再生できます。
3. **ファイル保存**: 保存したファイルをきれいなグリッドUIで一覧・検索でき、開く／Finderで表示／削除ができます。
4. **タイムテーブル**: 曜日 × 時間の週間スケジュールを視覚的に編集できます。「週A」「週B」を切り替えて、隔週のスケジュールを管理できます。
5. **SNSアカウント一覧**: SNSのリンクを絵文字アイコン付きで登録し、クリックでブラウザを開けます。
6. **電卓**: 四則演算に加え、log・ln・sin・cos・tan・√・x²・xʸ・1/x・x! などの関数をワンクリックで呼び出せる関数パネル付き電卓です。計算履歴も確認できます。
7. **テーマ設定**: ライト／ダーク／システムに合わせるを切り替えられ、ホーム画面の背景色や背景画像も自由に変更できます。
8. **ノート**: カテゴリーごとにノートを整理でき（Google Docsのフォルダ分けのようなイメージ）、各ノートをPDFとして書き出せます。

## 必要なもの（すべて無料）

- macOS 13 (Ventura) 以降のMacBook
- **Xcode Command Line Tools**（無料）: ターミナルで以下を実行してインストール
  ```bash
  xcode-select --install
  ```
  すでにXcode本体（App Storeから無料でインストール可能）が入っている場合は不要です。

## 実行方法

### 方法1: ターミナルから実行（最も簡単）

```bash
cd MacDesktopApp
swift run
```

初回はビルドに数十秒〜数分かかりますが、以降は高速に起動します。ウィンドウが自動で開きます。

### 方法2: Xcodeで開く

```bash
cd MacDesktopApp
open Package.swift
```

Xcodeが起動するので、上部のスキームが `MacDesktopApp` になっていることを確認し、▶（実行）ボタンを押してください。Xcode上でブレークポイントを置いたりデバッグしたりもできます。

### 方法3: ビルド済み `.app` をダウンロードする

このリポジトリには GitHub Actions のワークフロー（`.github/workflows/build-mac-app.yml`）が含まれており、macOSランナー上で実際にビルドして Apple Silicon / Intel 両対応のユニバーサルバイナリの `.app` を作成し、ワークフローの Artifacts からダウンロードできます。

1. GitHubの **Actions** タブ → **Build macOS App** ワークフローを開く
2. **Run workflow** で手動実行、または `MacDesktopApp/` に変更をpushすると自動実行されます
3. 実行が終わったら、そのワークフロー実行ページ下部の **Artifacts** から `MacDesktopApp-macOS` をダウンロードして展開すると `MacDesktopApp.app` が入っています

このアプリは開発者署名（Apple Developer Programの有料登録）をしていないため、初回起動時にmacOSのGatekeeperが警告を出します。以下のどちらかで開いてください。

- Finderで `MacDesktopApp.app` を **右クリック（またはControlキー+クリック）→「開く」** を選び、出てきたダイアログでも「開く」を選択する
- またはターミナルで以下を実行してから通常通りダブルクリックで開く
  ```bash
  xattr -cr /path/to/MacDesktopApp.app
  ```

## データの保存場所

すべての情報（ファイル配置・動画リンク・タイムテーブル・SNSリンク・Todo・ノート・テーマ設定）は、以下のJSONファイルに自動保存されます。

```
~/Library/Application Support/MacDesktopApp/store.json
```

アプリをアンインストールしたい場合は、ビルド成果物（`.build/`フォルダ）とこのファイルを削除するだけです。

## 補足

- このアプリはローカル実行専用として作られており、App Sandboxを有効にしていないため、ホーム画面に置いたファイルへ自由にアクセスできます。App Store配布は想定していません（配布する場合は署名・サンドボックス対応が別途必要です）。
- 動画タブはアプリ内蔵のWebビュー（WKWebView）でリンク先を表示する方式のため、YouTube以外の動画サイトのリンクも保存・再生できます。
