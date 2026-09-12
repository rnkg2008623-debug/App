package io.github.rnkg2008623.mccustomclient;

import net.minecraft.util.math.Vec3d;

/**
 * フリーカム(自分のキャラクターは動かさず、カメラだけを自由に動かせる機能)の
 * ON/OFF状態と、仮想カメラの位置・向きを保持する状態クラス。
 *
 * ネットワークには一切関与しない。実際のプレイヤーの位置・回転は変更せず、
 * 描画用のカメラだけをこの位置・向きに差し替える。
 */
public final class FreecamController {

    private static boolean enabled = false;
    private static Vec3d position = Vec3d.ZERO;
    private static float yaw = 0f;
    private static float pitch = 0f;

    private FreecamController() {
    }

    public static boolean isEnabled() {
        return enabled;
    }

    public static void setEnabled(boolean value) {
        enabled = value;
    }

    public static Vec3d getPosition() {
        return position;
    }

    public static void setPosition(Vec3d value) {
        position = value;
    }

    public static float getYaw() {
        return yaw;
    }

    public static float getPitch() {
        return pitch;
    }

    public static void setRotation(float newYaw, float newPitch) {
        yaw = newYaw % 360f;
        pitch = Math.max(-90f, Math.min(90f, newPitch));
    }

    /** フリーカムを有効にする瞬間、実際のプレイヤーの視点をカメラの初期値としてコピーする。 */
    public static void resetTo(Vec3d pos, float initialYaw, float initialPitch) {
        position = pos;
        yaw = initialYaw;
        pitch = initialPitch;
    }
}
