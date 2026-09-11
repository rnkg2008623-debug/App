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
import org.spongepowered.asm.mixin.Unique;
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
 *   （「目標の速さ」そのものを変える）
 * ・加速度(VelocityController)    … travel()のHEADで変更前の速度を記録しておき、
 *   TAILで「バニラ物理がそのtickで計算した速度の変化量(delta)」に倍率を掛ける。
 *   速度そのものを直接スケールするのではなく変化量をスケールするので、方向転換の
 *   しやすさ自体も一緒に速くなる（≒加速度を上げるほど曲がりやすくなる）。水平方向
 *   (X/Z)のみが対象で、上下方向(Y)には一切触れない。
 * ・ジャンプの高さ(JumpController) … getJumpVelocity()の戻り値をスケール
 * ・水上歩行(WaterWalkController) … travel()のTAILで、水中にいる間だけ
 *   鉛直速度を止めて水面に浮かせる
 *
 * ジャンプの高さはバニラの内部メソッド名に依存しフックが壊れやすいため、
 * require = 0 にし、万一ターゲットが見つからなくても他の機能ごと起動失敗
 * しないようにしている。
 *
 * UUID で「自分自身か」を判定しているのは、シングルプレイでは統合サーバー側の
 * ServerPlayerEntity とクライアント側の ClientPlayerEntity が別オブジェクトに
 * なるため、参照(==)比較ではどちらか一方にしか効かず、サーバー側の補正で
 * 押し戻される(rubber-banding)のを避けるため。
 */
@Mixin(LivingEntity.class)
public abstract class PlayerSpeedMixin {

    /** 加速度倍率を掛けても暴走しないよう、水平速度の大きさをここで頭打ちにする。 */
    private static final double MAX_HORIZONTAL_VELOCITY = 10.0;

    /** travel()のHEAD時点の速度。同じtick内でHEAD→TAILの間だけ使う一時的な値。 */
    @Unique
    private Vec3d mc_custom_client$velocityBeforeTravel;

    @ModifyVariable(method = "travel", at = @At("HEAD"), argsOnly = true)
    private Vec3d mc_custom_client$applySpeedMultiplier(Vec3d movementInput) {
        boolean isLocal = mc_custom_client$isLocalPlayer();
        if (isLocal) {
            mc_custom_client$velocityBeforeTravel = ((LivingEntity) (Object) this).getVelocity();
        }

        float multiplier = SpeedController.getMultiplier();
        if (multiplier == 1.0f || !isLocal) {
            return movementInput;
        }
        return movementInput.multiply(multiplier);
    }

    @Inject(method = "travel", at = @At("TAIL"))
    private void mc_custom_client$applyAccelerationMultiplier(Vec3d movementInput, CallbackInfo ci) {
        float multiplier = VelocityController.getMultiplier();
        Vec3d before = mc_custom_client$velocityBeforeTravel;
        if (multiplier == 1.0f || before == null || !mc_custom_client$isLocalPlayer()) {
            return;
        }

        LivingEntity self = (LivingEntity) (Object) this;
        Vec3d after = self.getVelocity();

        double newX = before.x + (after.x - before.x) * multiplier;
        double newZ = before.z + (after.z - before.z) * multiplier;

        double horizontalLength = Math.sqrt(newX * newX + newZ * newZ);
        if (horizontalLength > MAX_HORIZONTAL_VELOCITY) {
            double scale = MAX_HORIZONTAL_VELOCITY / horizontalLength;
            newX *= scale;
            newZ *= scale;
        }

        self.setVelocity(newX, after.y, newZ);
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
