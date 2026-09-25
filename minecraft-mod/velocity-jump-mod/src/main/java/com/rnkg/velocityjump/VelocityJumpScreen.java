package com.rnkg.velocityjump;

import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.layouts.HeaderAndFooterLayout;
import net.minecraft.client.gui.layouts.LinearLayout;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.CommonComponents;
import net.minecraft.network.chat.Component;

/** O キーで開く設定メニュー。 */
public class VelocityJumpScreen extends Screen {
	private static final int WIDGET_WIDTH = 240;

	private HeaderAndFooterLayout layout;

	public VelocityJumpScreen() {
		super(Component.literal("Velocity & Jump 設定"));
	}

	@Override
	protected void init() {
		this.layout = new HeaderAndFooterLayout(this);
		this.layout.addTitleHeader(this.title, this.font);

		LinearLayout body = LinearLayout.vertical().spacing(4);

		// 飛行
		body.addChild(toggleButton("飛行", () -> VelocityJumpConfig.flightEnabled,
				value -> VelocityJumpConfig.flightEnabled = value));
		body.addChild(new ValueSlider(WIDGET_WIDTH, "飛行速度", 0.5, 10.0, 0.5, VelocityJumpConfig.flySpeed,
				value -> "×" + formatShort(value), value -> VelocityJumpConfig.flySpeed = value));

		// ジャンプ
		body.addChild(toggleButton("ジャンプ高さ変更", () -> VelocityJumpConfig.jumpEnabled,
				value -> VelocityJumpConfig.jumpEnabled = value));
		body.addChild(new ValueSlider(WIDGET_WIDTH, "ジャンプの高さ", 0.5, 30.0, 0.5, VelocityJumpConfig.jumpHeight,
				value -> formatShort(value) + " ブロック", value -> VelocityJumpConfig.jumpHeight = value));

		// velocity (キー操作)
		body.addChild(new ValueSlider(WIDGET_WIDTH, "ダッシュの強さ (Vキー)", 0.0, 5.0, 0.1, VelocityJumpConfig.dashPower,
				VelocityJumpScreen::formatShort, value -> VelocityJumpConfig.dashPower = value));
		body.addChild(new ValueSlider(WIDGET_WIDTH, "打ち上げの強さ (Gキー)", 0.0, 5.0, 0.1, VelocityJumpConfig.launchPower,
				VelocityJumpScreen::formatShort, value -> VelocityJumpConfig.launchPower = value));

		this.layout.addToContents(body);
		this.layout.addToFooter(Button.builder(CommonComponents.GUI_DONE, button -> this.onClose()).width(200).build());
		this.layout.visitWidgets(this::addRenderableWidget);
		this.repositionElements();
	}

	@Override
	protected void repositionElements() {
		this.layout.arrangeElements();
	}

	@Override
	public void removed() {
		VelocityJumpConfig.save();
		super.removed();
	}

	private static Button toggleButton(String label, BooleanSupplier getter, Consumer<Boolean> setter) {
		return Button.builder(toggleText(label, getter.getAsBoolean()), button -> {
			boolean value = !getter.getAsBoolean();
			setter.accept(value);
			button.setMessage(toggleText(label, value));
		}).width(WIDGET_WIDTH).build();
	}

	private static Component toggleText(String label, boolean value) {
		return Component.literal(label + ": " + (value ? "§aON" : "§cOFF"));
	}

	private static String formatShort(double value) {
		return String.format("%.1f", value);
	}
}
