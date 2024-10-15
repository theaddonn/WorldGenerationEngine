import { system, world } from "@minecraft/server";
import { generate } from "./worldgen/subchunk";
import { cleanUp } from "./worldgen/cleanup";
import { clearJobs, runJob } from "./job";
import { handlePlayer } from "./worldgen/chunk";


system.afterEvents.scriptEventReceive.subscribe((event) => {
  
  switch (event.id) {
    

    case "wge:generate":
      clearJobsEvent();
      generateEvent();
      break;
    case "wge:clear":
      clearJobsEvent();
      clearEvent();
      break;
    case "wge:clear_jobs":
      clearJobsEvent();
      break;
    default:
      if (event.id.startsWith("wge:")) {
        world.sendMessage(`Unknown ScriptEvent ${event.id}`);
      }
      break;
  }
});
system.beforeEvents.watchdogTerminate.subscribe((ev) => {
  ///Do whatever
  ev.cancel = true
  });
function generateEvent() {
  runJob(
    generate({ x: -16, y: -32, z: -16 }, { x: 16, y: 32, z: 16 }, world.getDimension("overworld"))
  );
}

function clearEvent() {
    runJob(cleanUp({ x: -16, y: -32, z: -16 }, { x: 16, y: 32, z: 16 }, world.getDimension("overworld")));
}

function clearJobsEvent() {
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Started cancelling jobs...`);
  clearJobs();
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Finished cancelling jobs!`);
}





system.runInterval(() => {
  let dim = world.getDimension("overworld");
  dim.getPlayers().forEach((player) => {
    handlePlayer(player, dim);
  })
}, 0);