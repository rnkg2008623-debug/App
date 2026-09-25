package com.rnkg.velocityjump;

import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.argument;
import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.literal;

import com.mojang.brigadier.Command;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.context.CommandContext;

import net.minecraft.client.player.LocalPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.world.phys.Vec3;

import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;

/**
 * クライアントコマンド
 *
 * <pre>
 * /vel                       現在の velocity を表示
 * /vel set &lt;x&gt; &lt;y&gt; &lt;z&gt;       velocity を設定
 * /vel add &lt;x&gt; &lt;y&gt; &lt;z&gt;       velocity に加算
 * /vel mul &lt;倍率&gt;             velocity を倍率で掛ける
 * /vel look &lt;強さ&gt;            視線方向に速度を加算
 * /vel stop                  velocity を 0 にする
 * /vel dash [強さ]           ダッシュキー(V)の強さを表示/設定
 * /vel launch [強さ]         打ち上げキー(G)の強さを表示/設定
 *
 * /jumpheight                現在の設定を表示
 * /jumpheight &lt;ブロック&gt;      ジャンプの高さを設定して ON
 * /jumpheight on|off         ON/OFF
 * /jumpheight reset          バニラ(約 1.25 ブロック)に戻して OFF
 * </pre>
 */
public final class VelocityJumpCommands {
	private VelocityJumpCommands() {
	}

	public static void register(CommandDispatcher<FabricClientCommandSource> dispatcher) {
		dispatcher.register(literal("vel")
				.executes(ctx -> showVelocity(ctx.getSource()))
				.then(literal("set")
						.then(argument("x", DoubleArgumentType.doubleArg())
								.then(argument("y", DoubleArgumentType.doubleArg())
										.then(argument("z", DoubleArgumentType.doubleArg())
												.executes(ctx -> setVelocity(ctx.getSource(), readVec(ctx)))))))
				.then(literal("add")
						.then(argument("x", DoubleArgumentType.doubleArg())
								.then(argument("y", DoubleArgumentType.doubleArg())
										.then(argument("z", DoubleArgumentType.doubleArg())
												.executes(ctx -> setVelocity(ctx.getSource(), ctx.getSource().getPlayer().getDeltaMovement().add(readVec(ctx))))))))
				.then(literal("mul")
						.then(argument("factor", DoubleArgumentType.doubleArg())
								.executes(ctx -> setVelocity(ctx.getSource(), ctx.getSource().getPlayer().getDeltaMovement().scale(DoubleArgumentType.getDouble(ctx, "factor"))))))
				.then(literal("look")
						.then(argument("power", DoubleArgumentType.doubleArg())
								.executes(ctx -> {
									LocalPlayer player = ctx.getSource().getPlayer();
									Vec3 add = player.getLookAngle().scale(DoubleArgumentType.getDouble(ctx, "power"));
									return setVelocity(ctx.getSource(), player.getDeltaMovement().add(add));
								})))
				.then(literal("stop")
						.executes(ctx -> setVelocity(ctx.getSource(), Vec3.ZERO)))
				.then(literal("dash")
						.executes(ctx -> feedback(ctx.getSource(), "ダッシュの強さ: " + VelocityJumpClient.format(VelocityJumpConfig.dashPower)))
						.then(argument("power", DoubleArgumentType.doubleArg(0.0))
								.executes(ctx -> {
									VelocityJumpConfig.dashPower = DoubleArgumentType.getDouble(ctx, "power");
									VelocityJumpConfig.save();
									return feedback(ctx.getSource(), "ダッシュの強さを " + VelocityJumpClient.format(VelocityJumpConfig.dashPower) + " に設定しました");
								})))
				.then(literal("launch")
						.executes(ctx -> feedback(ctx.getSource(), "打ち上げの強さ: " + VelocityJumpClient.format(VelocityJumpConfig.launchPower)))
						.then(argument("power", DoubleArgumentType.doubleArg())
								.executes(ctx -> {
									VelocityJumpConfig.launchPower = DoubleArgumentType.getDouble(ctx, "power");
									VelocityJumpConfig.save();
									return feedback(ctx.getSource(), "打ち上げの強さを " + VelocityJumpClient.format(VelocityJumpConfig.launchPower) + " に設定しました");
								}))));

		dispatcher.register(literal("jumpheight")
				.executes(ctx -> showJump(ctx.getSource()))
				.then(literal("on")
						.executes(ctx -> setJumpEnabled(ctx.getSource(), true)))
				.then(literal("off")
						.executes(ctx -> setJumpEnabled(ctx.getSource(), false)))
				.then(literal("reset")
						.executes(ctx -> {
							VelocityJumpConfig.jumpHeight = VelocityJumpConfig.DEFAULT_JUMP_HEIGHT;
							return setJumpEnabled(ctx.getSource(), false);
						}))
				.then(argument("blocks", DoubleArgumentType.doubleArg(0.0, 1000.0))
						.executes(ctx -> {
							VelocityJumpConfig.jumpHeight = DoubleArgumentType.getDouble(ctx, "blocks");
							return setJumpEnabled(ctx.getSource(), true);
						})));
	}

	private static Vec3 readVec(CommandContext<FabricClientCommandSource> ctx) {
		return new Vec3(
				DoubleArgumentType.getDouble(ctx, "x"),
				DoubleArgumentType.getDouble(ctx, "y"),
				DoubleArgumentType.getDouble(ctx, "z"));
	}

	private static int setVelocity(FabricClientCommandSource source, Vec3 velocity) {
		source.getPlayer().setDeltaMovement(velocity);
		return showVelocity(source);
	}

	private static int showVelocity(FabricClientCommandSource source) {
		Vec3 v = source.getPlayer().getDeltaMovement();
		return feedback(source, "velocity: x=" + VelocityJumpClient.format(v.x)
				+ " y=" + VelocityJumpClient.format(v.y)
				+ " z=" + VelocityJumpClient.format(v.z)
				+ " (速さ " + VelocityJumpClient.format(v.length()) + ")");
	}

	private static int setJumpEnabled(FabricClientCommandSource source, boolean enabled) {
		VelocityJumpConfig.jumpEnabled = enabled;
		VelocityJumpConfig.save();
		return showJump(source);
	}

	private static int showJump(FabricClientCommandSource source) {
		double gravity = VelocityJumpClient.currentGravity(source.getPlayer());
		double velocity = JumpMath.velocityForHeight(VelocityJumpConfig.jumpHeight, gravity);
		return feedback(source, "ジャンプ高さ変更: " + (VelocityJumpConfig.jumpEnabled ? "ON" : "OFF")
				+ " / 高さ " + VelocityJumpClient.format(VelocityJumpConfig.jumpHeight) + " ブロック"
				+ " (ジャンプ初速 " + VelocityJumpClient.format(velocity) + ")");
	}

	private static int feedback(FabricClientCommandSource source, String message) {
		source.sendFeedback(Component.literal(message));
		return Command.SINGLE_SUCCESS;
	}
}
