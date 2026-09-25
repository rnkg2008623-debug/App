package io.github.rnkg2008623.mccustomclient.mixin;

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
 */
final class LocalPlayerCheck {

    private LocalPlayerCheck() {
    }

    static boolean isLocalPlayer(Entity entity) {
        if (!(entity instanceof Player player)) {
            return false;
        }

        UUID localPlayerUuid = Minecraft.getInstance().getUser() == null
                ? null
                : Minecraft.getInstance().getUser().getProfileId();
        return localPlayerUuid != null && localPlayerUuid.equals(player.getUUID());
    }
}
