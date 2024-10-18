import { Dimension, world } from "@minecraft/server";
import { Biome, biomeManager } from "./biome";
import { Vec3 } from "./Vec";
const TALL_THRESHHOLD = 0.96;
const GRASS_THRESHHOLD = 0.86;
const SHRUB_THRESHHOLD = 0.9;


class Planes extends Biome {
    constructor() {
        super();

        this.id = "custom:planes";
        this.surfaceBlock = "grass";
        this.underGround = "dirt";
        this.caveBlock = "stone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
    }

    decorate(pos: Vec3, dim: Dimension) {
        const seed = Math.random();
        if (seed > GRASS_THRESHHOLD && seed < TALL_THRESHHOLD) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "short_grass");
        } else if (seed > TALL_THRESHHOLD) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "tall_grass");
        }
    }
}

class Desert extends Biome {
    
    constructor() {
        super();

        this.id = "custom:desert";
        this.surfaceBlock = "sand";
        this.underGround = "sandstone";
        this.caveBlock = "stone";
        this.surfaceNeedsSupport = true;
        this.multiLayerSurface = true;
        this.surfaceDepth = 3;
    }

    
    decorate(pos: Vec3, dim: Dimension) {
        const seed = Math.random();
        if (seed > SHRUB_THRESHHOLD) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "deadbush");
        }
    }
}



export function registerBiomes() {
    biomeManager.addBiome(new Planes());
    biomeManager.addBiome(new Desert());
}