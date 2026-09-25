package io.github.rnkg2008623.mccustomclient.mixin;

import net.minecraft.client.Camera;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

/**
 * Camera#setPosition / Camera#setRotation はprotectedで外部から直接呼べないため、
 * Mixinの@Invokerで public 相当の呼び出し口を生やすアクセサ。
 * FreecamCameraMixin から利用する。
 */
@Mixin(Camera.class)
public interface CameraAccessor {

    @Invoker("setPosition")
    void mc_custom_client$invokeSetPosition(Vec3 pos);

    @Invoker("setRotation")
    void mc_custom_client$invokeSetRotation(float yaw, float pitch);
}
