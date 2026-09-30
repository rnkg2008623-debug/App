package io.github.rnkg2008623.mccustomclient;

/**
 * ダメージ無効化(自分がダメージを受けなくなる)のON/OFF状態を保持する状態クラス。
 *
 * シングルプレイでのみ有効。統合サーバーはクライアントと同じプロセス内で
 * 動作しているため、サーバー側のダメージ計算(LivingEntity#hurtServer)を
 * そのままキャンセルできる。マルチプレイの場合はダメージ計算が相手サーバーの
 * プロセスで行われるため、このMODだけでは無効化できない。
 */
public final class NoDamageController {

    private static boolean enabled = false;

    private NoDamageController() {
    }

    public static boolean isEnabled() {
        return enabled;
    }

    public static void setEnabled(boolean value) {
        enabled = value;
    }

    public static void toggle() {
        enabled = !enabled;
    }

    public static void reset() {
        enabled = false;
    }
}
