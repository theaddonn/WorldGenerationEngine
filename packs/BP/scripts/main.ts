import { Player, system, Vector3, world } from "@minecraft/server";
import { managePlayer, visitedChunks, workingChunks } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { configure} from "./worldgen/config";
import { chunkNoiseProvider } from "./worldgen/ChunkNoiseProvider";
import { manageDebugPlayer } from "./worldgen/debug";
import { ChunkPosition } from "./worldgen/chunk";
import { runJob } from "./job";
import { Vec2 } from "./worldgen/Vec";
import { initLimits, performCacheCleanup } from "./worldgen/cache";

export let mainLocation: Vector3;
let dim = world.getDimension("overworld");

registerBiomes();
initLimits();




system.afterEvents.scriptEventReceive.subscribe((event) => {
    switch (event.id) {
        case "wge:config": {
            configure(event.sourceEntity as Player).then(() => {});
            break;
        }
        case "wge:cache": {
            const location = dim.getPlayers()[0].location;
            const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z)); 
            runJob(chunkNoiseProvider.dropUselessInfo(start, 0.5));
            break;
        }
        case "wge:dropcache": {
            const location = dim.getPlayers()[0].location;
            const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z)); 
            runJob(chunkNoiseProvider.dropUselessInfo(start, 0.0));
            visitedChunks.clear();
            workingChunks.clear();
            break;
        }
    }
})

system.beforeEvents.watchdogTerminate.subscribe((arg) => {
    console.warn(`Cancled watchdog terminate! ${arg.terminateReason}`);
    arg.cancel = true;
})

system.runInterval(() => {
    dim.getPlayers().forEach((player) => {
        mainLocation = player.location;
        managePlayer(player, dim);
        manageDebugPlayer(player, dim);
    });
    performCacheCleanup();
}, 0);
