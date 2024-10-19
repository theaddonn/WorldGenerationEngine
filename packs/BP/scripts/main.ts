import { system, Vector3, world } from "@minecraft/server";
import { managePlayer } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";


registerBiomes();

export let mainLocation: Vector3;


system.runInterval(() => {
    let dim = world.getDimension("overworld");
    dim.getPlayers().forEach((player) => {
        mainLocation = player.location;
        managePlayer(player, dim);
    });
}, 0);
