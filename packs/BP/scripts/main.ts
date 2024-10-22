import { Player, system, Vector3, world } from "@minecraft/server";
import { managePlayer } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { configure} from "./worldgen/config";


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
    });
}, 0);
