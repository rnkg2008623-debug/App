package com.rnkg.velocityjump;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import net.fabricmc.loader.api.FabricLoader;

/** 設定値。config/velocityjump.properties に保存される。 */
public final class VelocityJumpConfig {
	public static final double DEFAULT_JUMP_HEIGHT = 1.25;
	public static final double DEFAULT_DASH_POWER = 1.5;
	public static final double DEFAULT_LAUNCH_POWER = 1.5;

	/** ジャンプ高さの変更が有効か。 */
	public static boolean jumpEnabled = false;
	/** 目標のジャンプ高さ(ブロック)。 */
	public static double jumpHeight = DEFAULT_JUMP_HEIGHT;
	/** ダッシュキーで視線方向に加える速度。 */
	public static double dashPower = DEFAULT_DASH_POWER;
	/** 打ち上げキーで真上に設定する速度。 */
	public static double launchPower = DEFAULT_LAUNCH_POWER;

	private VelocityJumpConfig() {
	}

	private static Path path() {
		return FabricLoader.getInstance().getConfigDir().resolve("velocityjump.properties");
	}

	public static void load() {
		Path path = path();

		if (!Files.exists(path)) {
			return;
		}

		Properties props = new Properties();

		try (Reader reader = Files.newBufferedReader(path)) {
			props.load(reader);
		} catch (IOException e) {
			VelocityJumpClient.LOGGER.warn("Failed to load {}", path, e);
			return;
		}

		jumpEnabled = Boolean.parseBoolean(props.getProperty("jumpEnabled", Boolean.toString(jumpEnabled)));
		jumpHeight = parse(props, "jumpHeight", jumpHeight);
		dashPower = parse(props, "dashPower", dashPower);
		launchPower = parse(props, "launchPower", launchPower);
	}

	public static void save() {
		Properties props = new Properties();
		props.setProperty("jumpEnabled", Boolean.toString(jumpEnabled));
		props.setProperty("jumpHeight", Double.toString(jumpHeight));
		props.setProperty("dashPower", Double.toString(dashPower));
		props.setProperty("launchPower", Double.toString(launchPower));

		try (Writer writer = Files.newBufferedWriter(path())) {
			props.store(writer, "Velocity & Jump settings");
		} catch (IOException e) {
			VelocityJumpClient.LOGGER.warn("Failed to save {}", path(), e);
		}
	}

	private static double parse(Properties props, String key, double fallback) {
		try {
			return Double.parseDouble(props.getProperty(key, Double.toString(fallback)));
		} catch (NumberFormatException e) {
			return fallback;
		}
	}
}
