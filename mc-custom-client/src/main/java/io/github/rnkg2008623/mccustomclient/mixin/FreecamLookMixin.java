package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.FreecamController;
import net.minecraft.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * マウスの視点移動を、フリーカム中は実際のプレイヤーの向きではなく
 * FreecamControllerの仮想カメラの向きに反映させる。
 *
 * これにより、フリーカムで見回している間も他のプレイヤーから見た自分の
 * 向きは変わらない（実際のキャラクターの回転そのものをキャンセルする）。
 *
 * バニラの内部メソッド名に依存するため require = 0 にしてあり、万一
 * ターゲットが見つからなくても他の機能ごと起動失敗しないようにしている
 * （その場合、フリーカム中も実キャラの向きが一緒に回転してしまうだけ）。
 */
@Mixin(Entity.class)
public abstract class FreecamLookMixin {

    private static final float TURN_FACTOR = 0.15f;

    @Inject(method = "changeLookDirection", at = @At("HEAD"), cancellable = true, require = 0)
    private void mc_custom_client$redirectLookToFreecam(double cursorDeltaX, double cursorDeltaY, CallbackInfo ci) {
        Entity self = (Entity) (Object) this;
        if (!FreecamController.isEnabled() || !LocalPlayerCheck.isLocalPlayer(self)) {
            return;
        }

        float newYaw = FreecamController.getYaw() + (float) cursorDeltaX * TURN_FACTOR;
        float newPitch = FreecamController.getPitch() + (float) cursorDeltaY * TURN_FACTOR;
        FreecamController.setRotation(newYaw, newPitch);

        ci.cancel();
    }
}
