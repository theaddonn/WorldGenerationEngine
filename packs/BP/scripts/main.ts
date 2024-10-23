import { Player, system, Vector3, world } from "@minecraft/server";
import { managePlayer, visitedChunks, workingChunks } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { configure} from "./worldgen/config";
import { chunkNoiseProvider } from "./worldgen/ChunkNoiseProvider";
import { debug } from "./worldgen/debug";
import { ChunkPosition } from "./worldgen/chunk";
import { runJob } from "./job";
import { Vec2, Vector2ToString } from "./worldgen/Vec";


registerBiomes();

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

let dim = world.getDimension("overworld");

export let mainLocation: Vector3;

system.afterEvents.scriptEventReceive.subscribe((event) => {
    switch (event.id) {
        case "wge:config": {
            configure(event.sourceEntity as Player).then(() => {world.sendMessage("Updated Configuration!")});
            break;
        }
        case "wge:cache": {
            const location = dim.getPlayers()[0].location;
            const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z)); 
            runJob(chunkNoiseProvider.dropUselessInfo(start, 0.5, dim));
            break;
        }
        case "wge:dropcache": {
            const location = dim.getPlayers()[0].location;
            const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z)); 
            runJob(chunkNoiseProvider.dropUselessInfo(start, 0.0, dim));
            visitedChunks.clear();
            workingChunks.clear();
            break;
        }
    }
})


system.runInterval(() => {
    dim.getPlayers().forEach((player) => {
        mainLocation = player.location;
        managePlayer(player, dim);
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

    });
}, 0);
