package io.github.rnkg2008623.mccustomclient;

/**
 * 自分のプレイヤーの速度(velocity)倍率を保持する状態クラス。
 * SpeedController が「入力の強さ」を変えるのに対し、こちらはジャンプ・落下・
 * ノックバックなど、実際の速度ベクトルそのものに毎tick掛かる倍率。
 */
public final class VelocityController {

    public static final float MIN_MULTIPLIER = 0.5f;
    public static final float MAX_MULTIPLIER = 2.5f;
    private static final float DEFAULT_MULTIPLIER = 1.0f;

    private static float multiplier = DEFAULT_MULTIPLIER;

    private VelocityController() {
    }

    public static float getMultiplier() {
        return multiplier;
    }

    public static void set(float value) {
        multiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, value));
    }

    public static void reset() {
        multiplier = DEFAULT_MULTIPLIER;
    }
}
