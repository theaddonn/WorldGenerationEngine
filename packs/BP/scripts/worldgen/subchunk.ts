import { world, Vector3, Dimension } from "@minecraft/server";

import { WorldGenBlockType, WorldGenBlockTypes } from "./block";
import { PerlinNoise2D, PerlinNoise3D } from "./noise";
import { Vector3ToString } from "./Vec";
import { SUBCHUNK_SIZE } from "./chunk";

const NOISE_FREQUENCY = 0.02;
const NOISE_AMPLITUDE = SUBCHUNK_SIZE * 2 * 2;
const NOISE_BASE_HEIGHT = 20;

/// Generate a SubChunk at the given SubChunk position
export function* generate(start: Vector3, end: Vector3, dimension: Dimension) {
  for (let y = start.y; y < end.y; y++) {
  for (let x = start.x; x < end.x; x++) {
        for (let z = start.z; z < end.z; z++) {
        let pos = { x, y, z };

        let block = getBlock(pos);
        
        if (block != null) {
          try {
            dimension.setBlockType(pos, WorldGenBlockTypes[block]);
          } catch {
          }
        }
      }
    }
    yield;
  }

}
function getBlock(location: Vector3): WorldGenBlockType | void {
  let noise = (PerlinNoise2D(location.x, location.z, 40, 0.0075, 6, 0.5, 1.8) + 1) / 2 ;
  let noise3D = PerlinNoise3D(location.x, location.y, location.z, 60, 0.0009, 1, 0.5, 1.8);
  let h_noise = noise + NOISE_BASE_HEIGHT;


  if (h_noise >= location.y) {
    if (noise3D < 0.1 && noise3D > -0.9) {
      return;
    } else if (noise3D < 0.1 && noise3D > -0.9) {
      
      return WorldGenBlockType.Air;
    }
  }


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
}
