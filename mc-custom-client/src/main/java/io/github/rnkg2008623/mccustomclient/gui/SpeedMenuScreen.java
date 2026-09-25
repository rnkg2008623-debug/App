package io.github.rnkg2008623.mccustomclient.gui;

import com.mojang.blaze3d.platform.InputConstants;
import io.github.rnkg2008623.mccustomclient.AirWalkController;
import io.github.rnkg2008623.mccustomclient.FreecamController;
import io.github.rnkg2008623.mccustomclient.JumpController;
import io.github.rnkg2008623.mccustomclient.MyCustomClient;
import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import io.github.rnkg2008623.mccustomclient.WaterWalkController;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtAccounter;
import net.minecraft.nbt.NbtIo;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.storage.LevelResource;

import java.nio.file.Path;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Mキーで開く、MCカスタムクライアントの設定メニュー。
 * 移動速度・Velocity・ジャンプ高さをスライダーで、水上歩行をボタンで切り替えられる。
 * プレイヤー名を入力して、その相手にテレポートすることもできる。
 */
public class SpeedMenuScreen extends Screen {

    private static final int WIDGET_WIDTH = 240;
    private static final int WIDGET_HEIGHT = 20;
    private static final int SPACING = 8;
    private static final int GAP_BETWEEN_SECTIONS = SPACING * 2;

    private EditBox teleportNameField;
    private int teleportCaptionY;

    public SpeedMenuScreen() {
        super(Component.literal("MCカスタムクライアント設定"));
    }

    @Override
    protected void init() {
        int centerX = this.width / 2;
        int y = this.height / 2 - 162;

        this.addRenderableWidget(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                SpeedController.MIN_MULTIPLIER, SpeedController.MAX_MULTIPLIER,
                SpeedController::getMultiplier, SpeedController::set,
                "移動速度: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                VelocityController.MIN_MULTIPLIER, VelocityController.MAX_MULTIPLIER,
                VelocityController::getMultiplier, VelocityController::set,
                "Velocity: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                JumpController.MIN_MULTIPLIER, JumpController.MAX_MULTIPLIER,
                JumpController::getMultiplier, JumpController::set,
                "ジャンプの高さ: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(Button.builder(waterWalkLabel(), button -> {
                    WaterWalkController.toggle();
                    button.setMessage(waterWalkLabel());
                })
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(Button.builder(airWalkLabel(), button -> {
                    AirWalkController.toggle();
                    button.setMessage(airWalkLabel());
                })
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(Button.builder(freecamLabel(), button -> {
                    MyCustomClient.toggleFreecam(this.minecraft);
                    button.setMessage(freecamLabel());
                })
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + GAP_BETWEEN_SECTIONS;

        this.addRenderableWidget(Button.builder(Component.literal("シード値を取得"), button -> mc_custom_client$requestSeed())
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + GAP_BETWEEN_SECTIONS;

        // テレポート: 名前入力欄(左) + 実行ボタン(右)
        this.teleportCaptionY = y;
        y += 12;

        int fieldWidth = 150;
        int teleportButtonWidth = WIDGET_WIDTH - fieldWidth - SPACING;

        this.teleportNameField = new EditBox(
                this.font, centerX - WIDGET_WIDTH / 2, y, fieldWidth, WIDGET_HEIGHT,
                Component.literal("プレイヤー名")
        );
        this.teleportNameField.setMaxLength(16);
        this.teleportNameField.setHint(Component.literal("プレイヤー名"));
        this.addRenderableWidget(this.teleportNameField);

        this.addRenderableWidget(Button.builder(Component.literal("テレポート"), button -> mc_custom_client$teleportToPlayer())
                .pos(centerX - WIDGET_WIDTH / 2 + fieldWidth + SPACING, y)
                .size(teleportButtonWidth, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + GAP_BETWEEN_SECTIONS;

        this.addRenderableWidget(Button.builder(Component.literal("リセット"), button -> {
                    SpeedController.reset();
                    JumpController.reset();
                    VelocityController.reset();
                    WaterWalkController.reset();
                    AirWalkController.reset();
                    FreecamController.setEnabled(false);
                    this.clearWidgets();
                    this.init();
                })
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + SPACING;

        this.addRenderableWidget(Button.builder(Component.literal("閉じる"), button -> this.onClose())
                .pos(centerX - WIDGET_WIDTH / 2, y)
                .size(WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
    }

    private void mc_custom_client$teleportToPlayer() {
        String name = this.teleportNameField.getValue().trim();
        if (name.isEmpty() || this.minecraft == null || this.minecraft.player == null) {
            return;
        }

        MinecraftServer integratedServer = this.minecraft.getSingleplayerServer();
        if (integratedServer != null) {
            // シングルプレイ: 統合サーバー(同じプロセス内)に直接アクセスして動かすので、
            // コマンドの権限チェック(チート許可)を経由せずテレポートできる。
            mc_custom_client$teleportViaIntegratedServer(integratedServer, name);
        } else {
            // マルチプレイ: サーバー側が位置を管理しているため、クライアント側だけで
            // 権限チェックを回避することはできない。バニラのコマンドに委ねる(OP権限が必要)。
            this.minecraft.getConnection().sendCommand("tp " + name);
        }
    }

    /**
     * ワールド保存フォルダのlevel.dat(NBT)を直接読み込んでシード値を取り出す。
     * サーバー内部のWorldGenSettings関連クラスは頻繁に変わるため、代わりに
     * 昔から変わっていないセーブデータ上のキー(Data.WorldGenSettings.seed)
     * を直接読む方が確実、という考え方。
     */
    private Long mc_custom_client$readSeedFromLevelDat(MinecraftServer integratedServer) {
        Path levelDatPath = integratedServer.getWorldPath(LevelResource.LEVEL_DATA_FILE);
        try {
            CompoundTag root = NbtIo.readCompressed(levelDatPath, NbtAccounter.unlimitedHeap());
            CompoundTag data = root.getCompound("Data").orElse(null);
            if (data == null) {
                mc_custom_client$reportSeedFailureDetail(
                        "level.datに'Data'タグが見つかりません (path=" + levelDatPath
                                + ", root keys=" + root.keySet() + ")");
                return null;
            }
            CompoundTag worldGenSettings = data.getCompound("WorldGenSettings").orElse(null);
            if (worldGenSettings == null) {
                mc_custom_client$reportSeedFailureDetail(
                        "'Data'内に'WorldGenSettings'タグが見つかりません (data keys=" + data.keySet() + ")");
                return null;
            }
            return worldGenSettings.getLongOr("seed", 0L);
        } catch (Exception e) {
            mc_custom_client$reportSeedFailureDetail(
                    "level.dat読み込み中に例外(path=" + levelDatPath + "): "
                            + e.getClass().getSimpleName() + ": " + e.getMessage());
            return null;
        }
    }

    /** シード値取得の失敗理由を、原因調査のためチャットに詳細表示する(暫定的なデバッグ用)。 */
    private void mc_custom_client$reportSeedFailureDetail(String detail) {
        if (this.minecraft != null && this.minecraft.player != null) {
            this.minecraft.player.sendSystemMessage(Component.literal(detail));
        }
    }

    private void mc_custom_client$requestSeed() {
        if (this.minecraft == null || this.minecraft.player == null) {
            return;
        }

        MinecraftServer integratedServer = this.minecraft.getSingleplayerServer();
        if (integratedServer != null) {
            // シングルプレイ: 統合サーバー(同じプロセス内)から直接シード値を読み取る。
            // ワールドの「コマンドを許可」がOFFでもコマンドを経由しないので取得できる。
            Long seed = mc_custom_client$readSeedFromLevelDat(integratedServer);
            if (seed == null) {
                this.minecraft.player.sendSystemMessage(Component.literal("シード値の取得に失敗しました"));
                return;
            }
            this.minecraft.player.sendSystemMessage(Component.literal("シード値: " + seed));
        } else {
            // マルチプレイ: サーバー側の情報はクライアントから直接読めないため、
            // バニラの/seedコマンドに委ねる(サーバー側でコマンドが無効化されて
            // いる場合はここでは取得できない)。
            this.minecraft.getConnection().sendCommand("seed");
        }
    }

    private void mc_custom_client$teleportViaIntegratedServer(MinecraftServer integratedServer, String targetName) {
        ServerPlayer target = integratedServer.getPlayerList().getPlayerByName(targetName);
        if (target == null) {
            this.minecraft.gui.hud.setOverlayMessage(Component.literal("プレイヤーが見つかりません: " + targetName), false);
            return;
        }

        ServerPlayer self = integratedServer.getPlayerList().getPlayer(this.minecraft.player.getUUID());
        if (self == null) {
            return;
        }

        self.teleportTo(target.getX(), target.getY(), target.getZ());
    }

    @Override
    public boolean keyPressed(KeyEvent event) {
        boolean enterPressed = event.key() == InputConstants.KEY_RETURN || event.key() == InputConstants.KEY_NUMPADENTER;
        if (enterPressed && this.teleportNameField != null && this.teleportNameField.isFocused()) {
            mc_custom_client$teleportToPlayer();
            return true;
        }
        return super.keyPressed(event);
    }

    private static Component waterWalkLabel() {
        String state = WaterWalkController.isEnabled() ? "ON" : "OFF";
        return Component.literal("水上歩行: " + state);
    }

    private static Component airWalkLabel() {
        String state = AirWalkController.isEnabled() ? "ON" : "OFF";
        return Component.literal("空中歩行: " + state);
    }

    private static Component freecamLabel() {
        String state = FreecamController.isEnabled() ? "ON" : "OFF";
        return Component.literal("フリーカム: " + state);
    }

    @Override
    public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
        super.extractRenderState(graphics, mouseX, mouseY, partialTick);
        graphics.centeredText(
                this.font, this.title, this.width / 2, this.height / 2 - 187, 0xFFFFFF
        );
        graphics.text(
                this.font,
                Component.literal("テレポート（シングルプレイは権限不要／マルチはOP権限が必要）:"),
                this.width / 2 - WIDGET_WIDTH / 2, this.teleportCaptionY, 0xAAAAAA, false
        );
    }

    @Override
    public boolean isPauseScreen() {
        // ワールドを一時停止させず、スライダーの効果をその場で確認できるようにする
        return false;
    }

    /** 「最小〜最大の範囲を持つfloat倍率」を編集する汎用スライダー。 */
    private static final class MultiplierSlider extends AbstractSliderButton {
        private final float min;
        private final float max;
        private final Supplier<Float> getter;
        private final Consumer<Float> setter;
        private final String labelFormat;

        MultiplierSlider(int x, int y, int width, int height, float min, float max,
                          Supplier<Float> getter, Consumer<Float> setter, String labelFormat) {
            super(x, y, width, height, Component.empty(), toNormalized(getter.get(), min, max));
            this.min = min;
            this.max = max;
            this.getter = getter;
            this.setter = setter;
            this.labelFormat = labelFormat;
            this.updateMessage();
        }

        private static double toNormalized(float value, float min, float max) {
            return (value - min) / (max - min);
        }

        @Override
        protected void updateMessage() {
            this.setMessage(Component.literal(String.format(labelFormat, getter.get())));
        }

        @Override
        protected void applyValue() {
            setter.accept(min + (float) this.value * (max - min));
        }
    }
}
