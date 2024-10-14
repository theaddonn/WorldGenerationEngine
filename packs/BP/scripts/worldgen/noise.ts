import Noise from "noise-ts";

const seed = 420 + 69;
const noise = new Noise(seed);

let perlinNoise2DCache = new Map();
let perlinNoise3DCache = new Map();
let simplexNoise2DCache = new Map();
let simplexNoise3DCache = new Map();

export function PerlinNoise2D(
  x: number,
  y: number,
  amplitude: number,
  frequency: number,
  octaveCount: number,
  persistence: number,
  lacunarity: number
) {
  let key = {x, y, amplitude, frequency, octaveCount, persistence, lacunarity};
  let cache = perlinNoise2DCache.get(key);

  if (cache !== null) {
    return cache;
  } 

  let value = 0;

  for (let i = 0; i < octaveCount; i++) {
    let offset = +(seed * i);
    value += amplitude * noise.perlin2(x * frequency + offset, y * frequency + offset);
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  perlinNoise2DCache.set(key, value)

  return value;
}

export function PerlinNoise3D(
  x: number,
  y: number,
  z: number,
  amplitude: number,
  frequency: number,
  octaveCount: number,
  persistence: number,
  lacunarity: number
) {
  let value = 0;

  for (let i = 0; i < octaveCount; i++) {
    let offset = +(seed * i);
    value += amplitude * noise.perlin3(x * frequency + offset, y * frequency + offset, z * frequency + offset);
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value;
}

export function SimplexNoise2D(
  x: number,
  y: number,
  amplitude: number,
  frequency: number,
  octaveCount: number,
  persistence: number,
  lacunarity: number
) {
  let value = 0;

  for (let i = 0; i < octaveCount; i++) {
    let offset = +(seed * i);
    value += amplitude * noise.simplex2(x * frequency + offset, y * frequency + offset);
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value;
}

export function SimplexNoise3D(
  x: number,
  y: number,
  z: number,
  amplitude: number,
  frequency: number,
  octaveCount: number,
  persistence: number,
  lacunarity: number
) {
  let value = 0;

  for (let i = 0; i < octaveCount; i++) {
    let offset = +(seed * i);
    value += amplitude * noise.simplex3(x * frequency + offset, y * frequency + offset, z * frequency + offset);
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value;
}
