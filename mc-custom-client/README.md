# mc-custom-client

自分専用の Minecraft(Java版) カスタムクライアント（Fabric MOD）です。
このリポジトリ内の他のコンテンツ（学習ナビ）とは無関係な、別プロジェクトとしてこのフォルダにまとまっています。

## 現在実装されている機能

- **設定メニュー（Mキー）**: ゲーム中に **M** を押すとスライダー付きの設定画面が開きます。ワールドは一時停止しないので、動かしながらその場で効果を確認できます。
  - **移動速度**: x0.25 〜 x3.00（初期値 x1.00）。歩行・ダッシュなど水平方向の「入力の強さ」を変えます。
  - **ジャンプの高さ**: x0.50 〜 x3.00（初期値 x1.00）。ジャンプの高さだけを変えます。落下速度・移動速度には影響しません。
  - **受けるノックバック**: x0.00 〜 x2.00（初期値 x1.00）。殴られたり爆発に巻き込まれたりしたときに「受ける」ノックバックの強さだけを変えます。0にするとノックバックを完全に無効化できます。自分のジャンプ・落下・移動には一切影響しません。
  - **水上歩行(ON/OFF)**: ボタンでON/OFFを切り替えると、水に入っても沈まず水面を歩けるようになります。潜水はできなくなります（常に水面に押し戻されます）。
  - 「リセット」ボタンで上記すべてを初期値に戻せます。「閉じる」または Esc で閉じます。
  - テンキーがある環境向けに、`+` / `-` / `0` で移動速度を直接増減・リセットするキーも従来通り使えます（**MacBookにはテンキーが無いため、上記のMメニューの利用を推奨します**）。キー割り当ては `オプション → 操作設定 → MCカスタムクライアント` からいつでも変更できます。
  - シングルプレイでは、自分のプレイヤーだけを対象にクライアント側・統合サーバー側の両方に効くように実装しているため、押し戻し（rubber-banding）が起きにくくなっています。
  - **ジャンプの高さ・受けるノックバックについての注意**: この2つはバニラの内部メソッド（`getJumpVelocity` / `takeKnockback`）を直接フックしており、Minecraftのバージョンアップでメソッド名が変わると効かなくなる可能性があります。その場合でも起動失敗はしない設計（`require = 0`）にしてあるので、効果が出ないだけで他の機能（移動速度・ミニマップ・水上歩行など）は通常通り使えます。
  - **マルチプレイで使う場合の注意**: このMODはクライアント側だけで動くため、MODを入れていないサーバーでは各種入力・速度を増幅しているだけになり、サーバー側のチート対策（アンチチート）に検知されたり、押し戻されたりする可能性があります。参加するサーバーのルールを確認し、許可された範囲（自分のサーバー、フレンド内プレイ、ルールで許可されているサーバーなど）で使ってください。
- **右上のミニマップ**: 画面右上に、自分を中心とした縦横100ブロック四方を上から見た簡易マップを常時表示します。
  - 地形の色はブロックの `MapColor`（バニラの地図と同じ色分け）を使い、北隣との高低差で簡易的な陰影（低いと暗く、高いと明るく）をつけています。
  - 中心の赤い点が自分の位置です。北が常に上（回転しません）。
  - 負荷軽減のため、マップの更新は0.5秒（10tick）ごとです。未読み込みのチャンクは暗いグレーで表示されます。
  - 既知の制限: ポーション効果のアイコンなど、他のHUD要素とバニラ標準では右上で重なる場合があります。プレイヤーの向きに合わせた回転や、位置・サイズの設定機能は今後の拡張候補です。

## 前提環境

- JDK 21
- 対象バージョン: Minecraft `1.21.1` / Fabric Loader `0.16.9` / Fabric API `0.102.0+1.21.1`
  - `gradle.properties` で管理しています。時間が経つと最新版とズレるので、ビルドが通らない場合は [Fabric公式の対応表](https://fabricmc.net/develop/) を見てバージョンを更新してください。

> **Note**: この開発環境（サンドボックス）はネットワークポリシーにより `maven.fabricmc.net` へアクセスできないため、Gradleビルドの実行確認はできていません。ビルドは下記のGitHub Actions、またはお手持ちのPC（通常のインターネット環境）で行ってください。

## ビルド済みjarの入手（推奨・ビルド作業不要）

このリポジトリには [GitHub Actions のワークフロー](../.github/workflows/build-mc-mod.yml) が設定されており、`mc-custom-client/` に変更をpushするたびに自動でビルドされます。

1. GitHubのリポジトリページで **Actions** タブを開く
2. 一番上の **Build Minecraft Mod** の実行(緑のチェックが付いているもの)をクリック
3. 一番下の **Artifacts** 欄にある `mc-custom-client-jar` をクリックしてダウンロード（zip形式）
4. zipを展開すると中に `mc-custom-client-0.1.0.jar` が入っています

このjarは Fabric API を同梱済み（Jar-in-Jar）なので、**このjar1つだけ**を `.minecraft/mods` フォルダに入れれば動きます（Fabric API を別途ダウンロードする必要はありません）。

## 自分でビルドする場合

```bash
cd mc-custom-client
./gradlew build
# Windows の場合: gradlew.bat build
```

初回はMinecraft本体・マッピング(Yarn)・Fabric APIなどのダウンロードが走るため時間がかかります。
成功すると `build/libs/mc-custom-client-0.1.0.jar`（Sources jar を除く、remap済みのもの）が生成されます。

## 導入方法

1. [Fabric Installer](https://fabricmc.net/use/installer/) で Minecraft 1.21.1 用の Fabric Loader をインストール（これだけは自動化できない一度きりの作業です）
2. 上記で入手した `mc-custom-client-0.1.0.jar` を `.minecraft/mods` に入れる
3. Minecraft Launcher で "fabric-loader-1.21.1" のプロファイルを起動

## 開発を続ける場合

- IntelliJ IDEA を使う場合は `./gradlew genSources` の後にプロジェクトを開けば、逆コンパイルされたMinecraftのソースを参照しながら開発できます。
- 新機能を追加する際は、クライアント側専用の機能なら `MyCustomClient`（`ClientModInitializer`）に、描画・移動などバニラの内部処理を書き換えたい場合は `mixin` パッケージに Mixin クラスを追加し、`mc_custom_client.mixins.json` の `client` 配列に登録してください。

## ディレクトリ構成

```
mc-custom-client/
├── build.gradle
├── settings.gradle
├── gradle.properties
├── gradlew / gradlew.bat
├── LICENSE
└── src/main/
    ├── java/io/github/rnkg2008623/mccustomclient/
    │   ├── MyCustomClient.java       # ClientModInitializer（キーバインド登録・入力処理・HUD登録）
    │   ├── SpeedController.java      # 移動速度倍率の状態管理
    │   ├── JumpController.java       # ジャンプ高さ倍率の状態管理
    │   ├── VelocityController.java   # 受けるノックバック倍率の状態管理
    │   ├── WaterWalkController.java  # 水上歩行ON/OFFの状態管理
    │   ├── gui/
    │   │   └── SpeedMenuScreen.java   # Mキーで開く設定メニュー(スライダー・ボタン)
    │   ├── hud/
    │   │   └── MinimapRenderer.java   # 右上のミニマップ描画
    │   └── mixin/
    │       └── PlayerSpeedMixin.java  # 移動速度・ジャンプ・ノックバック・水上歩行を実際に変更するMixin
    └── resources/
        ├── fabric.mod.json
        ├── mc_custom_client.mixins.json
        └── assets/mc_custom_client/lang/{en_us,ja_jp}.json
```

## 今後の拡張候補

要望をもとに、次のような機能を追加していく想定です（未実装）。

- 座標・向き・バイオームなどのHUD表示
- アイテム情報の詳細表示
- ミニマップのプレイヤー向き連動回転、ズーム・表示位置の設定
- 描画負荷軽減・チャンク読み込み最適化などのパフォーマンス系設定
