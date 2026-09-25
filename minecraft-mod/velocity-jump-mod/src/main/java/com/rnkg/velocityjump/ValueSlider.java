package com.rnkg.velocityjump;

import java.util.function.DoubleConsumer;
import java.util.function.DoubleFunction;

import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.network.chat.Component;

/** min〜max の値を step 刻みで調整するスライドバー。 */
public class ValueSlider extends AbstractSliderButton {
	private final String label;
	private final double min;
	private final double max;
	private final double step;
	private final DoubleFunction<String> formatter;
	private final DoubleConsumer onChange;

	public ValueSlider(int width, String label, double min, double max, double step, double initial,
			DoubleFunction<String> formatter, DoubleConsumer onChange) {
		super(0, 0, width, 20, Component.empty(), (clamp(initial, min, max) - min) / (max - min));
		this.label = label;
		this.min = min;
		this.max = max;
		this.step = step;
		this.formatter = formatter;
		this.onChange = onChange;
		this.updateMessage();
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	/** スライダーの位置 (0〜1) を実際の値に変換する。 */
	public double getRealValue() {
		double raw = this.min + (this.max - this.min) * this.value;
		return clamp(Math.round(raw / this.step) * this.step, this.min, this.max);
	}

	@Override
	protected void updateMessage() {
		this.setMessage(Component.literal(this.label + ": " + this.formatter.apply(this.getRealValue())));
	}

	@Override
	protected void applyValue() {
		this.onChange.accept(this.getRealValue());
	}
}
