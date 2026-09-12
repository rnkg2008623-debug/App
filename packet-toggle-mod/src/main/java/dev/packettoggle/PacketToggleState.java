package dev.packettoggle;

import net.minecraft.client.network.ClientCommonNetworkHandler;
import net.minecraft.network.packet.Packet;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 自作サーバーとの通信テスト用の共有状態。
 * クライアント→サーバーへ送るパケットを「停止」または「遅延」させるためのトグル状態と、
 * 遅延中のパケットを保持するキューを管理する。
 */
public final class PacketToggleState {

	public enum Mode {
		NORMAL,
		STOP,
		DELAY
	}

	private static volatile Mode mode = Mode.NORMAL;
	private static volatile long delayMillis = 500L;

	private static final long MIN_DELAY_MILLIS = 0L;
	private static final long MAX_DELAY_MILLIS = 60_000L;
	private static final long DELAY_STEP_MILLIS = 100L;

	// 遅延キューから再送する際、Mixin側の割り込みを回避するためのフラグ。
	private static final ThreadLocal<Boolean> BYPASS = ThreadLocal.withInitial(() -> Boolean.FALSE);

	private static final Queue<DelayedPacket> QUEUE = new ConcurrentLinkedQueue<>();

	private record DelayedPacket(ClientCommonNetworkHandler handler, Packet<?> packet, long sendAtMillis) {
	}

	private PacketToggleState() {
	}

	public static Mode getMode() {
		return mode;
	}

	public static Mode cycleStop() {
		mode = (mode == Mode.STOP) ? Mode.NORMAL : Mode.STOP;
		return mode;
	}

	public static Mode cycleDelay() {
		mode = (mode == Mode.DELAY) ? Mode.NORMAL : Mode.DELAY;
		return mode;
	}

	public static long getDelayMillis() {
		return delayMillis;
	}

	public static void adjustDelay(long deltaMillis) {
		long next = delayMillis + deltaMillis;
		if (next < MIN_DELAY_MILLIS) {
			next = MIN_DELAY_MILLIS;
		}
		if (next > MAX_DELAY_MILLIS) {
			next = MAX_DELAY_MILLIS;
		}
		delayMillis = next;
	}

	public static long getDelayStepMillis() {
		return DELAY_STEP_MILLIS;
	}

	public static boolean isBypassed() {
		return BYPASS.get();
	}

	public static void enqueueDelayed(ClientCommonNetworkHandler handler, Packet<?> packet) {
		QUEUE.add(new DelayedPacket(handler, packet, System.currentTimeMillis() + delayMillis));
	}

	public static int queuedCount() {
		return QUEUE.size();
	}

	/**
	 * 毎クライアントTickから呼び出し、送信予定時刻を過ぎたパケットを実際に送信する。
	 * キューはFIFOのため、途中で遅延時間を変更した場合は多少の順序前後が起こり得るが、
	 * 通信テスト用ツールとしては許容する。
	 */
	public static void flushDue() {
		if (QUEUE.isEmpty()) {
			return;
		}
		long now = System.currentTimeMillis();
		DelayedPacket dp;
		while ((dp = QUEUE.peek()) != null && dp.sendAtMillis() <= now) {
			QUEUE.poll();
			resend(dp);
		}
	}

	/** キュー内の全パケットを今すぐ送信する。戻り値は送信した件数。 */
	public static int flushAllNow() {
		int count = 0;
		DelayedPacket dp;
		while ((dp = QUEUE.poll()) != null) {
			resend(dp);
			count++;
		}
		return count;
	}

	private static void resend(DelayedPacket dp) {
		BYPASS.set(Boolean.TRUE);
		try {
			dp.handler().sendPacket(dp.packet());
		} finally {
			BYPASS.set(Boolean.FALSE);
		}
	}
}
