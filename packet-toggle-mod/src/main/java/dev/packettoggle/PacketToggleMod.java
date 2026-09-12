package dev.packettoggle;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class PacketToggleMod implements ModInitializer {
	public static final String MOD_ID = "packettoggle";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		LOGGER.info("PacketToggle mod loaded (client-only network testing tool)");
	}
}
