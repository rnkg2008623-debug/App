package io.github.rnkg2008623.mccustomclient.mixin;

import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.PlayerEntity;

import java.util.UUID;

/**
 * 与えられたEntityが「自分自身のプレイヤー」かどうかを判定する共通ヘルパー。
 *
 * UUIDで比較しているのは、シングルプレイでは統合サーバー側のServerPlayerEntityと
 * クライアント側のClientPlayerEntityが別オブジェクトになるため、参照(==)比較では
 * どちらか一方にしか効かないため。
 */
final class LocalPlayerCheck {

    private LocalPlayerCheck() {
    }

    static boolean isLocalPlayer(Entity entity) {
        if (!(entity instanceof PlayerEntity player)) {
            return false;
        }

        UUID localPlayerUuid = MinecraftClient.getInstance().getSession() == null
                ? null
                : MinecraftClient.getInstance().getSession().getUuidOrNull();
        return localPlayerUuid != null && localPlayerUuid.equals(player.getUuid());
    }
}
