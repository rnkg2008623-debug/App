# mc-custom-client

自分専用の Minecraft(Java版) カスタムクライアント（Fabric MOD）です。
このリポジトリ内の他のコンテンツ（学習ナビ）とは無関係な、別プロジェクトとしてこのフォルダにまとまっています。

## 現在実装されている機能

- **移動速度の変更**: テンキーの `+` / `-` で自分の移動速度倍率（x0.25 〜 x3.00、初期値 x1.00）を0.25刻みで変更し、テンキーの `0` でリセットできます。変更するとアクションバーに現在の倍率が表示されます。
  - キー割り当ては `オプション → 操作設定 → MCカスタムクライアント` からいつでも変更できます。
  - シングルプレイでは、自分のプレイヤーだけを対象にクライアント側・統合サーバー側の両方に効くように実装しているため、押し戻し（rubber-banding）が起きにくくなっています。
  - **マルチプレイで使う場合の注意**: このMODはクライアント側だけで動くため、MODを入れていないサーバーでは移動入力を増幅しているだけになり、サーバー側のチート対策（アンチチート）に検知されたり、大きな倍率だと押し戻されたりする可能性があります。参加するサーバーのルールを確認し、許可された範囲（自分のサーバー、フレンド内プレイ、ルールで許可されているサーバーなど）で使ってください。

## 前提環境

- JDK 21
- 対象バージョン: Minecraft `1.21.1` / Fabric Loader `0.16.9` / Fabric API `0.102.0+1.21.1`
  - `gradle.properties` で管理しています。時間が経つと最新版とズレるので、ビルドが通らない場合は [Fabric公式の対応表](https://fabricmc.net/develop/) を見てバージョンを更新してください。

> **Note**: この開発環境（サンドボックス）はネットワークポリシーにより `maven.fabricmc.net` へアクセスできないため、Gradleビルドの実行確認はできていません。お手持ちのPC（通常のインターネット環境）でビルドしてください。

## ビルド方法

```bash
cd mc-custom-client
./gradlew build
# Windows の場合: gradlew.bat build
```

初回はMinecraft本体・マッピング(Yarn)・Fabric APIなどのダウンロードが走るため時間がかかります。
成功すると `build/libs/mc-custom-client-0.1.0.jar`（Sources jar を除く、remap済みのもの）が生成されます。

## 導入方法

1. [Fabric Installer](https://fabricmc.net/use/installer/) で Minecraft 1.21.1 用の Fabric Loader をインストール
2. [Fabric API](https://modrinth.com/mod/fabric-api) の 1.21.1 対応版を `.minecraft/mods` に入れる
3. 上記でビルドした `mc-custom-client-0.1.0.jar` も同じ `.minecraft/mods` に入れる
4. Minecraft Launcher で "fabric-loader-1.21.1" のプロファイルを起動

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
    │   ├── MyCustomClient.java     # ClientModInitializer（キーバインド登録・入力処理）
    │   ├── SpeedController.java    # 速度倍率の状態管理
    │   └── mixin/
    │       └── PlayerSpeedMixin.java  # 移動速度を実際に変更するMixin
    └── resources/
        ├── fabric.mod.json
        ├── mc_custom_client.mixins.json
        └── assets/mc_custom_client/lang/{en_us,ja_jp}.json
```

## 今後の拡張候補

要望をもとに、次のような機能を追加していく想定です（未実装）。

- 座標・向き・バイオームなどのHUD表示
- アイテム情報の詳細表示
- ミニマップ
- 描画負荷軽減・チャンク読み込み最適化などのパフォーマンス系設定
