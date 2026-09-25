# Velocity & Jump Mod (Minecraft 26.3 / Fabric)

自分自身の **velocity (速度ベクトル)** と **ジャンプの高さ** を自由に変更できるクライアント専用 Mod です。

- Minecraft: **26.3**
- Mod Loader: **Fabric Loader 0.19.5 以上**
- 必須 Mod: **Fabric API** (0.161.0+26.3)
- Java: **25**

## 導入方法

1. [Fabric Installer](https://fabricmc.net/use/installer/) で Minecraft 26.3 に Fabric を入れる
2. `.minecraft/mods` に **Fabric API** と、この Mod の jar を入れる
3. Fabric のプロファイルで起動

### jar の入手 / ビルド

- GitHub の **Actions → velocity-jump-mod** の実行結果の Artifacts から jar をダウンロードできます
- 自分でビルドする場合 (JDK 25 が必要):

```sh
cd minecraft-mod/velocity-jump-mod
./gradlew build
# → build/libs/velocity-jump-mod-1.0.0.jar
```

## キー操作 (設定 → 操作設定 → 「Velocity & Jump」で変更可)

| キー | 動作 |
| --- | --- |
| `V` | 視線方向にダッシュ (velocity に加算) |
| `G` | 真上に打ち上げ (縦の velocity を設定) |
| `J` | ジャンプ高さ変更の ON / OFF |
| `=` | ジャンプ高さ +0.5 ブロック |
| `-` | ジャンプ高さ -0.5 ブロック |

## コマンド (クライアントコマンド)

### velocity

| コマンド | 説明 |
| --- | --- |
| `/vel` | 現在の velocity を表示 |
| `/vel set <x> <y> <z>` | velocity を設定 (例: `/vel set 0 2 0`) |
| `/vel add <x> <y> <z>` | velocity に加算 |
| `/vel mul <倍率>` | velocity を倍率で掛ける |
| `/vel look <強さ>` | 視線方向に速度を加算 |
| `/vel stop` | velocity を 0 にする |
| `/vel dash [強さ]` | `V` キーのダッシュの強さを表示/設定 (初期値 1.5) |
| `/vel launch [強さ]` | `G` キーの打ち上げの強さを表示/設定 (初期値 1.5) |

velocity の単位は「ブロック / tick」(1 秒 = 20 tick) です。

### ジャンプの高さ

| コマンド | 説明 |
| --- | --- |
| `/jumpheight` | 現在の設定を表示 |
| `/jumpheight <ブロック>` | ジャンプの高さをブロック単位で設定して ON (例: `/jumpheight 5`) |
| `/jumpheight on` / `off` | ON / OFF |
| `/jumpheight reset` | バニラ (約 1.25 ブロック) に戻して OFF |

ジャンプ高さは、バニラの重力 (`minecraft:gravity` 属性) と空気抵抗 (0.98) を使って
「指定した高さに届く初速」を逆算し、`minecraft:jump_strength` 属性に設定しています。
跳躍力上昇ポーションの効果はこの上に加算されます。

設定は `config/velocityjump.properties` に保存されます。

## 注意

- **落下ダメージ** はサーバー側で計算されるため、高くジャンプすると普通にダメージを受けます。
  シングルプレイなら `/attribute @s minecraft:safe_fall_distance base set 1000` などで対策できます。
- マルチプレイのサーバーではアンチチートに検出される可能性があります。シングルプレイや許可されたサーバーで使ってください。
