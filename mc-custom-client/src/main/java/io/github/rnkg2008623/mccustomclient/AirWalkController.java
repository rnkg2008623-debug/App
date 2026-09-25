package io.github.rnkg2008623.mccustomclient;

/**
 * 空中歩行(何もない空中でも落下せず、その場に立てる)のON/OFF状態を保持する状態クラス。
 */
public final class AirWalkController {

    private static boolean enabled = false;

    private AirWalkController() {
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
