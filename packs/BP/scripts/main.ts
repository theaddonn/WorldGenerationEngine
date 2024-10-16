import { system, world } from "@minecraft/server";
import { cleanUp } from "./worldgen/cleanup";
import { clearJobs, runJob } from "./job";
import { PerlinNoise3D } from "./worldgen/noise";
import { managePlayer } from "./worldgen/generation";

system.runInterval(() => {
  let dim = world.getDimension("overworld");
  dim.getPlayers().forEach((player) => {
    managePlayer(player, dim);
  })
}, 0);