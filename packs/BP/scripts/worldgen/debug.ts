import { Dimension, Player } from "@minecraft/server";
import { chunkNoiseProvider } from "./chunkNoiseProvider";
import { Vec2, Vector2ToString } from "./vec";
import { mainLocation } from "../main";
import { ChunkPosition } from "./chunk";
import { CacheClearLimit } from "./cache";
import { terrainConfig, ToggleConfig } from "./config";
import { biomeManager } from "./biome";
import { renderRandomDebug } from "./random";

class DebugRendering {
    private lineList: String[];
    private variableList: Map<string, any>;

    constructor() {
        this.lineList = [];
        this.variableList = new Map();
    }

    update(key: string, val: any): DebugRendering {
        this.variableList.set(`${key}:`, val);
        return this;
    }

    line(fullLine: string): DebugRendering {
        this.lineList.push(fullLine);
        return this;
    }

    build(): string {
        let returnStr = "";

        for (const str of this.lineList) {
            returnStr += `${str}\n`;
        }

        for (const [name, value] of this.variableList) {
            returnStr += `${name} ${value}\n`;
        }
        this.lineList.length = 0;
        this.variableList.clear();
        return returnStr;
    }
}

export let renderDebug = true;
export let showCacheSizes = false;
export let showBiomeStack = true;
export let showNoise = false;

export function initDebugConfig() {
    terrainConfig
        .addConfigOption(
            "Enable Debug HUD",
            new ToggleConfig(
                () => {
                    return renderDebug;
                },
                (val) => (renderDebug = val)
            )
        )
        .addConfigOption(
            "Enable Cache Information In Debug",
            new ToggleConfig(
                () => {
                    return showCacheSizes;
                },
                (val) => (showCacheSizes = val)
            )
        )
        .addConfigOption(
            "Enable Biome Selection Information",
            new ToggleConfig(
                () => {
                    return showBiomeStack;
                },
                (val) => (showBiomeStack = val)
            )
        )
        .addConfigOption(
            "Enable Biome Noise Information",
            new ToggleConfig(
                () => {
                    return showNoise;
                },
                (val) => (showNoise = val)
            )
        );
}

export function manageDebugPlayer(player: Player, dim: Dimension) {
    if (renderDebug) {
        debug
            .update(
                "Location",
                `x: ${Math.floor(mainLocation.x)}, y: ${Math.floor(mainLocation.y)}, z: ${Math.floor(mainLocation.z)}`
            )
            .update(
                "Chunk Position",
                Vector2ToString(ChunkPosition.fromWorld(new Vec2(mainLocation.x, mainLocation.z)))
            );
        renderRandomDebug();

        if (showCacheSizes) {
            debug
                .update("World Cache Size", chunkNoiseProvider.chunkHeightmap.size)
                .update("Climate Cache Size", chunkNoiseProvider.climateCache.size)
                .update("Tie Breaker Cache Size", chunkNoiseProvider.tieCache.size)
                .update("Moisture Cache Size", chunkNoiseProvider.moistureCache.size)
                .update("Total Cache Size", `${chunkNoiseProvider.getTotalCacheSize()} Out Of ${CacheClearLimit}`);
        }

        if (showNoise) {
            debug
                .update("Climate", `${chunkNoiseProvider.getClimateNoiseFull(mainLocation)}`)
                .update("Tie Breaker", `${chunkNoiseProvider.getTieBreakerNoiseFull(mainLocation)}`)
                .update("Moisture", `${chunkNoiseProvider.getMoistureNoiseFull(mainLocation)}`)
                .update("Height", `${chunkNoiseProvider.getHeightNoiseFull(mainLocation)}`);
        }
        
        if (showBiomeStack) {
            biomeManager.getBiomeIndexNew(
                chunkNoiseProvider.getClimateNoiseFull(mainLocation),
                chunkNoiseProvider.getHeightNoiseFull(mainLocation),
                chunkNoiseProvider.getTieBreakerNoiseFull(mainLocation),
                chunkNoiseProvider.getMoistureNoiseFull(mainLocation),
                true
            );
        }

        dim.runCommandAsync(`titleraw ${player.name} clear`);
        dim.runCommandAsync(`titleraw ${player.name} actionbar {"rawtext":[{"text": "${debug.build()}"}]}`);
    }
}

export let debug = new DebugRendering();
