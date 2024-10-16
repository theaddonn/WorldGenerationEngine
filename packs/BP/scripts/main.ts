import { system, world } from "@minecraft/server";
import { managePlayer } from "./worldgen/generation";

system.runInterval(() => {
  let dim = world.getDimension("overworld");
  dim.getPlayers().forEach((player) => {
    managePlayer(player, dim);
  })
}, 0);