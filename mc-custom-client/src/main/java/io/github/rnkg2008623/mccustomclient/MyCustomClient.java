package io.github.rnkg2008623.mccustomclient;

import com.mojang.blaze3d.platform.InputConstants;
import org.lwjgl.glfw.GLFW;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import io.github.rnkg2008623.mccustomclient.gui.SpeedMenuScreen;
import io.github.rnkg2008623.mccustomclient.hud.MinimapRenderer;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Options;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.phys.Vec3;

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

    private KeyMapping openMenuKey;
    private KeyMapping toggleFreecamKey;
    private KeyMapping increaseSpeedKey;
    private KeyMapping decreaseSpeedKey;
    private KeyMapping resetSpeedKey;

    @Override
    public void onInitializeClient() {
        KeyMapping.Category category = KeyMapping.Category.register(
                Identifier.fromNamespaceAndPath(MOD_ID, "general")
        );

        openMenuKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.mc_custom_client.open_menu",
                InputConstants.Type.KEYBOARD,
                InputConstants.KEY_M,
                category
        ));

        toggleFreecamKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.mc_custom_client.toggle_freecam",
                InputConstants.Type.KEYBOARD,
                InputConstants.KEY_V,
                category
        ));

        // テンキーが無い環境(MacBook等)向けの互換キー。設定画面からも同じ操作ができる。
        increaseSpeedKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.mc_custom_client.increase_speed",
                InputConstants.Type.KEYBOARD,
                InputConstants.KEY_ADD,
                category
        ));

        decreaseSpeedKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.mc_custom_client.decrease_speed",
                InputConstants.Type.KEYBOARD,
                GLFW.GLFW_KEY_KP_SUBTRACT,
                category
        ));

        resetSpeedKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.mc_custom_client.reset_speed",
                InputConstants.Type.KEYBOARD,
                InputConstants.KEY_NUMPAD0,
                category
        ));

        ClientTickEvents.END_CLIENT_TICK.register(this::onClientTick);
        ClientTickEvents.END_CLIENT_TICK.register(this::updateFreecamMovement);
        ClientTickEvents.END_CLIENT_TICK.register(minimap::onEndTick);

        HudElementRegistry.addLast(
                Identifier.fromNamespaceAndPath(MOD_ID, "minimap"),
                minimap
        );
    }

    private void onClientTick(Minecraft client) {
        if (client.player == null) {
            return;
        }

        while (openMenuKey.consumeClick()) {
            if (client.gui.screen() == null) {
                client.gui.setScreen(new SpeedMenuScreen());
            }
        }

        while (toggleFreecamKey.consumeClick()) {
            toggleFreecam(client);
        }

        boolean changed = false;

        while (increaseSpeedKey.consumeClick()) {
            SpeedController.increase();
            changed = true;
        }
        while (decreaseSpeedKey.consumeClick()) {
            SpeedController.decrease();
            changed = true;
        }
        while (resetSpeedKey.consumeClick()) {
            SpeedController.reset();
            changed = true;
        }

        if (changed) {
            client.gui.hud.setOverlayMessage(
                    Component.literal(String.format("移動速度倍率: x%.2f", SpeedController.getMultiplier())),
                    false
            );
        }
    }

    public static void toggleFreecam(Minecraft client) {
        if (client.player == null) {
            return;
        }

        boolean newState = !FreecamController.isEnabled();
        if (newState) {
            FreecamController.resetTo(
                    client.player.getEyePosition(1.0f),
                    client.player.getYRot(),
                    client.player.getXRot()
            );
        }
        FreecamController.setEnabled(newState);
        client.gui.hud.setOverlayMessage(Component.literal("フリーカム: " + (newState ? "ON" : "OFF")), false);
    }

    private void updateFreecamMovement(Minecraft client) {
        if (!FreecamController.isEnabled() || client.player == null) {
            return;
        }

        Options options = client.options;
        double speed = options.keySprint.isDown() ? FREECAM_SPEED_FAST : FREECAM_SPEED_NORMAL;

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

        if (options.keyUp.isDown()) {
            dx += forwardX;
            dy += forwardY;
            dz += forwardZ;
        }
        if (options.keyDown.isDown()) {
            dx -= forwardX;
            dy -= forwardY;
            dz -= forwardZ;
        }
        if (options.keyRight.isDown()) {
            dx += rightX;
            dz += rightZ;
        }
        if (options.keyLeft.isDown()) {
            dx -= rightX;
            dz -= rightZ;
        }
        if (options.keyJump.isDown()) {
            dy += 1;
        }
        if (options.keyShift.isDown()) {
            dy -= 1;
        }

        double length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length > 0.0001) {
            Vec3 delta = new Vec3(dx / length * speed, dy / length * speed, dz / length * speed);
            FreecamController.setPosition(FreecamController.getPosition().add(delta));
        }
    }
}
