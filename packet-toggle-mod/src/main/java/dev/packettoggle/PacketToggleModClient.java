package dev.packettoggle;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.render.RenderTickCounter;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import org.lwjgl.glfw.GLFW;

/**
 * 自作サーバーとの通信テスト用クライアントMOD本体。
 * デフォルトではキーは未割り当てのため、ゲーム内の「コントロール」設定から
 * 「パケットトグルMOD」カテゴリのキーを割り当てて使用する。
 */
public final class PacketToggleModClient implements ClientModInitializer {

	private static final String CATEGORY = "key.categories.packettoggle";

	private static KeyBinding toggleStopKey;
	private static KeyBinding toggleDelayKey;
	private static KeyBinding increaseDelayKey;
	private static KeyBinding decreaseDelayKey;
	private static KeyBinding flushQueueKey;

	@Override
	public void onInitializeClient() {
		toggleStopKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
				"key.packettoggle.toggle_stop", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));
		toggleDelayKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
				"key.packettoggle.toggle_delay", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));
		increaseDelayKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
				"key.packettoggle.increase_delay", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));
		decreaseDelayKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
				"key.packettoggle.decrease_delay", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));
		flushQueueKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
				"key.packettoggle.flush_queue", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));

		ClientTickEvents.END_CLIENT_TICK.register(PacketToggleModClient::onClientTick);
		HudRenderCallback.EVENT.register(PacketToggleModClient::onHudRender);
	}

	private static void onClientTick(MinecraftClient client) {
		PacketToggleState.flushDue();

		while (toggleStopKey.wasPressed()) {
			announceMode(client, PacketToggleState.cycleStop());
		}
		while (toggleDelayKey.wasPressed()) {
			announceMode(client, PacketToggleState.cycleDelay());
		}
		while (increaseDelayKey.wasPressed()) {
			PacketToggleState.adjustDelay(PacketToggleState.getDelayStepMillis());
			announceDelay(client);
		}
		while (decreaseDelayKey.wasPressed()) {
			PacketToggleState.adjustDelay(-PacketToggleState.getDelayStepMillis());
			announceDelay(client);
		}
		while (flushQueueKey.wasPressed()) {
			int flushed = PacketToggleState.flushAllNow();
			if (client.player != null) {
				client.player.sendMessage(
						Text.literal("[PacketToggle] " + flushed + " 件のパケットを即時送信しました")
								.formatted(Formatting.YELLOW),
						false);
			}
		}
	}

	private static void announceMode(MinecraftClient client, PacketToggleState.Mode mode) {
		if (client.player == null) {
			return;
		}
		Text text = switch (mode) {
			case STOP -> Text.literal("[PacketToggle] 送信停止 ON").formatted(Formatting.RED);
			case DELAY -> Text.literal("[PacketToggle] 送信遅延 ON (" + PacketToggleState.getDelayMillis() + "ms)")
					.formatted(Formatting.GOLD);
			case NORMAL -> Text.literal("[PacketToggle] 通常送信に復帰").formatted(Formatting.GREEN);
		};
		client.player.sendMessage(text, false);
	}

	private static void announceDelay(MinecraftClient client) {
		if (client.player == null) {
			return;
		}
		client.player.sendMessage(
				Text.literal("[PacketToggle] 遅延: " + PacketToggleState.getDelayMillis() + "ms")
						.formatted(Formatting.AQUA),
				false);
	}

	private static void onHudRender(DrawContext context, RenderTickCounter tickCounter) {
		MinecraftClient client = MinecraftClient.getInstance();
		if (client.player == null) {
			return;
		}
		PacketToggleState.Mode mode = PacketToggleState.getMode();
		int queued = PacketToggleState.queuedCount();
		if (mode == PacketToggleState.Mode.NORMAL && queued == 0) {
			return;
		}

		String text = switch (mode) {
			case STOP -> "PacketToggle: STOP";
			case DELAY -> "PacketToggle: DELAY " + PacketToggleState.getDelayMillis() + "ms (queue=" + queued + ")";
			case NORMAL -> "PacketToggle: queue=" + queued;
		};
		int color = switch (mode) {
			case STOP -> 0xFFFF5555;
			case DELAY -> 0xFFFFFF55;
			case NORMAL -> 0xFF55FF55;
		};
		context.drawTextWithShadow(client.textRenderer, text, 6, 6, color);
	}
}
