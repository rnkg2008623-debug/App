package io.github.rnkg2008623.mccustomclient;

/**
 * 自分のプレイヤーの移動速度倍率を保持するだけの単純な状態クラス。
 * キーバインド／設定メニューのスライダーから変更され、Mixin側から読み取られる。
 */
public final class SpeedController {

    public static final float MIN_MULTIPLIER = 0.25f;
    public static final float MAX_MULTIPLIER = 3.0f;
    private static final float STEP = 0.25f;
    private static final float DEFAULT_MULTIPLIER = 1.0f;

    private static float multiplier = DEFAULT_MULTIPLIER;

    private SpeedController() {
    }

    public static float getMultiplier() {
        return multiplier;
    }

    public static void set(float value) {
        multiplier = clamp(value);
    }

    public static void increase() {
        multiplier = clamp(round(multiplier + STEP));
    }

    public static void decrease() {
        multiplier = clamp(round(multiplier - STEP));
    }

    public static void reset() {
        multiplier = DEFAULT_MULTIPLIER;
    }

    private static float clamp(float value) {
        return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, value));
    }

    private static float round(float value) {
        return Math.round(value * 100f) / 100f;
    }
}
