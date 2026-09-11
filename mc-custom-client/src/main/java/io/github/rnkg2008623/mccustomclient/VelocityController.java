package io.github.rnkg2008623.mccustomclient;

/**
 * 自分の水平速度(velocity)倍率を保持する状態クラス。
 *
 * 実際の速度ベクトルのX/Z成分に毎tick掛かる倍率で、移動を続けるほど速度が
 * 積み上がっていく（走るほど加速していく）感覚になる。上下方向(Y)には
 * 一切影響しないため、ジャンプ・落下は常にバニラ（またはJumpController）の
 * ままになる。
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
