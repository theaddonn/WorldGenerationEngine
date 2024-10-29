import Noise from "noise-ts";
import { NumberInputConfig, SliderConfig, terrainConfig } from "./config";

let seed = 0x12321;
let noise = new Noise(seed);

let moistureSeed = 0x32117893;
let moistureNoise = new Noise(moistureSeed);

let climateSeed = 0x09148605;
let climateNoise = new Noise(climateSeed);

let tieSeed = 0x3211ddde;
let tieNoise = new Noise(tieSeed);

export function initNoiseConfig() {
    terrainConfig.addConfigOption(
        "Terrain Shape Seed",
        new NumberInputConfig(
            () => {return seed;},
            (val) => {
                seed = val;
                noise = new Noise(seed);
            }
        )
    ).addConfigOption(
        "Moisture Noise Seed",
        new NumberInputConfig(
            () => {return moistureSeed;},
            (val) => {
                moistureSeed = val;
                moistureNoise = new Noise(seed);
            }
        )
    ).addConfigOption(
        "Climate Noise Seed",
        new NumberInputConfig(
            () => {return climateSeed;},
            (val) => {
                climateSeed = val;
                climateNoise = new Noise(climateSeed);
            }
        )
    ).addConfigOption(
        "Tie Noise Seed",
        new NumberInputConfig(
            () => {return tieSeed;},
            (val) => {
                tieSeed = val;
                tieNoise = new Noise(tieSeed);
            }
        )
    )
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
    rawAmplitude: number
): number[] {
    return PerlinNoise2DRaw(
        x,
        y,
        amplitude,
        frequency,
        octaveCount,
        persistence,
        lacunarity,
        rawAmplitude,
        noise,
        seed
    );
}

export function singlePerlin2D(x: number, y: number, freq: number, coreOffset?: number) {
    const offset = +(seed * (coreOffset ?? 200));
    return (noise.perlin2(x * freq + offset, y * freq + offset) + 1) / 2;
}
export function pollMoistureNoise2D(x: number, y: number, freq: number) {
    return (moistureNoise.perlin2(-x * freq, -y * freq) + 1) / 2;
}

export function pollClimateNoise2D(x: number, y: number, freq: number) {
    return (PerlinNoise2DRaw(x, y, 0, freq, 2, 0.6, 1.8, 0.9, climateNoise, climateSeed)[1] + 1) / 2;
}
export function pollTieNoise2D(x: number, y: number, freq: number) {
    return (tieNoise.perlin2(x * freq, y * freq) + 1) / 2;
}
