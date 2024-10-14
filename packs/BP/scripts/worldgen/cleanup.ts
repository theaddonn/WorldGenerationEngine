import { Dimension, Vector3, world } from "@minecraft/server";

export function* cleanUp(start: Vector3, end: Vector3, dimension: Dimension) {
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Started cleaning area...`);

  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {
      for (let z = start.z; z < end.z; z++) {
        let pos = { x, y, z };

        try {
          dimension.setBlockType(pos, "air");
        } catch {}
      }
    }
    if (x % 5 == 0) {
      yield;
    }
  }

  world.sendMessage(`[§aWGE§r] [§3INFO§r] Finished cleaning area!`);
}
