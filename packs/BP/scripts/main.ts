import { Player, system, Vector3, world } from "@minecraft/server";
import { managePlayer } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { configure} from "./worldgen/config";
import { chunkNoiseProvider } from "./worldgen/ChunkNoiseProvider";
import { debug } from "./worldgen/debug";


registerBiomes();

export let mainLocation: Vector3;

system.afterEvents.scriptEventReceive.subscribe((event) => {
    switch (event.id) {
        case "wge:config": {
            configure(event.sourceEntity as Player).then(() => {world.sendMessage("Updated Configuration!")});
        }
    }
})


system.runInterval(() => {
    let dim = world.getDimension("overworld");
    dim.getPlayers().forEach((player) => {
        mainLocation = player.location;
        managePlayer(player, dim);
        debug.update("Location", `x: ${Math.floor(mainLocation.x)}, y: ${Math.floor(mainLocation.y)}, z: ${Math.floor(mainLocation.z)}`)
            .update("Climate", `${chunkNoiseProvider.getClimateNoiseFull(mainLocation)}`)
            .update("Tie Breaker", `${chunkNoiseProvider.getTieBreakerNoiseFull(mainLocation)}`)
            .update("Moisture", `${chunkNoiseProvider.getMoistureNoiseFull(mainLocation)}`);


        dim.runCommandAsync(`titleraw ${player.name} clear`);
        dim.runCommandAsync(`titleraw ${player.name} actionbar {"rawtext":[{"text": "${debug.build()}"}]}`);
    });
}, 0);
