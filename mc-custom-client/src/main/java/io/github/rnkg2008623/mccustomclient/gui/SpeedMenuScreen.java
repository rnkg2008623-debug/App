package io.github.rnkg2008623.mccustomclient.gui;

import io.github.rnkg2008623.mccustomclient.JumpController;
import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import io.github.rnkg2008623.mccustomclient.WaterWalkController;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.SliderWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.server.integrated.IntegratedServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

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

    private TextFieldWidget teleportNameField;
    private int teleportCaptionY;

    public SpeedMenuScreen() {
        super(Text.literal("MCカスタムクライアント設定"));
    }

    @Override
    protected void init() {
        int centerX = this.width / 2;
        int y = this.height / 2 - 115;

        this.addDrawableChild(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                SpeedController.MIN_MULTIPLIER, SpeedController.MAX_MULTIPLIER,
                SpeedController::getMultiplier, SpeedController::set,
                "移動速度: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                VelocityController.MIN_MULTIPLIER, VelocityController.MAX_MULTIPLIER,
                VelocityController::getMultiplier, VelocityController::set,
                "Velocity: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(new MultiplierSlider(
                centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT,
                JumpController.MIN_MULTIPLIER, JumpController.MAX_MULTIPLIER,
                JumpController::getMultiplier, JumpController::set,
                "ジャンプの高さ: x%.2f"
        ));
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(ButtonWidget.builder(waterWalkLabel(), button -> {
                    WaterWalkController.toggle();
                    button.setMessage(waterWalkLabel());
                })
                .dimensions(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + GAP_BETWEEN_SECTIONS;

        // テレポート: 名前入力欄(左) + 実行ボタン(右)
        this.teleportCaptionY = y;
        y += 12;

        int fieldWidth = 150;
        int teleportButtonWidth = WIDGET_WIDTH - fieldWidth - SPACING;

        this.teleportNameField = new TextFieldWidget(
                this.textRenderer, centerX - WIDGET_WIDTH / 2, y, fieldWidth, WIDGET_HEIGHT,
                Text.literal("プレイヤー名")
        );
        this.teleportNameField.setMaxLength(16);
        this.teleportNameField.setPlaceholder(Text.literal("プレイヤー名"));
        this.addDrawableChild(this.teleportNameField);

        this.addDrawableChild(ButtonWidget.builder(Text.literal("テレポート"), button -> mc_custom_client$teleportToPlayer())
                .dimensions(centerX - WIDGET_WIDTH / 2 + fieldWidth + SPACING, y, teleportButtonWidth, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + GAP_BETWEEN_SECTIONS;

        this.addDrawableChild(ButtonWidget.builder(Text.literal("リセット"), button -> {
                    SpeedController.reset();
                    JumpController.reset();
                    VelocityController.reset();
                    WaterWalkController.reset();
                    this.clearAndInit();
                })
                .dimensions(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(ButtonWidget.builder(Text.literal("閉じる"), button -> this.close())
                .dimensions(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
    }

    private void mc_custom_client$teleportToPlayer() {
        String name = this.teleportNameField.getText().trim();
        if (name.isEmpty() || this.client == null || this.client.player == null) {
            return;
        }

        IntegratedServer integratedServer = this.client.getServer();
        if (integratedServer != null) {
            // シングルプレイ: 統合サーバー(同じプロセス内)に直接アクセスして動かすので、
            // コマンドの権限チェック(チート許可)を経由せずテレポートできる。
            mc_custom_client$teleportViaIntegratedServer(integratedServer, name);
        } else {
            // マルチプレイ: サーバー側が位置を管理しているため、クライアント側だけで
            // 権限チェックを回避することはできない。バニラのコマンドに委ねる(OP権限が必要)。
            this.client.player.networkHandler.sendChatCommand("tp " + name);
        }
    }

    private void mc_custom_client$teleportViaIntegratedServer(IntegratedServer integratedServer, String targetName) {
        ServerPlayerEntity target = integratedServer.getPlayerManager().getPlayer(targetName);
        if (target == null) {
            this.client.player.sendMessage(Text.literal("プレイヤーが見つかりません: " + targetName), true);
            return;
        }

        ServerPlayerEntity self = integratedServer.getPlayerManager().getPlayer(this.client.player.getUuid());
        if (self == null) {
            return;
        }

        self.networkHandler.requestTeleport(target.getX(), target.getY(), target.getZ(), target.getYaw(), target.getPitch());
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        boolean enterPressed = keyCode == GLFW.GLFW_KEY_ENTER || keyCode == GLFW.GLFW_KEY_KP_ENTER;
        if (enterPressed && this.teleportNameField != null && this.teleportNameField.isFocused()) {
            mc_custom_client$teleportToPlayer();
            return true;
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    private static Text waterWalkLabel() {
        String state = WaterWalkController.isEnabled() ? "ON" : "OFF";
        return Text.literal("水上歩行: " + state);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        this.renderBackground(context, mouseX, mouseY, delta);
        super.render(context, mouseX, mouseY, delta);
        context.drawCenteredTextWithShadow(
                this.textRenderer, this.title, this.width / 2, this.height / 2 - 140, 0xFFFFFF
        );
        context.drawTextWithShadow(
                this.textRenderer,
                Text.literal("テレポート（シングルプレイは権限不要／マルチはOP権限が必要）:"),
                this.width / 2 - WIDGET_WIDTH / 2, this.teleportCaptionY, 0xAAAAAA
        );
    }

    @Override
    public boolean shouldPause() {
        // ワールドを一時停止させず、スライダーの効果をその場で確認できるようにする
        return false;
    }

    /** 「最小〜最大の範囲を持つfloat倍率」を編集する汎用スライダー。 */
    private static final class MultiplierSlider extends SliderWidget {
        private final float min;
        private final float max;
        private final Supplier<Float> getter;
        private final Consumer<Float> setter;
        private final String labelFormat;

        MultiplierSlider(int x, int y, int width, int height, float min, float max,
                          Supplier<Float> getter, Consumer<Float> setter, String labelFormat) {
            super(x, y, width, height, Text.empty(), toNormalized(getter.get(), min, max));
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
            this.setMessage(Text.literal(String.format(labelFormat, getter.get())));
        }

        @Override
        protected void applyValue() {
            setter.accept(min + (float) this.value * (max - min));
        }
    }
}
