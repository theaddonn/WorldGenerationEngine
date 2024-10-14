import { system, world, ScriptEventCommandMessageAfterEvent } from "@minecraft/server";
import { generate } from "./worldgen/subchunk";
import { cleanUp } from "./worldgen/cleanup";

const job_ids: number[] = [];

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

function generateEvent() {
  var id = system.runJob(
    generate({ x: -128, y: -64, z: -128 }, { x: 128, y: 320, z: 128 }, world.getDimension("overworld"))
  );
  job_ids.push(id);
}

function clearEvent() {
  var id = system.runJob(
    cleanUp({ x: -128, y: -64, z: -128 }, { x: 128, y: 320, z: 128 }, world.getDimension("overworld"))
  );
  job_ids.push(id);
}

function clearJobsEvent() {
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Started cancelling jobs...`);
  for (const job_id of job_ids) {
    system.clearJob(job_id);
  }
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Finished cancelling jobs!`);
}
