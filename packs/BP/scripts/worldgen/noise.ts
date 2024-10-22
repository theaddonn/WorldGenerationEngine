import { world } from "@minecraft/server";
import Noise from "noise-ts";

const seed = 0x80081E5 + 0xA55;
const noise = new Noise(seed);

const moistureSeed = 0x3217893 + 0x2000;
const moistureNoise = new Noise(moistureSeed);

const climateSeed = 0x0948605+ 0x21908370a;
const climateNoise = new Noise(climateSeed);

const tieSeed = 0x321DDDE+ 0xEEE1239a;
const tieNoise = new Noise(tieSeed);

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

function PerlinNoise2DRaw(
    x: number,
    y: number,
    amplitude: number,
    frequency: number,
    octaveCount: number,
    persistence: number,
    lacunarity: number,
    rawAmplitude: number,
    perlinCaller: Noise,
    perlinSeed: number 
): number[] {
    let value = 0;
    let raw = 0;
    for (let i = 0; i < octaveCount; i++) {
        let offset = +(perlinSeed * i);
        const trueNoise = perlinCaller.perlin2(x * frequency + offset, y * frequency + offset); 
        raw += rawAmplitude * trueNoise;
        value += amplitude * trueNoise;
        amplitude *= persistence;
        frequency *= lacunarity;
        rawAmplitude *= persistence;
    }
    return [value, raw];
}
export function PerlinNoise2D(
    x: number,
    y: number,
    amplitude: number,
    frequency: number,
    octaveCount: number,
    persistence: number,
    lacunarity: number,
    rawAmplitude: number,
): number[] {
    return PerlinNoise2DRaw(x, y, amplitude, frequency, octaveCount, persistence, lacunarity, rawAmplitude, noise, seed);
}

export function singlePerlin2D(x: number, y: number, freq: number, coreOffset?: number) {
    const offset = +(seed * (coreOffset ?? 200));
    return (noise.perlin2(x * freq + offset, y * freq + offset) + 1) / 2;
}
export function pollMoistureNoise2D(x: number, y: number, freq: number) {
    return PerlinNoise2DRaw(x, y, 0, freq, 2, 0.6, 1.8, 0.9, moistureNoise, moistureSeed)[1];
}

export function pollClimateNoise2D(x: number, y: number, freq: number) {
    return PerlinNoise2DRaw(x, y, 0, freq, 3, 0.6, 1.8, 0.9, climateNoise, climateSeed)[1];
}
export function pollTieNoise2D(x: number, y: number, freq: number) {
    return (tieNoise.perlin2(x * freq, y * freq) + 1) / 2
}



