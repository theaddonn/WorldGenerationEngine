import { world, Vector3, Dimension } from "@minecraft/server";

import { WorldGenBlockType, WorldGenBlockTypes } from "./block";
import { PerlinNoise2D, PerlinNoise3D } from "./noise";
import { Vector3ToString } from "./Vec";
import { ChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { chunkNoiseProvider } from "./ChunkNoiseProvider";

const NOISE_FREQUENCY = 0.02;
const NOISE_AMPLITUDE = SUBCHUNK_SIZE * 2 * 2;
const NOISE_BASE_HEIGHT = 40;