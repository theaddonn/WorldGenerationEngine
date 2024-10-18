import { world } from "@minecraft/server";
import Noise from "noise-ts";

const seed = 420 + 69;
const noise = new Noise(seed);

let perlinNoise2DCache = new Map();
let perlinNoise3DCache = new Map();
let simplexNoise2DCache = new Map();
let simplexNoise3DCache = new Map();

function hashStr(str: string) {
    var hash = 0,
        i,
        chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function PerlinNoise2D(
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
        value += amplitude * noise.perlin2(x * frequency + offset, y * frequency + offset);
        amplitude *= persistence;
        frequency *= lacunarity;
    }
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
