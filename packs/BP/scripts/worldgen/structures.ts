import { BlockVolumeBase, BoundingBoxUtils, Dimension, Structure, StructureManager, Vector2, Vector3, world } from "@minecraft/server";
import { Biome, biomeManager } from "./biome";
import { structureRegistry, WGEStructure } from "./structure";
import { Vec2, Vec3, Vector3ToString } from "./Vec";
import { random } from "./random";

class Tree implements WGEStructure {
    id: String;
    private biomesList: String[];
    private structure: Structure;
    private coreOffset: Vec2;
    private weight: number;
    private low: Vec2;
    private high: Vec2;

    constructor(biomeList: String[], id: String, structureId: string, placementOffset: Vec2, low: Vec2, high: Vec2, weight: number = 0.01) {
        this.biomesList = biomeList;
        this.id = id;
        this.structure = world.structureManager.get(structureId)!;
        this.coreOffset = placementOffset;
        this.weight = weight;
        this.low = low;
        this.high = high;
    }

    size(): Vector3 {
        return this.structure.size;
    }

    biomes(): String[] {
        return this.biomesList
    }

    maySpawn(_: Biome, __: Vector3): boolean {
        return random() < this.weight;
    }

    skipFromCenter(): { low: Vector2; high: Vector2; } {
        return {
            low: this.low,
            high: this.high
        }
    }

    spawn(_: Biome, pos: Vector3, dim: Dimension): void {
        try {
            world.structureManager.place(this.structure, dim, {x: pos.x - this.coreOffset.x, y: pos.y + 1, z: pos.z - this.coreOffset.y});
        } catch {
        }
    }
}

export function registerStructures() {
    structureRegistry
        .addStructure(new Tree(
            ["custom:planes"],
            "oak_tree_one",
            "mystructure:oak_tree_1",
            new Vec2(2, 2),
            new Vec2(2, 2),
            new Vec2(2, 2)
        ))
        .addStructure(new Tree(
            ["custom:planes"],
            "oak_tree_two",
            "mystructure:oak_tree_2",
            new Vec2(2, 2),
            new Vec2(2, 2),
            new Vec2(2, 2)
        ))
        .addStructure(new Tree(
            ["custom:planes"],
            "oak_tree_three",
            "mystructure:oak_tree_3",
            new Vec2(2, 2),
            new Vec2(2, 2),
            new Vec2(2, 2)
        ))
}
