package io.github.rnkg2008623.mccustomclient;

/**
 * 自分のジャンプの高さの倍率を保持する状態クラス。
 * 落下速度・移動速度には影響しない。
 */
public final class JumpController {

    public static final float MIN_MULTIPLIER = 0.5f;
    public static final float MAX_MULTIPLIER = 3.0f;
    private static final float DEFAULT_MULTIPLIER = 1.0f;

    private static float multiplier = DEFAULT_MULTIPLIER;

    private JumpController() {
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
