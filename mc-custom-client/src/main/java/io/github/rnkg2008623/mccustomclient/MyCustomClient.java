package io.github.rnkg2008623.mccustomclient;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import io.github.rnkg2008623.mccustomclient.gui.SpeedMenuScreen;
import io.github.rnkg2008623.mccustomclient.hud.MinimapRenderer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import net.minecraft.util.math.Vec3d;
import org.lwjgl.glfw.GLFW;

/**
 * クライアント専用MODのエントリーポイント。
 * 「自分の移動速度／Velocityを変更する」機能・フリーカム(Mキーで設定メニュー、
 * Vキーでフリーカム切り替え)と、右上のミニマップ表示機能を持つ。
 */
public class MyCustomClient implements ClientModInitializer {

    public static final String MOD_ID = "mc_custom_client";

    private static final double FREECAM_SPEED_NORMAL = 0.5;
    private static final double FREECAM_SPEED_FAST = 1.5;

    private final MinimapRenderer minimap = new MinimapRenderer();

    private KeyBinding openMenuKey;
    private KeyBinding toggleFreecamKey;
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

        toggleFreecamKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.mc_custom_client.toggle_freecam",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_V,
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
        ClientTickEvents.END_CLIENT_TICK.register(this::updateFreecamMovement);
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

        while (toggleFreecamKey.wasPressed()) {
            toggleFreecam(client);
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

    public static void toggleFreecam(MinecraftClient client) {
        if (client.player == null) {
            return;
        }

        boolean newState = !FreecamController.isEnabled();
        if (newState) {
            FreecamController.resetTo(
                    client.player.getCameraPosVec(1.0f),
                    client.player.getYaw(),
                    client.player.getPitch()
            );
        }
        FreecamController.setEnabled(newState);
        client.player.sendMessage(Text.literal("フリーカム: " + (newState ? "ON" : "OFF")), true);
    }

    private void updateFreecamMovement(MinecraftClient client) {
        if (!FreecamController.isEnabled() || client.player == null) {
            return;
        }

        GameOptions options = client.options;
        double speed = options.sprintKey.isPressed() ? FREECAM_SPEED_FAST : FREECAM_SPEED_NORMAL;

        double yawRad = Math.toRadians(FreecamController.getYaw());
        double pitchRad = Math.toRadians(FreecamController.getPitch());

        double forwardX = -Math.sin(yawRad) * Math.cos(pitchRad);
        double forwardY = -Math.sin(pitchRad);
        double forwardZ = Math.cos(yawRad) * Math.cos(pitchRad);

        double rightX = -Math.cos(yawRad);
        double rightZ = -Math.sin(yawRad);

        double dx = 0;
        double dy = 0;
        double dz = 0;

        if (options.forwardKey.isPressed()) {
            dx += forwardX;
            dy += forwardY;
            dz += forwardZ;
        }
        if (options.backKey.isPressed()) {
            dx -= forwardX;
            dy -= forwardY;
            dz -= forwardZ;
        }
        if (options.rightKey.isPressed()) {
            dx += rightX;
            dz += rightZ;
        }
        if (options.leftKey.isPressed()) {
            dx -= rightX;
            dz -= rightZ;
        }
        if (options.jumpKey.isPressed()) {
            dy += 1;
        }
        if (options.sneakKey.isPressed()) {
            dy -= 1;
        }

        double length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length > 0.0001) {
            Vec3d delta = new Vec3d(dx / length * speed, dy / length * speed, dz / length * speed);
            FreecamController.setPosition(FreecamController.getPosition().add(delta));
        }
    }
}
