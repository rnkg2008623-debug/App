package dev.packettoggle.mixin;

import dev.packettoggle.PacketToggleState;
import net.minecraft.client.network.ClientCommonNetworkHandler;
import net.minecraft.client.network.ClientPlayNetworkHandler;
import net.minecraft.network.packet.Packet;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * クライアントからサーバーへ送るすべてのパケットが最終的に通る
 * {@code ClientCommonNetworkHandler#sendPacket} をフックし、
 * トグル状態に応じて送信を中止（STOP）または遅延キューへ回す（DELAY）。
 *
 * 注意: このMixinはMinecraft 1.21.1のYarnマッピング上のメソッド名/シグネチャを前提にしている。
 * 別バージョンで使う場合は開発環境で該当メソッドの実際の名前・シグネチャを確認し、
 * 必要であれば method 属性の記述を更新すること。
 */
@Mixin(ClientCommonNetworkHandler.class)
public abstract class ClientCommonNetworkHandlerMixin {

	@Inject(method = "sendPacket(Lnet/minecraft/network/packet/Packet;)V", at = @At("HEAD"), cancellable = true)
	private void packettoggle$onSendPacket(Packet<?> packet, CallbackInfo ci) {
		if (PacketToggleState.isBypassed()) {
			// 遅延キューからの再送・即時フラッシュ時はここを通さない。
			return;
		}
		// ログイン/構成フェーズのパケットは邪魔しない。プレイ中(サーバー接続後)のみ対象にする。
		if (!(((Object) this) instanceof ClientPlayNetworkHandler)) {
			return;
		}

		switch (PacketToggleState.getMode()) {
			case STOP -> ci.cancel();
			case DELAY -> {
				ClientCommonNetworkHandler self = (ClientCommonNetworkHandler) (Object) this;
				PacketToggleState.enqueueDelayed(self, packet);
				ci.cancel();
			}
			case NORMAL -> {
				// 何もしない。通常送信。
			}
		}
	}
}
