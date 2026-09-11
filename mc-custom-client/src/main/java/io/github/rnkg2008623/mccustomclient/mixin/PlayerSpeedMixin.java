package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Vec3d;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.UUID;

/**
 * LivingEntity#travel をフックし、自分のプレイヤーに限り
 * ・入力の強さ(SpeedController) … HEADで movementInput をスケール
 * ・実際の速度ベクトル(VelocityController) … TAILで getVelocity() をスケール
 * の2つを適用する。
 *
 * UUID で「自分自身か」を判定しているのは、シングルプレイでは統合サーバー側の
 * ServerPlayerEntity とクライアント側の ClientPlayerEntity が別オブジェクトに
 * なるため、参照(==)比較ではどちらか一方にしか効かず、サーバー側の補正で
 * 押し戻される(rubber-banding)のを避けるため。
 */
@Mixin(LivingEntity.class)
public abstract class PlayerSpeedMixin {

    /** velocity倍率を毎tick掛け続けても暴走しないよう、速度の大きさをここで頭打ちにする。 */
    private static final double MAX_VELOCITY_LENGTH = 10.0;

    @ModifyVariable(method = "travel", at = @At("HEAD"), argsOnly = true)
    private Vec3d mc_custom_client$applySpeedMultiplier(Vec3d movementInput) {
        float multiplier = SpeedController.getMultiplier();
        if (multiplier == 1.0f || !mc_custom_client$isLocalPlayer()) {
            return movementInput;
        }
        return movementInput.multiply(multiplier);
    }

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$applyVelocityMultiplier(Vec3d movementInput, CallbackInfo ci) {
        float multiplier = VelocityController.getMultiplier();
        if (multiplier == 1.0f || !mc_custom_client$isLocalPlayer()) {
            return;
        }

        LivingEntity self = (LivingEntity) (Object) this;
        Vec3d scaled = self.getVelocity().multiply(multiplier);

        double length = scaled.length();
        if (length > MAX_VELOCITY_LENGTH) {
            scaled = scaled.multiply(MAX_VELOCITY_LENGTH / length);
        }

        self.setVelocity(scaled);
    }

    private boolean mc_custom_client$isLocalPlayer() {
        LivingEntity self = (LivingEntity) (Object) this;
        if (!(self instanceof PlayerEntity player)) {
            return false;
        }

        UUID localPlayerUuid = MinecraftClient.getInstance().getSession() == null
                ? null
                : MinecraftClient.getInstance().getSession().getUuidOrNull();
        return localPlayerUuid != null && localPlayerUuid.equals(player.getUuid());
    }
}
