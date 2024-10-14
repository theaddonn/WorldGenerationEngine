import { world, Vector3, Dimension } from "@minecraft/server";

import { WorldGenBlockType, WorldGenBlockTypes } from "./block";
import { PerlinNoise2D } from "./noise";

const NOISE_FREQUENCY = 0.02;
const NOISE_AMPLITUDE = 16 * 2 * 2;
const NOISE_BASE_HEIGHT = 64;

/// Generate a SubChunk at the given SubChunk position
export function* generate(start: Vector3, end: Vector3, dimension: Dimension) {
  world.sendMessage(`[§aWGE§r] [§3INFO§r] Started generating area...`);

  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {
      for (let z = start.z; z < end.z; z++) {
        let pos = { x, y, z };

        let block = getBlock(pos);

        if (block != null) {
          try {
            dimension.setBlockType(pos, WorldGenBlockTypes[block]);
          } catch {}
        }
      }
    }
    if (x % 5 == 0) {
      yield;
    }
  }

  world.sendMessage(`[§aWGE§r] [§3INFO§r] Finished generating area!`);
}

function getBlock(location: Vector3): WorldGenBlockType | void {
  let noise = PerlinNoise2D(location.x, location.z, 40, 0.0075, 6, 0.5, 1.8);
  let h_noise = noise + 1 + NOISE_BASE_HEIGHT;

  if (h_noise - 64 > location.y) {
    return WorldGenBlockType.Deepslate;
  }

  if (h_noise - 8 > location.y) {
    return WorldGenBlockType.Stone;
  }

  if (h_noise - 1 > location.y) {
    return WorldGenBlockType.Dirt;
  }

  if (h_noise > location.y) {
    return WorldGenBlockType.Grass;
  }

  if (h_noise + 1 > location.y) {
    if (Math.random() > 0.5) {
      return WorldGenBlockType.GrassShort;
    }
  }
}
