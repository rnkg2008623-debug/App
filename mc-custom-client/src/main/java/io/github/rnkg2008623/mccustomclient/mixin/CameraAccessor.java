package io.github.rnkg2008623.mccustomclient.mixin;

import net.minecraft.client.render.Camera;
import net.minecraft.util.math.Vec3d;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

/**
 * Camera#setPos / Camera#setRotation はprotectedで外部から直接呼べないため、
 * Mixinの@Invokerで public 相当の呼び出し口を生やすアクセサ。
 * FreecamCameraMixin から利用する。
 */
@Mixin(Camera.class)
public interface CameraAccessor {

    @Invoker("setPos")
    void mc_custom_client$invokeSetPos(Vec3d pos);

    @Invoker("setRotation")
    void mc_custom_client$invokeSetRotation(float yaw, float pitch);
}
