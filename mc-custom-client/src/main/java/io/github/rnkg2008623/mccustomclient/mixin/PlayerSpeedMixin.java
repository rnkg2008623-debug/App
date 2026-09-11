package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.SpeedController;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Vec3d;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

import java.util.UUID;

/**
 * LivingEntity#travel に渡される移動入力ベクトルを、自分のプレイヤーに限り
 * SpeedController の倍率でスケールする。
 *
 * UUID で「自分自身か」を判定しているのは、シングルプレイでは統合サーバー側の
 * ServerPlayerEntity とクライアント側の ClientPlayerEntity が別オブジェクトに
 * なるため、参照(==)比較ではどちらか一方にしか効かず、サーバー側の補正で
 * 押し戻される(rubber-banding)のを避けるため。
 */
@Mixin(LivingEntity.class)
public abstract class PlayerSpeedMixin {

    @ModifyVariable(method = "travel", at = @At("HEAD"), argsOnly = true)
    private Vec3d mc_custom_client$applySpeedMultiplier(Vec3d movementInput) {
        float multiplier = SpeedController.getMultiplier();
        if (multiplier == 1.0f) {
            return movementInput;
        }

        LivingEntity self = (LivingEntity) (Object) this;
        if (!(self instanceof PlayerEntity player)) {
            return movementInput;
        }

        UUID localPlayerUuid = MinecraftClient.getInstance().getSession() == null
                ? null
                : MinecraftClient.getInstance().getSession().getUuidOrNull();
        if (localPlayerUuid == null || !localPlayerUuid.equals(player.getUuid())) {
            return movementInput;
        }

        return movementInput.multiply(multiplier);
    }
}
