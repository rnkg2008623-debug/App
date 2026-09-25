package com.rnkg.velocityjump;

import com.mojang.blaze3d.platform.InputConstants;
import org.lwjgl.sdl.SDLScancode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Abilities;
import net.minecraft.world.phys.Vec3;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;

public class VelocityJumpClient implements ClientModInitializer {
	public static final String MOD_ID = "velocityjump";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	/** バニラ(クリエイティブ)の飛行速度。 */
	private static final float VANILLA_FLY_SPEED = 0.05F;

	private static KeyMapping menuKey;
	private static KeyMapping dashKey;
	private static KeyMapping launchKey;

	/** 現在ジャンプ力を書き換えているか(OFF にしたとき元に戻すため)。 */
	private static boolean jumpApplied = false;
	/** 現在飛行を有効にしているか(OFF にしたとき元に戻すため)。 */
	private static boolean flightApplied = false;
	/** サーバー側 (シングルプレイ) で飛行を許可しているか。 */
	private static boolean serverFlightApplied = false;

	@Override
	public void onInitializeClient() {
		VelocityJumpConfig.load();

		KeyMapping.Category category = KeyMapping.Category.register(Identifier.fromNamespaceAndPath(MOD_ID, "main"));
		menuKey = register("menu", SDLScancode.SDL_SCANCODE_M, category);
		dashKey = register("dash", SDLScancode.SDL_SCANCODE_V, category);
		launchKey = register("launch", SDLScancode.SDL_SCANCODE_G, category);

		ClientTickEvents.END_CLIENT_TICK.register(VelocityJumpClient::onEndTick);
	}

	private static KeyMapping register(String name, int scancode, KeyMapping.Category category) {
		return KeyMappingHelper.registerKeyMapping(new KeyMapping("key." + MOD_ID + "." + name, InputConstants.Type.KEYBOARD, scancode, category));
	}

	private static void onEndTick(Minecraft client) {
		LocalPlayer player = client.player;

		if (player == null) {
			jumpApplied = false;
			flightApplied = false;
			serverFlightApplied = false;
			return;
		}

		while (menuKey.consumeClick()) {
			client.gui.setScreen(new VelocityJumpScreen());
		}

		while (dashKey.consumeClick()) {
			Vec3 look = player.getLookAngle().scale(VelocityJumpConfig.dashPower);
			player.setDeltaMovement(player.getDeltaMovement().add(look));
		}

		while (launchKey.consumeClick()) {
			Vec3 v = player.getDeltaMovement();
			player.setDeltaMovement(v.x, VelocityJumpConfig.launchPower, v.z);
		}

		applyJumpStrength(player);
		applyFlight(player);
		applyAirWalk(player);

		// 飛行・空中歩行の間は、シングルプレイのサーバー側でも飛行を許可して落下ダメージを無くす
		boolean wantServerFlight = VelocityJumpConfig.flightEnabled || VelocityJumpConfig.airWalkEnabled;

		if (wantServerFlight || serverFlightApplied) {
			syncServerFlight(client, player, wantServerFlight);
			serverFlightApplied = wantServerFlight;
		}
	}

	/**
	 * ジャンプ力属性 (minecraft:jump_strength) を毎 tick 目標値に合わせる。
	 * リスポーンやディメンション移動で属性がリセットされても自動で再適用される。
	 */
	private static void applyJumpStrength(LocalPlayer player) {
		AttributeInstance jump = player.getAttribute(Attributes.JUMP_STRENGTH);

		if (jump == null) {
			return;
		}

		double target;

		if (VelocityJumpConfig.jumpEnabled) {
			target = JumpMath.velocityForHeight(VelocityJumpConfig.jumpHeight, currentGravity(player));
			jumpApplied = true;
		} else if (jumpApplied) {
			target = jump.getAttribute().value().getDefaultValue();
			jumpApplied = false;
		} else {
			return;
		}

		if (jump.getBaseValue() != target) {
			jump.setBaseValue(target);
		}
	}

	/**
	 * クリエイティブのような飛行 (スペース 2 回で飛行開始) を有効にする。
	 */
	private static void applyFlight(LocalPlayer player) {
		Abilities abilities = player.getAbilities();
		boolean vanillaMayfly = player.isCreative() || player.isSpectator();

		if (VelocityJumpConfig.flightEnabled) {
			abilities.mayfly = true;

			if (!player.isSpectator()) {
				abilities.setFlyingSpeed((float) (VANILLA_FLY_SPEED * VelocityJumpConfig.flySpeed));
			}

			flightApplied = true;
		} else if (flightApplied) {
			abilities.mayfly = vanillaMayfly;

			if (!vanillaMayfly) {
				abilities.flying = false;
			}

			if (!player.isSpectator()) {
				abilities.setFlyingSpeed(VANILLA_FLY_SPEED);
			}

			flightApplied = false;
		}
	}

	/**
	 * 空中歩行: 空中に見えない床があるように、今の高さのまま歩いたり走ったりできる。
	 * <ul>
	 *   <li>ジャンプすると、その高さに床ができる (空中で何回でもジャンプして上に登れる)</li>
	 *   <li>スニーク (Shift) している間は床が消えて下に降りる</li>
	 * </ul>
	 */
	private static void applyAirWalk(LocalPlayer player) {
		if (!VelocityJumpConfig.airWalkEnabled
				|| player.getAbilities().flying
				|| player.isFallFlying()
				|| player.isPassenger()
				|| player.isInWater()
				|| player.isShiftKeyDown()) {
			return;
		}

		Vec3 v = player.getDeltaMovement();

		// ジャンプで上昇中はそのまま。落ち始めたら、その高さで止めて「地面に立っている」扱いにする。
		// (地面扱いにすると、地上と同じ速さで歩く・走る・ジャンプができる)
		if (v.y <= 0.0) {
			player.setDeltaMovement(v.x, 0.0, v.z);
			player.setOnGround(true);
			player.resetFallDistance();
		}
	}

	private static void syncServerFlight(Minecraft client, LocalPlayer player, boolean enabled) {
		MinecraftServer server = client.getSingleplayerServer();

		if (server == null) {
			return;
		}

		server.execute(() -> {
			ServerPlayer serverPlayer = server.getPlayerList().getPlayer(player.getUUID());

			if (serverPlayer == null) {
				return;
			}

			Abilities abilities = serverPlayer.getAbilities();
			boolean mayfly = enabled || serverPlayer.isCreative() || serverPlayer.isSpectator();

			if (abilities.mayfly != mayfly) {
				abilities.mayfly = mayfly;

				if (!mayfly) {
					abilities.flying = false;
				}

				serverPlayer.onUpdateAbilities();
			}
		});
	}

	public static double currentGravity(LocalPlayer player) {
		AttributeInstance gravity = player.getAttribute(Attributes.GRAVITY);
		return gravity != null ? gravity.getValue() : 0.08;
	}
}
