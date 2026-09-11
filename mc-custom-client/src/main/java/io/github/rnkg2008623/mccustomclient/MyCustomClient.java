package io.github.rnkg2008623.mccustomclient;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import io.github.rnkg2008623.mccustomclient.hud.MinimapRenderer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

/**
 * クライアント専用MODのエントリーポイント。
 * 「自分の移動速度を変更する」機能と、右上のミニマップ表示機能を持つ。
 */
public class MyCustomClient implements ClientModInitializer {

    public static final String MOD_ID = "mc_custom_client";

    private final MinimapRenderer minimap = new MinimapRenderer();

    private KeyBinding increaseSpeedKey;
    private KeyBinding decreaseSpeedKey;
    private KeyBinding resetSpeedKey;

    @Override
    public void onInitializeClient() {
        increaseSpeedKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.mc_custom_client.increase_speed",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_KP_ADD,
                "category.mc_custom_client.general"
        ));

        decreaseSpeedKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.mc_custom_client.decrease_speed",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_KP_SUBTRACT,
                "category.mc_custom_client.general"
        ));

        resetSpeedKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.mc_custom_client.reset_speed",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_KP_0,
                "category.mc_custom_client.general"
        ));

        ClientTickEvents.END_CLIENT_TICK.register(this::onClientTick);
        ClientTickEvents.END_CLIENT_TICK.register(minimap::onEndTick);
        HudRenderCallback.EVENT.register(minimap::render);
    }

    private void onClientTick(MinecraftClient client) {
        if (client.player == null) {
            return;
        }

        boolean changed = false;

        while (increaseSpeedKey.wasPressed()) {
            SpeedController.increase();
            changed = true;
        }
        while (decreaseSpeedKey.wasPressed()) {
            SpeedController.decrease();
            changed = true;
        }
        while (resetSpeedKey.wasPressed()) {
            SpeedController.reset();
            changed = true;
        }

        if (changed) {
            client.player.sendMessage(
                    Text.literal(String.format("移動速度倍率: x%.2f", SpeedController.getMultiplier())),
                    true
            );
        }
    }
}
