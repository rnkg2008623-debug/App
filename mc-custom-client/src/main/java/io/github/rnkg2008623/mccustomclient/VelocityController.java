package io.github.rnkg2008623.mccustomclient;

/**
 * 被弾・爆発などで「受けるノックバック」の強さの倍率を保持する状態クラス。
 *
 * 自分のジャンプ・落下・移動速度には一切影響しない（それぞれ JumpController /
 * SpeedController が別に担当する）。0にするとノックバックを完全に無効化できる。
 */
public final class VelocityController {

    public static final float MIN_MULTIPLIER = 0.0f;
    public static final float MAX_MULTIPLIER = 2.0f;
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
