package com.rnkg.velocityjump;

import com.mojang.blaze3d.platform.InputConstants;
import org.lwjgl.sdl.SDLScancode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.phys.Vec3;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;

public class VelocityJumpClient implements ClientModInitializer {
	public static final String MOD_ID = "velocityjump";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static final double JUMP_STEP = 0.5;

	private static KeyMapping dashKey;
	private static KeyMapping launchKey;
	private static KeyMapping toggleJumpKey;
	private static KeyMapping jumpUpKey;
	private static KeyMapping jumpDownKey;

	/** 現在ジャンプ力を書き換えているか(OFF にしたとき元に戻すため)。 */
	private static boolean jumpApplied = false;

	@Override
	public void onInitializeClient() {
		VelocityJumpConfig.load();

		KeyMapping.Category category = KeyMapping.Category.register(Identifier.fromNamespaceAndPath(MOD_ID, "main"));
		dashKey = register("dash", SDLScancode.SDL_SCANCODE_V, category);
		launchKey = register("launch", SDLScancode.SDL_SCANCODE_G, category);
		toggleJumpKey = register("toggle_jump", SDLScancode.SDL_SCANCODE_J, category);
		jumpUpKey = register("jump_up", SDLScancode.SDL_SCANCODE_EQUALS, category);
		jumpDownKey = register("jump_down", SDLScancode.SDL_SCANCODE_MINUS, category);

		ClientTickEvents.END_CLIENT_TICK.register(VelocityJumpClient::onEndTick);
		ClientCommandRegistrationCallback.EVENT.register((dispatcher, buildContext) -> VelocityJumpCommands.register(dispatcher));
	}

	private static KeyMapping register(String name, int scancode, KeyMapping.Category category) {
		return KeyMappingHelper.registerKeyMapping(new KeyMapping("key." + MOD_ID + "." + name, InputConstants.Type.KEYBOARD, scancode, category));
	}

	private static void onEndTick(Minecraft client) {
		LocalPlayer player = client.player;

		if (player == null) {
			jumpApplied = false;
			return;
		}

		while (dashKey.consumeClick()) {
			Vec3 look = player.getLookAngle().scale(VelocityJumpConfig.dashPower);
			player.setDeltaMovement(player.getDeltaMovement().add(look));
		}

		while (launchKey.consumeClick()) {
			Vec3 v = player.getDeltaMovement();
			player.setDeltaMovement(v.x, VelocityJumpConfig.launchPower, v.z);
		}

		while (toggleJumpKey.consumeClick()) {
			VelocityJumpConfig.jumpEnabled = !VelocityJumpConfig.jumpEnabled;
			VelocityJumpConfig.save();
			player.sendOverlayMessage(Component.literal(VelocityJumpConfig.jumpEnabled
					? "ジャンプ高さ変更: ON (" + format(VelocityJumpConfig.jumpHeight) + " ブロック)"
					: "ジャンプ高さ変更: OFF"));
		}

		while (jumpUpKey.consumeClick()) {
			changeJumpHeight(player, JUMP_STEP);
		}

		while (jumpDownKey.consumeClick()) {
			changeJumpHeight(player, -JUMP_STEP);
		}

		applyJumpStrength(player);
	}

	private static void changeJumpHeight(LocalPlayer player, double delta) {
		VelocityJumpConfig.jumpHeight = Math.max(0.0, VelocityJumpConfig.jumpHeight + delta);
		VelocityJumpConfig.jumpEnabled = true;
		VelocityJumpConfig.save();
		player.sendOverlayMessage(Component.literal("ジャンプ高さ: " + format(VelocityJumpConfig.jumpHeight) + " ブロック"));
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

	public static double currentGravity(LocalPlayer player) {
		AttributeInstance gravity = player.getAttribute(Attributes.GRAVITY);
		return gravity != null ? gravity.getValue() : 0.08;
	}

	public static String format(double value) {
		return String.format("%.3f", value);
	}
}
