import { Dimension, world } from "@minecraft/server";
import { ChunkPosition } from "./chunk";
import { clamp, throwError } from "./util";
import { Vec3 } from "./Vec";
import { HEIGHT_MAX } from "./ChunkNoiseProvider";

export enum ClimateSelections {
    FROZEN = 0.1,
    COLD = 0.25,
    NORMAL = 0.6,
    WARM = 0.75,
    BOILING = 1.0,
    DONT_CARE = 2.0
}

export enum HeightBias {
    LOW = 0.3, // Means it must be between the bottom of the noise and 1 third the way up the terrain
    NORMAL = 0.6, // Means it must be between the bottom third and the top 6th
    HIGH = .65, // Means it must be between the top 6th and the top of the noise 
    REALLY_HIGH = 1.
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
    tempBias: ClimateSelections;


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

    private getClimate(raw: number): ClimateSelections {
        if (raw <= 0.1) {
            return ClimateSelections.FROZEN;
        } else if (raw <= 0.25) {
            return ClimateSelections.COLD;
        } else if (raw <= ClimateSelections.NORMAL){
            return ClimateSelections.NORMAL;
        } else if (raw <= 0.75) {
            return ClimateSelections.WARM;
        } else {
            return ClimateSelections.BOILING;
        }

    }

    private getHeight(raw: number): HeightBias {
        if (raw <= HEIGHT_MAX * HeightBias.LOW) {
            return HeightBias.LOW;
        } else if (raw <= HEIGHT_MAX * HeightBias.NORMAL) {
            return HeightBias.NORMAL;
        } else if (raw <= HEIGHT_MAX * HeightBias.HIGH){
            return HeightBias.HIGH;
        } else {
            return HeightBias.REALLY_HIGH
        }
    }
    private findClosestClimate(target: ClimateSelections): ClimateSelections {
        const fallbackOrder = {
            [ClimateSelections.FROZEN]: [ClimateSelections.COLD, ClimateSelections.NORMAL],
            [ClimateSelections.COLD]: [ClimateSelections.NORMAL, ClimateSelections.WARM],
            [ClimateSelections.NORMAL]: [ClimateSelections.WARM, ClimateSelections.COLD],
            [ClimateSelections.WARM]: [ClimateSelections.NORMAL, ClimateSelections.COLD],
            [ClimateSelections.BOILING]: [ClimateSelections.WARM, ClimateSelections.NORMAL],
        };
        return fallbackOrder[target]?.find(climate =>
            this.biomes.some(b => b.tempBias === climate)
        ) || target;
    }
    
    private findClosestHeight(target: HeightBias): HeightBias {
        const fallbackOrder = {
            [HeightBias.LOW]: [HeightBias.NORMAL, HeightBias.HIGH],
            [HeightBias.NORMAL]: [HeightBias.LOW, HeightBias.HIGH],
            [HeightBias.HIGH]: [HeightBias.NORMAL, HeightBias.LOW],
            [HeightBias.REALLY_HIGH]: [HeightBias.HIGH, HeightBias.NORMAL],
        };
        return fallbackOrder[target]?.find(height =>
            this.biomes.some(b => b.heightBias === height)
        ) || target;
    }
    

    getBiomeIndexNew(climate: number, height: number, tieBreaker: number): number {
        const currentClimate = this.getClimate(climate);
        const currentHeight = this.getHeight(height);
        tieBreaker = clamp(tieBreaker, 0, 1);
    
        let possibleBiomes = this.getFilteredBiomes(currentClimate, currentHeight);
    
        if (possibleBiomes.length === 1) {
            return possibleBiomes[0].index;
        }
    
        possibleBiomes = this.removeDontCareBiomes(possibleBiomes);
        if (possibleBiomes.length === 1) {
            return possibleBiomes[0].index;
        }
    
        const selected = Math.min(
            Math.floor(tieBreaker * possibleBiomes.length),
            possibleBiomes.length - 1
        );
    
        return possibleBiomes[selected].index;
    }
    
    private getFilteredBiomes(currentClimate: number, currentHeight: number): { biome: any, index: number }[] {
        let possibleBiomes = this.filterBiomesByClimateAndHeight(currentClimate, currentHeight);
    
        if (possibleBiomes.length === 0) {
            const fallbackHeight = this.findClosestHeight(currentHeight);
            possibleBiomes = this.filterBiomesWithFallbackHeight(currentClimate, fallbackHeight);
        }

        if (possibleBiomes.length === 0) {
            const fallbackClimate = this.findClosestClimate(currentClimate);
            possibleBiomes = this.filterBiomesWithFallbackClimate(fallbackClimate, currentHeight);
        }
    
        if (possibleBiomes.length === 0) {
            const fallbackClimate = this.findClosestClimate(currentClimate);
            const fallbackHeight = this.findClosestHeight(currentHeight);
            possibleBiomes = this.filterBiomesWithBothFallbacks(fallbackClimate, fallbackHeight);
        }
    
        return possibleBiomes;
    }
    
    private filterBiomesByClimateAndHeight(currentClimate: number, currentHeight: number) {
        return this.biomes
            .map((biome, index) => ({ biome, index }))
            .filter(ele => 
                (ele.biome.tempBias === ClimateSelections.DONT_CARE || 
                 ele.biome.tempBias === currentClimate) &&
                ele.biome.heightBias === currentHeight
            );
    }
    
    private filterBiomesWithFallbackClimate(fallbackClimate: number, height: number) {
        return this.biomes
            .map((biome, index) => ({ biome, index }))
            .filter(ele =>
                (ele.biome.tempBias === ClimateSelections.DONT_CARE || 
                 ele.biome.tempBias === fallbackClimate) &&
                ele.biome.heightBias === height
            );
    }
    
    private filterBiomesWithFallbackHeight(climate: number, fallbackHeight: number) {
        return this.biomes
            .map((biome, index) => ({ biome, index }))
            .filter(ele =>
                (ele.biome.tempBias === ClimateSelections.DONT_CARE || 
                 ele.biome.tempBias === climate) &&
                ele.biome.heightBias === fallbackHeight
            );
    }
    
    private filterBiomesWithBothFallbacks(fallbackClimate: number, fallbackHeight: number) {
        return this.biomes
            .map((biome, index) => ({ biome, index }))
            .filter(ele =>
                (ele.biome.tempBias === ClimateSelections.DONT_CARE || 
                 ele.biome.tempBias === fallbackClimate) &&
                ele.biome.heightBias === fallbackHeight
            );
    }
    
    private removeDontCareBiomes(possibleBiomes: { biome: any, index: number }[]) {
        return possibleBiomes.filter(obj => obj.biome.tempBias !== ClimateSelections.DONT_CARE);
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
