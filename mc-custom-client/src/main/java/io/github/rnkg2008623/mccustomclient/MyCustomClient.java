package io.github.rnkg2008623.mccustomclient;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import io.github.rnkg2008623.mccustomclient.gui.SpeedMenuScreen;
import io.github.rnkg2008623.mccustomclient.hud.MinimapRenderer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

/**
 * クライアント専用MODのエントリーポイント。
 * 「自分の移動速度／Velocityを変更する」機能(Mキーで設定メニュー)と、
 * 右上のミニマップ表示機能を持つ。
 */
public class MyCustomClient implements ClientModInitializer {

    public static final String MOD_ID = "mc_custom_client";

    private final MinimapRenderer minimap = new MinimapRenderer();

    private KeyBinding openMenuKey;
    private KeyBinding increaseSpeedKey;
    private KeyBinding decreaseSpeedKey;
    private KeyBinding resetSpeedKey;

    @Override
    public void onInitializeClient() {
        openMenuKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.mc_custom_client.open_menu",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_M,
                "category.mc_custom_client.general"
        ));

        // テンキーが無い環境(MacBook等)向けの互換キー。設定画面からも同じ操作ができる。
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

        while (openMenuKey.wasPressed()) {
            if (client.currentScreen == null) {
                client.setScreen(new SpeedMenuScreen());
            }
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
