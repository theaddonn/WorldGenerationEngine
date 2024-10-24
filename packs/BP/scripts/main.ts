import { Player, system, Vector3, world } from "@minecraft/server";
import { managePlayer, visitedChunks, workingChunks } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { configure} from "./worldgen/config";
import { chunkNoiseProvider } from "./worldgen/ChunkNoiseProvider";
import { debug, manageDebugPlayer } from "./worldgen/debug";
import { ChunkPosition } from "./worldgen/chunk";
import { runJob } from "./job";
import { Vec2, Vector2ToString } from "./worldgen/Vec";


registerBiomes();


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
        manageDebugPlayer(player, dim);
    });
}, 0);
