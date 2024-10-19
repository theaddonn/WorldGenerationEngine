import { world, Vector3, Dimension } from "@minecraft/server";

import { WorldGenBlockType, WorldGenBlockTypes } from "./block";
import { PerlinNoise2D } from "./noise";

const NOISE_FREQUENCY = 0.02;
const NOISE_AMPLITUDE = 16 * 2 * 2;
const NOISE_BASE_HEIGHT = 64;


