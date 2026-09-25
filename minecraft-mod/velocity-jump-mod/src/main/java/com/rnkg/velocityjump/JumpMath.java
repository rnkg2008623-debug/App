package com.rnkg.velocityjump;

/**
 * ジャンプの「初速」と「到達高さ(ブロック)」を相互変換する。
 *
 * <p>バニラの縦方向の物理は 1 tick ごとに
 * <pre>
 *   y  += vy
 *   vy  = (vy - gravity) * 0.98
 * </pre>
 * で計算される。これをシミュレーションして高さを求め、
 * 逆方向は二分探索で初速を求める。
 * (デフォルト: 初速 0.42 / 重力 0.08 → 約 1.25 ブロック)
 */
public final class JumpMath {
	private static final double DRAG = 0.98;
	private static final int MAX_TICKS = 2000;

	private JumpMath() {
	}

	/** 初速 {@code velocity} で跳んだときの最高到達高さ(ブロック)。 */
	public static double heightForVelocity(double velocity, double gravity) {
		double y = 0.0;
		double vy = velocity;
		double max = 0.0;

		for (int i = 0; i < MAX_TICKS && vy > 0.0; i++) {
			y += vy;
			max = Math.max(max, y);
			vy = (vy - gravity) * DRAG;
		}

		return max;
	}

	/** 最高到達高さ {@code height} ブロックに届くために必要な初速。 */
	public static double velocityForHeight(double height, double gravity) {
		if (height <= 0.0) {
			return 0.0;
		}

		double lo = 0.0;
		double hi = 1.0;

		while (heightForVelocity(hi, gravity) < height && hi < 1.0e4) {
			hi *= 2.0;
		}

		for (int i = 0; i < 64; i++) {
			double mid = (lo + hi) / 2.0;

			if (heightForVelocity(mid, gravity) < height) {
				lo = mid;
			} else {
				hi = mid;
			}
		}

		return hi;
	}
}
