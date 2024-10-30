import { Dimension, world } from "@minecraft/server";
import { clamp, throwError } from "./util";
import { Vec3 } from "./Vec";
import { HEIGHT_MAX } from "./ChunkNoiseProvider";
import { debug } from "./debug";
import { FloatSliderConfig, terrainConfig } from "./config";

export enum ClimateSelections {

    COLD = 0.3,
    NORMAL = 0.5,
    WARM = 0.75,
    BOILING = 1.0,
    DONT_CARE = 0.0,
}
export enum MoistureSelections {
    Soaking = 0,
    Wet = 0.4,
    Normal = .5,
    Dry = 0.7,
    None = 1
};


export enum HeightBias {
    LOW = 0.3, // Means it must be between the bottom of the noise and 1 third the way up the terrain
    NORMAL = 0.56, // Means it must be between the bottom third and the top 6th
    HIGH = 0.66, // Means it must be between the top 6th and the top of the noise
    REALLY_HIGH = 1,
}

export abstract class Biome {
    id: String;
    surfaceBlock: string;
    underGround: string;
    caveBlock: string;
    weight?: number;
    surfaceNeedsSupport: boolean;
    multiLayerSurface: boolean;
    surfaceDepth: number;
    heightBias: HeightBias;
    tempBias: number;
    moistureBias: number;

    abstract decorate(pos: Vec3, dim: Dimension): void;
}


let heightWeight = 1.0;
let tempWeight = 1.1;
let moistureWeight = 1.1;

let errMargin = 0.00001;
export function initBiomeConfig() {
    terrainConfig.addConfigOption(
        "Height Bias",
        new FloatSliderConfig(
            0.,
            10,
            0.1,
            10,
            () => {return heightWeight;},
            (val) => heightWeight = val
        )
    ).addConfigOption(
        "Temp Bias",
        new FloatSliderConfig(
            0.,
            10,
            0.1,
            10,
            () => {return tempWeight;},
            (val) => tempWeight = val
        )
    ).addConfigOption(
        "Moisture Bias",
        new FloatSliderConfig(
            0.,
            10,
            0.1,
            10,
            () => {return moistureWeight;},
            (val) => moistureWeight = val
        )
    ).addConfigOption(
        "Biome Error Margine",
        new FloatSliderConfig(
            0.00001,
            0.1,
            0.00002,
            100_000,
            () => {return errMargin;},
            (val) => errMargin = Math.round(val)
        )
    );
}


class BiomeList {
    private biomes: Biome[];

    constructor() {
        this.biomes = new Array();
    }

    biomeCount(): number {
        return this.biomes.length;
    }

    allbiomes(): readonly Biome[] {
        return this.biomes;
    }

    getBiome(index: number): Biome {
        return this.biomes.at(index) ?? throwError(new Error(`Invalid biome index ${index}`));
    }

    addBiome(biome: Biome) {
        this.biomes.push(biome);
    }

    private getHeight(raw: number): HeightBias {
        if (raw <= HEIGHT_MAX * HeightBias.LOW) {
            return HeightBias.LOW;
        } else if (raw <= HEIGHT_MAX * HeightBias.NORMAL) {
            return HeightBias.NORMAL;
        } else if (raw <= HEIGHT_MAX * HeightBias.HIGH) {
            return HeightBias.HIGH;
        } else {
            return HeightBias.REALLY_HIGH;
        }
    }

    getBiomeIndexNew(climate: number, height: number, tieBreaker: number, moisture: number, renderDebug?: boolean): number {
        const currentHeight = this.getHeight(height);
        tieBreaker = clamp(tieBreaker, 0, 1);

        let possibleBiomes = this.getFilteredBiomes(climate, currentHeight, moisture, renderDebug);
        if (renderDebug!== undefined && renderDebug) {
                debug.update(`Total Possible Biomes`, possibleBiomes.length);
        }
        if (possibleBiomes.length === 1) {
            return possibleBiomes[0];
        }

        const selected = Math.min(Math.floor(tieBreaker * possibleBiomes.length), possibleBiomes.length - 1);

        return possibleBiomes[selected];
    }

    private getFilteredBiomes(currentClimate: number, currentHeight: number, currentMoisture: number, renderDebug?: boolean): number[] {

        let biomeDistances: { index: number; distance: number }[] = new Array();

        this.biomes.forEach((biome, index) => {
            let distance = this.computeBiomeDistance(biome, currentClimate, currentHeight, currentMoisture);
            biomeDistances.push({ index: index, distance: distance });
        });

        let bestDistance = 2109830921830921830912893012890321.88787787878;
        biomeDistances.sort((a, b) => {
            return a.distance - b.distance;
        });

        bestDistance = biomeDistances[0].distance;

        if (renderDebug) {
            for (const ele of biomeDistances) {
                debug.update(`${this.getBiome(ele.index).id}`, `${ele.distance}`);
            }
        }

        let withinMargin: number[] = new Array();
        for (const obj of biomeDistances) {
            if (obj.distance == bestDistance) {
                withinMargin.push(obj.index);
            } 
            else if (obj.distance - errMargin < bestDistance) {
                withinMargin.push(obj.index);
            }
        }

        return withinMargin;
    }

    private computeBiomeDistance(
        biome: Biome,
        currentClimate: number,
        currentHeight: number,
        currentMoisture: number
    ): number {

        const tempDistance = tempWeight * (currentClimate - biome.tempBias);
        const moistureDistance = moistureWeight * (currentMoisture - biome.moistureBias);

        const heightDistance = heightWeight * (currentHeight - biome.heightBias);
        return tempDistance ** 2 + moistureDistance ** 2 + heightDistance ** 2;
    }

    getBiomeIndex(value: number): number {
        return Math.min(Math.floor(value * this.biomeCount()), this.biomeCount() - 1);
    }

    surface(index: number): string {
        return this.getBiome(index).surfaceBlock;
    }

    underground(index: number): string {
        return this.getBiome(index).underGround;
    }

    decorate(index: number, pos: Vec3, dim: Dimension) {
        this.getBiome(index).decorate(pos, dim);
    }

    support(index: number): boolean {
        return this.getBiome(index).surfaceNeedsSupport;
    }

    surfaceOffset(index: number): number {
        return this.getBiome(index).surfaceDepth;
    }

    multiLayerSurface(index: number): boolean {
        return this.getBiome(index).multiLayerSurface;
    }
}

export let biomeManager = new BiomeList();
