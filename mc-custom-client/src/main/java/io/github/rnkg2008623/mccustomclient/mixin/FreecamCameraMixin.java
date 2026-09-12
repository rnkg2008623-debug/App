package io.github.rnkg2008623.mccustomclient.mixin;

import io.github.rnkg2008623.mccustomclient.FreecamController;
import net.minecraft.client.render.Camera;
import net.minecraft.entity.Entity;
import net.minecraft.world.BlockView;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 描画用カメラの位置・向きを、フリーカム中はバニラが計算した実際のプレイヤー
 * 位置ではなくFreecamControllerの仮想位置・向きに差し替える。
 *
 * バニラの内部メソッド名に依存するため require = 0 にしてあり、万一
 * ターゲットが見つからなくても他の機能ごと起動失敗しないようにしている
 * （その場合、フリーカムを有効にしてもカメラ映像は実キャラのままになる）。
 */
@Mixin(Camera.class)
public abstract class FreecamCameraMixin {

    @Inject(method = "update", at = @At("TAIL"), require = 0)
    private void mc_custom_client$overrideFreecamView(
            BlockView area, Entity focusedEntity, boolean thirdPerson, boolean inverseView, float tickDelta,
            CallbackInfo ci) {
        if (!FreecamController.isEnabled() || !LocalPlayerCheck.isLocalPlayer(focusedEntity)) {
            return;
        }

        Camera self = (Camera) (Object) this;
        self.setPos(FreecamController.getPosition());
        self.setRotation(FreecamController.getYaw(), FreecamController.getPitch());
    }
}
