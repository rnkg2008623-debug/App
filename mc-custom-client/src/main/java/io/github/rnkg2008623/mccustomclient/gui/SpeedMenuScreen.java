package io.github.rnkg2008623.mccustomclient.gui;

import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.SliderWidget;
import net.minecraft.text.Text;

/**
 * Mキーで開く、MCカスタムクライアントの設定メニュー。
 * 移動速度(SpeedController)とVelocity(VelocityController)をスライダーで調整できる。
 */
public class SpeedMenuScreen extends Screen {

    private static final int WIDGET_WIDTH = 240;
    private static final int WIDGET_HEIGHT = 20;
    private static final int SPACING = 8;

    public SpeedMenuScreen() {
        super(Text.literal("MCカスタムクライアント設定"));
    }

    @Override
    protected void init() {
        int centerX = this.width / 2;
        int y = this.height / 2 - 50;

        this.addDrawableChild(new SpeedSlider(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT));
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(new VelocitySlider(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT));
        y += WIDGET_HEIGHT + SPACING * 2;

        this.addDrawableChild(ButtonWidget.builder(Text.literal("リセット"), button -> {
                    SpeedController.reset();
                    VelocityController.reset();
                    this.clearAndInit();
                })
                .dimensions(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
        y += WIDGET_HEIGHT + SPACING;

        this.addDrawableChild(ButtonWidget.builder(Text.literal("閉じる"), button -> this.close())
                .dimensions(centerX - WIDGET_WIDTH / 2, y, WIDGET_WIDTH, WIDGET_HEIGHT)
                .build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        this.renderBackground(context, mouseX, mouseY, delta);
        super.render(context, mouseX, mouseY, delta);
        context.drawCenteredTextWithShadow(
                this.textRenderer, this.title, this.width / 2, this.height / 2 - 75, 0xFFFFFF
        );
    }

    @Override
    public boolean shouldPause() {
        // ワールドを一時停止させず、スライダーの効果をその場で確認できるようにする
        return false;
    }

    private static final class SpeedSlider extends SliderWidget {
        SpeedSlider(int x, int y, int width, int height) {
            super(x, y, width, height, Text.empty(), toNormalized(SpeedController.getMultiplier()));
            this.updateMessage();
        }

        private static double toNormalized(float value) {
            float range = SpeedController.MAX_MULTIPLIER - SpeedController.MIN_MULTIPLIER;
            return (value - SpeedController.MIN_MULTIPLIER) / range;
        }

        @Override
        protected void updateMessage() {
            this.setMessage(Text.literal(String.format("移動速度: x%.2f", SpeedController.getMultiplier())));
        }

        @Override
        protected void applyValue() {
            float range = SpeedController.MAX_MULTIPLIER - SpeedController.MIN_MULTIPLIER;
            SpeedController.set(SpeedController.MIN_MULTIPLIER + (float) this.value * range);
        }
    }

    private static final class VelocitySlider extends SliderWidget {
        VelocitySlider(int x, int y, int width, int height) {
            super(x, y, width, height, Text.empty(), toNormalized(VelocityController.getMultiplier()));
            this.updateMessage();
        }

        private static double toNormalized(float value) {
            float range = VelocityController.MAX_MULTIPLIER - VelocityController.MIN_MULTIPLIER;
            return (value - VelocityController.MIN_MULTIPLIER) / range;
        }

        @Override
        protected void updateMessage() {
            this.setMessage(Text.literal(String.format("Velocity(上下): x%.2f", VelocityController.getMultiplier())));
        }

        @Override
        protected void applyValue() {
            float range = VelocityController.MAX_MULTIPLIER - VelocityController.MIN_MULTIPLIER;
            VelocityController.set(VelocityController.MIN_MULTIPLIER + (float) this.value * range);
        }
    }
}
