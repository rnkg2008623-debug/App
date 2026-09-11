package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.JumpController;
import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import io.github.rnkg2008623.mccustomclient.WaterWalkController;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.registry.tag.FluidTags;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.UUID;

/**
 * LivingEntity をフックして、自分のプレイヤーに限り以下を適用する。
 *
 * ・移動速度(SpeedController)     … travel()のHEADで movementInput をスケール
 * ・水上歩行(WaterWalkController) … travel()のTAILで、水中にいる間だけ
 *   鉛直速度を止めて水面に浮かせる
 * ・ジャンプの高さ(JumpController)     … getJumpVelocity()の戻り値をスケール
 * ・受けるノックバック(VelocityController) … takeKnockback()のstrengthをスケール
 *
 * ジャンプ・ノックバックの2つは自分のジャンプ・落下・移動そのものには影響しない
 * （それぞれ独立したメソッドをフックしているため）。この2つはフック先メソッド名が
 * バージョンやマッピングで変わりやすいため require = 0 にし、万一ターゲットが
 * 見つからなくても他の機能(移動速度・水上歩行など)ごと起動失敗しないようにしている。
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
        if (multiplier == 1.0f || !mc_custom_client$isLocalPlayer()) {
            return movementInput;
        }
        return movementInput.multiply(multiplier);
    }

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$applyWaterWalk(Vec3d movementInput, CallbackInfo ci) {
        if (!WaterWalkController.isEnabled() || !mc_custom_client$isLocalPlayer()) {
            return;
        }

        LivingEntity self = (LivingEntity) (Object) this;
        if (!self.isTouchingWater()) {
            return;
        }

        double surfaceY = mc_custom_client$findWaterSurfaceY(self);
        Vec3d velocity = self.getVelocity();
        double newY = self.getY() < surfaceY - 0.05 ? Math.max(velocity.y, 0.3) : 0.0;

        self.setVelocity(velocity.x, newY, velocity.z);
    }

    @Inject(method = "getJumpVelocity", at = @At("RETURN"), cancellable = true, require = 0)
    private void mc_custom_client$applyJumpMultiplier(CallbackInfoReturnable<Float> cir) {
        float multiplier = JumpController.getMultiplier();
        if (multiplier == 1.0f || !mc_custom_client$isLocalPlayer()) {
            return;
        }
        cir.setReturnValue(cir.getReturnValue() * multiplier);
    }

    @ModifyVariable(method = "takeKnockback", at = @At("HEAD"), argsOnly = true, ordinal = 0, require = 0)
    private double mc_custom_client$applyKnockbackMultiplier(double strength) {
        if (!mc_custom_client$isLocalPlayer()) {
            return strength;
        }
        return strength * VelocityController.getMultiplier();
    }

    /** 現在地から上方向に水ブロックを数え、最初に水でなくなったYを「水面の高さ」として返す。 */
    private double mc_custom_client$findWaterSurfaceY(LivingEntity self) {
        World world = self.getWorld();
        BlockPos pos = BlockPos.ofFloored(self.getX(), self.getY(), self.getZ());
        int y = pos.getY();
        for (int i = 0; i < 8; i++) {
            BlockPos check = new BlockPos(pos.getX(), y, pos.getZ());
            if (!world.getFluidState(check).isIn(FluidTags.WATER)) {
                return y;
            }
            y++;
        }
        return y;
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
