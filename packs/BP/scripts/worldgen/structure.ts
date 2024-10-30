import { Dimension, Vector2, Vector3, world } from "@minecraft/server";
import { Biome } from "./biome";
import { random } from "./random";

export interface WGEStructure {
    id: String;
    size(): Vector3;
    biomes(): String[];
    maySpawn(biome: Biome, pos: Vector3): boolean;
    skipFromCenter(): { low: Vector2; high: Vector2 };
    spawn(biome: Biome, pos: Vector3, dim: Dimension): void;
}

class StructureManager {
    private structures: WGEStructure[];
    private structureLookup: Map<String, WGEStructure[]>;
    constructor() {
        this.structures = new Array();
        this.structureLookup = new Map();
    }

    addStructure(struct: WGEStructure): StructureManager {
        this.structures.push(struct);
        return this;
    }

    buildIndexes(biomes: readonly Biome[]) {
        for (const biome of biomes) {
            const possibleStructures = this.structures.filter((structure) =>
                structure.biomes().find((val) => val === biome.id)
            );
            this.structureLookup.set(biome.id, possibleStructures);
        }
    }

    spawnStructure(biome: Biome, pos: Vector3, dim: Dimension): undefined | { low: Vector2; high: Vector2 } {
        const possibleStructures = this.structureLookup.get(biome.id);
        if (!possibleStructures || possibleStructures!.length == 0) {
            return undefined;
        }
        const structure = possibleStructures.at(Math.floor(random() * possibleStructures.length))!;
        if (!structure.maySpawn(biome, pos)) {
            return undefined;
        }
        structure.spawn(biome, pos, dim);
        return structure.skipFromCenter();
    }
}

export let structureRegistry = new StructureManager();
