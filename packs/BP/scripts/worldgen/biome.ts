import { Dimension, world } from "@minecraft/server";
import { ChunkPosition } from "./chunk";
import { clamp, throwError } from "./util";
import { Vec3 } from "./Vec";
import { HEIGHT_MAX } from "./ChunkNoiseProvider";

export enum ClimateSelections {
    FROZEN = -0.8,
    COLD = -0.4,
    NORMAL = 0.3,
    WARM = 0.75,
    BOILING = 1.0,
    DONT_CARE = 2.0,
}
export enum MoistureSelections {
    Soaking = -0.8,
    Wet = -0.4,
    Normal = 0.5,
    Dry = 0.75,
    None = 1.0,
    DONT_CARE = 2.0,
}

export enum HeightBias {
    LOW = 0.3, // Means it must be between the bottom of the noise and 1 third the way up the terrain
    NORMAL = 0.6, // Means it must be between the bottom third and the top 6th
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

class BiomeList {
    private biomes: Biome[];

    constructor() {
        this.biomes = new Array();
    }

    biomeCount(): number {
        return this.biomes.length;
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

    getBiomeIndexNew(climate: number, height: number, tieBreaker: number, moisture: number): number {
        const currentHeight = this.getHeight(height);
        tieBreaker = clamp(tieBreaker, 0, 1);

        let possibleBiomes = this.getFilteredBiomes(climate, currentHeight, moisture);
        // world.sendMessage(`${possibleBiomes.length} ${possibleBiomes[0]}`)
        if (possibleBiomes.length === 1) {
            return possibleBiomes[0];
        }

        const selected = Math.min(Math.floor(tieBreaker * possibleBiomes.length), possibleBiomes.length - 1);

        return possibleBiomes[selected];
    }

    private getFilteredBiomes(currentClimate: number, currentHeight: number, currentMoisture: number): number[] {
        const errMargin = 0.01;

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

        // world.sendMessage(`NEW`)

        // for (const distance of biomeDistances) {
        //     world.sendMessage(`${distance.distance} ${distance.index} ${this.biomes[distance.index].id}`)
        // }
        // world.sendMessage(` BEST ${bestDistance}`)

        let withinMargin: number[] = new Array();
        withinMargin.push(biomeDistances[0].index);

        // for (const obj of biomeDistances) {
        //     if (obj.distance == bestDistance) {
        //         withinMargin.push(obj.index);
        //     } else if (obj.distance - errMargin < bestDistance) {
        //         withinMargin.push(obj.index);
        //     }
        // }

        return withinMargin;
    }

    //TODO: Add some form of weights for a future release

    private computeBiomeDistance(
        biome: Biome,
        currentClimate: number,
        currentHeight: number,
        currentMoisture: number
    ): number {
        const heightWeight = 1.0;
        const tempWeight = 1.0;
        const moistureWeight = 1.0;

        const tempDistance = tempWeight * (currentClimate - biome.tempBias);
        const moistureDistance = moistureWeight * (currentMoisture - biome.moistureBias);

        const heightDistance = heightWeight * (currentHeight - biome.heightBias);
        // world.sendMessage(`${heightDistance} ${currentHeight} ${biome.heightBias} ${biome.id} ${tempDistance} ${moistureDistance}`)
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
