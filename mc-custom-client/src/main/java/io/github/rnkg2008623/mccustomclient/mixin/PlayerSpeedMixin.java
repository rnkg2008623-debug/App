package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.FreecamController;
import io.github.rnkg2008623.mccustomclient.JumpController;
import io.github.rnkg2008623.mccustomclient.SpeedController;
import io.github.rnkg2008623.mccustomclient.VelocityController;
import io.github.rnkg2008623.mccustomclient.WaterWalkController;
import net.minecraft.entity.LivingEntity;
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

/**
 * LivingEntity をフックして、自分のプレイヤーに限り以下を適用する。
 *
 * ・移動速度(SpeedController)     … travel()のHEADで movementInput をスケール
 *   （「目標の速さ」そのものを変える）
 * ・Velocity(VelocityController)  … travel()のTAILで、実際の水平速度(X/Z)そのもの
 *   に毎tick倍率を掛ける。移動を続けるほど速度が積み上がっていく（走るほど加速して
 *   いく）感覚になる。上下方向(Y)には一切触れないので、ジャンプ・落下には影響しない。
 * ・ジャンプの高さ(JumpController) … getJumpVelocity()の戻り値をスケール
 * ・水上歩行(WaterWalkController) … travel()のTAILで、水中にいる間だけ
 *   鉛直速度を止めて水面に浮かせる
 * ・フリーカム(FreecamController)  … 有効な間は移動入力(movementInput)をゼロにし、
 *   毎tick速度を強制的にゼロへ戻し、ジャンプもキャンセルすることで、実際の
 *   キャラクターが一切動かないようにする(カメラ側の移動はFreecamCameraMixin、
 *   視点回転はFreecamLookMixinが別途担当)。
 *
 * ジャンプの高さはバニラの内部メソッド名に依存しフックが壊れやすいため、
 * require = 0 にし、万一ターゲットが見つからなくても他の機能ごと起動失敗
 * しないようにしている。
 */
@Mixin(LivingEntity.class)
public abstract class PlayerSpeedMixin {

    /** Velocity倍率を毎tick掛け続けても暴走しないよう、水平速度の大きさをここで頭打ちにする。 */
    private static final double MAX_HORIZONTAL_VELOCITY = 10.0;

    @ModifyVariable(method = "travel", at = @At("HEAD"), argsOnly = true)
    private Vec3d mc_custom_client$applySpeedMultiplier(Vec3d movementInput) {
        LivingEntity self = (LivingEntity) (Object) this;
        if (!LocalPlayerCheck.isLocalPlayer(self)) {
            return movementInput;
        }

        if (FreecamController.isEnabled()) {
            return Vec3d.ZERO;
        }

        float multiplier = SpeedController.getMultiplier();
        if (multiplier == 1.0f) {
            return movementInput;
        }
        return movementInput.multiply(multiplier);
    }

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$applyVelocityMultiplier(Vec3d movementInput, CallbackInfo ci) {
        if (!LocalPlayerCheck.isLocalPlayer((LivingEntity) (Object) this) || FreecamController.isEnabled()) {
            return;
        }

        float multiplier = VelocityController.getMultiplier();
        if (multiplier == 1.0f) {
            return;
        }

        LivingEntity self = (LivingEntity) (Object) this;
        Vec3d velocity = self.getVelocity();

        double newX = velocity.x * multiplier;
        double newZ = velocity.z * multiplier;

        double horizontalLength = Math.sqrt(newX * newX + newZ * newZ);
        if (horizontalLength > MAX_HORIZONTAL_VELOCITY) {
            double scale = MAX_HORIZONTAL_VELOCITY / horizontalLength;
            newX *= scale;
            newZ *= scale;
        }

        // Y(上下)には一切触れない。ジャンプ・落下はJumpController／バニラのまま。
        self.setVelocity(newX, velocity.y, newZ);
    }

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$applyWaterWalk(Vec3d movementInput, CallbackInfo ci) {
        if (!WaterWalkController.isEnabled() || FreecamController.isEnabled()
                || !LocalPlayerCheck.isLocalPlayer((LivingEntity) (Object) this)) {
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

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$freezeWhileFreecam(Vec3d movementInput, CallbackInfo ci) {
        LivingEntity self = (LivingEntity) (Object) this;
        if (!FreecamController.isEnabled() || !LocalPlayerCheck.isLocalPlayer(self)) {
            return;
        }
        // フリーカム中は重力・慣性などバニラが計算した分もすべて打ち消し、その場に固定する。
        self.setVelocity(Vec3d.ZERO);
        self.fallDistance = 0f;
    }

    @Inject(method = "jump", at = @At("HEAD"), cancellable = true, require = 0)
    private void mc_custom_client$cancelJumpWhileFreecam(CallbackInfo ci) {
        LivingEntity self = (LivingEntity) (Object) this;
        if (FreecamController.isEnabled() && LocalPlayerCheck.isLocalPlayer(self)) {
            ci.cancel();
        }
    }

    @Inject(method = "getJumpVelocity", at = @At("RETURN"), cancellable = true, require = 0)
    private void mc_custom_client$applyJumpMultiplier(CallbackInfoReturnable<Float> cir) {
        LivingEntity self = (LivingEntity) (Object) this;
        if (!LocalPlayerCheck.isLocalPlayer(self)) {
            return;
        }
        float multiplier = JumpController.getMultiplier();
        if (multiplier == 1.0f) {
            return;
        }
        cir.setReturnValue(cir.getReturnValue() * multiplier);
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
}
