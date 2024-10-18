import { Dimension } from "@minecraft/server";
import { ChunkPosition } from "./chunk";
import { throwError } from "./util";
import { Vec3 } from "./Vec";

export abstract class Biome {
    id: String;
    surfaceBlock: string;
    underGround: string;
    caveBlock: string;
    weight?: number;
    surfaceNeedsSupport: boolean;
    multiLayerSurface: boolean;
    surfaceDepth: number;

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

    getBiomeIndex(value: number): number {
        return Math.min(Math.round(value * this.biomeCount()), this.biomeCount() - 1);
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
