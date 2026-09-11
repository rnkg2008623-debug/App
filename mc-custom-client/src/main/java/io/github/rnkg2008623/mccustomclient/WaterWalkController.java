package io.github.rnkg2008623.mccustomclient;

/**
 * 水上歩行(水に沈まず水面を歩ける)のON/OFF状態を保持する状態クラス。
 */
public final class WaterWalkController {

    private static boolean enabled = false;

    private WaterWalkController() {
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
