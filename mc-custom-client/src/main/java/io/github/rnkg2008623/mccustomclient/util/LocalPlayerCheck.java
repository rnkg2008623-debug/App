package io.github.rnkg2008623.mccustomclient.util;

import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;

import java.util.UUID;

/**
 * 与えられたEntityが「自分自身のプレイヤー」かどうかを判定する共通ヘルパー。
 *
 * UUIDで比較しているのは、シングルプレイでは統合サーバー側のServerPlayerと
 * クライアント側のLocalPlayerが別オブジェクトになるため、参照(==)比較では
 * どちらか一方にしか効かないため。
 *
 * Mixinが管理する専用パッケージ(mixins.jsonのpackage)の外に置く必要がある。
 * mixinパッケージ内のクラスはMixin変換の対象としてのみ扱われ、変換後の
 * ターゲットクラス(LivingEntity等)から通常のクラスとして参照すると
 * IllegalClassLoadErrorになるため。
 */
public final class LocalPlayerCheck {

    private LocalPlayerCheck() {
    }

    public static boolean isLocalPlayer(Entity entity) {
        if (!(entity instanceof Player player)) {
            return false;
        }

        UUID localPlayerUuid = Minecraft.getInstance().getUser() == null
                ? null
                : Minecraft.getInstance().getUser().getProfileId();
        return localPlayerUuid != null && localPlayerUuid.equals(player.getUUID());
    }
}
