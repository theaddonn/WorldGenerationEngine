import { Dimension, Player } from "@minecraft/server";
import { chunkNoiseProvider } from "./ChunkNoiseProvider";
import { Vec2, Vector2ToString } from "./Vec";
import { mainLocation } from "../main";
import { ChunkPosition } from "./chunk";



class DebugRendering {
    private lineList: String[];
    private variableList: Map<string, any>;

    constructor() {this.lineList = []; this.variableList = new Map();}

    update(key: string, val: any): DebugRendering {
        this.variableList.set(`${key}:`, val);
        return this;
    }

    line(fullLine: string): DebugRendering {
        this.lineList.push(fullLine)
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
export let showCacheSizes = true;
export function RenderDebug(val?: boolean) {
    if (val === undefined) {
        renderDebug = !renderDebug; 
    }
    renderDebug = val!;
}

export function ShowCacheSizes(show: boolean) {
    showCacheSizes = show;
}
export function manageDebugPlayer(player: Player, dim: Dimension) {
    if (renderDebug) {
        debug.update("Location", `x: ${Math.floor(mainLocation.x)}, y: ${Math.floor(mainLocation.y)}, z: ${Math.floor(mainLocation.z)}`)
            .update("Chunk Position", Vector2ToString(ChunkPosition.fromWorld(new Vec2(mainLocation.x, mainLocation.z))))
            .update("Climate", `${chunkNoiseProvider.getClimateNoiseFull(mainLocation)}`)
            .update("Tie Breaker", `${chunkNoiseProvider.getTieBreakerNoiseFull(mainLocation)}`)
            .update("Moisture", `${chunkNoiseProvider.getMoistureNoiseFull(mainLocation)}`);
        if (showCacheSizes) {
            debug.update("World Cache Size", chunkNoiseProvider.chunkHeightmap.size)
                .update("Climate Cache Size", chunkNoiseProvider.climateCache.size)
                .update("Tie Breaker Cache Size", chunkNoiseProvider.tieCache.size)
                .update("Moisture Cache Size", chunkNoiseProvider.moistureCache.size)
                .update("Total Cache Size", chunkNoiseProvider.chunkHeightmap.size + chunkNoiseProvider.climateCache.size + chunkNoiseProvider.tieCache.size + chunkNoiseProvider.moistureCache.size)
        }

        dim.runCommandAsync(`titleraw ${player.name} clear`);
        dim.runCommandAsync(`titleraw ${player.name} actionbar {"rawtext":[{"text": "${debug.build()}"}]}`);
    }
}


export let debug = new DebugRendering();