package io.github.rnkg2008623.mccustomclient;

/**
 * 自分の水平方向の「加速度」の倍率を保持する状態クラス。
 *
 * SpeedController が目標の速さ（入力の強さ）を変えるのに対し、こちらは
 * 「その速さに到達するまでの速度の変化のしやすさ」を変える。
 * 1.0がバニラ標準、大きいほど加速・方向転換ともに素早く(キビキビ)なり、
 * 小さいほど氷の上のように滑って曲がりにくくなる。
 * ジャンプ・落下（上下方向）には一切影響しない。
 */
public final class VelocityController {

    public static final float MIN_MULTIPLIER = 0.1f;
    public static final float MAX_MULTIPLIER = 3.0f;
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
