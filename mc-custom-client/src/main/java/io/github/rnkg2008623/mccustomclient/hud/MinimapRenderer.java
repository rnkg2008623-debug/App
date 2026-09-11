package io.github.rnkg2008623.mccustomclient.hud;

import com.mojang.blaze3d.platform.NativeImage;
import io.github.rnkg2008623.mccustomclient.MyCustomClient;
import net.minecraft.block.BlockState;
import net.minecraft.block.MapColor;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.render.RenderTickCounter;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.Heightmap;
import net.minecraft.world.chunk.Chunk;
import net.minecraft.world.chunk.ChunkStatus;

/**
 * 画面右上に表示する簡易ミニマップ。
 *
 * 一定tickごとに自分の周囲のブロックを上から見た色（MapColorベース）でテクスチャに
 * 焼き込み、毎フレームはそのテクスチャを描画するだけにすることで負荷を抑えている。
 * 北が上に固定の簡易版（プレイヤーの向きに合わせた回転は行わない）。
 */
public final class MinimapRenderer {

    /** 1辺あたりのブロック数（＝テクスチャの1辺のピクセル数）。中心がプレイヤー位置。 */
    private static final int MAP_SIZE = 100;
    private static final int RADIUS = MAP_SIZE / 2;

    /** 画面上での表示サイズ(px)。MAP_SIZEと同じにして等倍で描画する。 */
    private static final int DISPLAY_SIZE = MAP_SIZE;

    private static final int MARGIN = 8;
    private static final int BORDER_COLOR = 0xFFFFFFFF;
    private static final int BACKGROUND_COLOR = 0xAA000000;
    private static final int UNKNOWN_COLOR = 0xFF202020;
    private static final int PLAYER_MARKER_COLOR = 0xFFFF3030;

    /** テクスチャの更新間隔(tick)。20tick=1秒。負荷軽減のため毎tickは更新しない。 */
    private static final int UPDATE_INTERVAL_TICKS = 10;

    private static final Identifier TEXTURE_ID = Identifier.of(MyCustomClient.MOD_ID, "minimap_dynamic");

    private NativeImageBackedTexture texture;
    private int tickCounter = UPDATE_INTERVAL_TICKS;

    public void onEndTick(MinecraftClient client) {
        if (client.player == null || client.world == null) {
            return;
        }

        tickCounter++;
        if (tickCounter < UPDATE_INTERVAL_TICKS) {
            return;
        }
        tickCounter = 0;

        updateTexture(client);
    }

    public void render(DrawContext context, RenderTickCounter tickCounterInfo) {
        if (texture == null) {
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        int screenWidth = client.getWindow().getScaledWidth();

        int x = screenWidth - DISPLAY_SIZE - MARGIN;
        int y = MARGIN;

        context.fill(x - 2, y - 2, x + DISPLAY_SIZE + 2, y + DISPLAY_SIZE + 2, BACKGROUND_COLOR);
        context.drawTexture(TEXTURE_ID, x, y, 0, 0, DISPLAY_SIZE, DISPLAY_SIZE, MAP_SIZE, MAP_SIZE);
        context.drawBorder(x - 2, y - 2, DISPLAY_SIZE + 4, DISPLAY_SIZE + 4, BORDER_COLOR);

        // 中心＝自分の現在地
        int centerX = x + DISPLAY_SIZE / 2;
        int centerY = y + DISPLAY_SIZE / 2;
        context.fill(centerX - 2, centerY - 2, centerX + 2, centerY + 2, PLAYER_MARKER_COLOR);

        context.drawText(client.textRenderer, "N", x + DISPLAY_SIZE / 2 - 3, y - 10, 0xFFFFFFFF, true);
    }

    private void ensureTexture() {
        if (texture == null) {
            NativeImage image = new NativeImage(MAP_SIZE, MAP_SIZE, false);
            texture = new NativeImageBackedTexture(image);
            MinecraftClient.getInstance().getTextureManager().registerTexture(TEXTURE_ID, texture);
        }
    }

    private void updateTexture(MinecraftClient client) {
        ensureTexture();

        ClientWorld world = client.world;
        BlockPos playerPos = client.player.getBlockPos();
        NativeImage image = texture.getImage();
        if (world == null || image == null) {
            return;
        }

        for (int pz = 0; pz < MAP_SIZE; pz++) {
            int worldZ = playerPos.getZ() - RADIUS + pz;
            for (int px = 0; px < MAP_SIZE; px++) {
                int worldX = playerPos.getX() - RADIUS + px;
                image.setColor(px, pz, samplePixelColor(world, worldX, worldZ));
            }
        }

        texture.upload();
    }

    private int samplePixelColor(ClientWorld world, int worldX, int worldZ) {
        int height = surfaceHeight(world, worldX, worldZ);
        if (height == Integer.MIN_VALUE) {
            return UNKNOWN_COLOR;
        }

        int northHeight = surfaceHeight(world, worldX, worldZ - 1);
        int brightnessLevel = 1;
        if (northHeight != Integer.MIN_VALUE) {
            if (height > northHeight) {
                brightnessLevel = 2;
            } else if (height < northHeight) {
                brightnessLevel = 0;
            }
        }

        BlockPos surfacePos = new BlockPos(worldX, height - 1, worldZ);
        BlockState state = world.getBlockState(surfacePos);
        MapColor mapColor = state.getMapColor(world, surfacePos);
        if (mapColor == MapColor.CLEAR) {
            return UNKNOWN_COLOR;
        }

        return shade(mapColor.color, brightnessLevel);
    }

    /**
     * 高さの比較結果(0=低い,1=同じ,2=高い)に応じて明るさを変え、
     * バニラの地図のような簡易的な陰影をつける。
     */
    private int shade(int rgb, int brightnessLevel) {
        float factor = switch (brightnessLevel) {
            case 0 -> 0.75f;
            case 2 -> 1.2f;
            default -> 1.0f;
        };

        int r = clampChannel(Math.round(((rgb >> 16) & 0xFF) * factor));
        int g = clampChannel(Math.round(((rgb >> 8) & 0xFF) * factor));
        int b = clampChannel(Math.round((rgb & 0xFF) * factor));

        return 0xFF000000 | (r << 16) | (g << 8) | b;
    }

    private int clampChannel(int value) {
        return Math.max(0, Math.min(255, value));
    }

    /**
     * (x, z) の地表(最初の非空気ブロック)のY座標+1を返す。
     * チャンク未読み込みの場合は Integer.MIN_VALUE を返し、無駄なチャンク読み込みを避ける。
     */
    private int surfaceHeight(ClientWorld world, int x, int z) {
        Chunk chunk = world.getChunk(x >> 4, z >> 4, ChunkStatus.FULL, false);
        if (chunk == null) {
            return Integer.MIN_VALUE;
        }
        return world.getTopY(Heightmap.Type.WORLD_SURFACE, x, z);
    }
}
