package io.github.rnkg2008623.mccustomclient.gui;

import com.mojang.blaze3d.platform.InputConstants;
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
import net.minecraft.network.chat.Component;
import net.minecraft.server.integrated.IntegratedServer;
import net.minecraft.server.level.ServerPlayer;

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
        int y = this.height / 2 - 130;

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

        this.addRenderableWidget(Button.builder(freecamLabel(), button -> {
                    MyCustomClient.toggleFreecam(this.minecraft);
                    button.setMessage(freecamLabel());
                })
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

        IntegratedServer integratedServer = this.minecraft.getSingleplayerServer();
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

    private void mc_custom_client$teleportViaIntegratedServer(IntegratedServer integratedServer, String targetName) {
        ServerPlayer target = integratedServer.getPlayerList().getPlayerByName(targetName);
        if (target == null) {
            this.minecraft.player.sendSystemMessage(Component.literal("プレイヤーが見つかりません: " + targetName), true);
            return;
        }

        ServerPlayer self = integratedServer.getPlayerList().getPlayer(this.minecraft.player.getUUID());
        if (self == null) {
            return;
        }

        self.teleportTo(target.getX(), target.getY(), target.getZ());
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        boolean enterPressed = keyCode == InputConstants.KEY_RETURN || keyCode == InputConstants.KEY_NUMPADENTER;
        if (enterPressed && this.teleportNameField != null && this.teleportNameField.isFocused()) {
            mc_custom_client$teleportToPlayer();
            return true;
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    private static Component waterWalkLabel() {
        String state = WaterWalkController.isEnabled() ? "ON" : "OFF";
        return Component.literal("水上歩行: " + state);
    }

    private static Component freecamLabel() {
        String state = FreecamController.isEnabled() ? "ON" : "OFF";
        return Component.literal("フリーカム: " + state);
    }

    @Override
    public void render(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
        super.render(graphics, mouseX, mouseY, partialTick);
        graphics.drawCenteredString(
                this.font, this.title, this.width / 2, this.height / 2 - 155, 0xFFFFFF
        );
        graphics.drawString(
                this.font,
                Component.literal("テレポート（シングルプレイは権限不要／マルチはOP権限が必要）:"),
                this.width / 2 - WIDGET_WIDTH / 2, this.teleportCaptionY, 0xAAAAAA
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
