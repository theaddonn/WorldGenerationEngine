import { Dimension, world } from "@minecraft/server";
import { Biome, biomeManager, ClimateSelections, HeightBias } from "./biome";
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
        this.tempBias = ClimateSelections.NORMAL;
        this.heightBias = HeightBias.NORMAL;
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
class FrozenPlanes extends Biome {
    constructor() {
        super();

        this.id = "custom:frozen_planes";
        this.surfaceBlock = "snow";
        this.underGround = "dirt";
        this.caveBlock = "stone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
        this.tempBias = ClimateSelections.COLD;
        this.heightBias = HeightBias.NORMAL;
    }

    decorate(pos: Vec3, dim: Dimension) {
        const seed = Math.random();
        if (seed > 0.8) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "snow_layer");
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
        this.tempBias = ClimateSelections.WARM;
        this.heightBias = HeightBias.NORMAL;
    }

    
    decorate(pos: Vec3, dim: Dimension) {
        const seed = Math.random();
        if (seed > SHRUB_THRESHHOLD) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "deadbush");
        }
    }
}

class Mountian extends Biome {
    
    constructor() {
        super();

        this.id = "custom:mountain";
        this.surfaceBlock = "stone";
        this.underGround = "stone";
        this.caveBlock = "stone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
        this.tempBias = ClimateSelections.DONT_CARE;
        this.heightBias = HeightBias.REALLY_HIGH;
    }

    
    decorate(pos: Vec3, dim: Dimension) {}
}
class FrozenMountian extends Biome {
    
    constructor() {
        super();

        this.id = "custom:frozen_mountain";
        this.surfaceBlock = "packed_ice";
        this.underGround = "blue_ice";
        this.caveBlock = "stone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
        this.tempBias = ClimateSelections.COLD;
        this.heightBias = HeightBias.REALLY_HIGH;
    }

    
    decorate(pos: Vec3, dim: Dimension) {
        const seed = Math.random();
        if (seed > 0.8) {
            dim.setBlockType({ x: pos.x, y: pos.y + 1, z: pos.z }, "snow_layer");
        }
    }
}
class SandMountian extends Biome {
    
    constructor() {
        super();

        this.id = "custom:sand_mountain";
        this.surfaceBlock = "sandstone";
        this.underGround = "sandstone";
        this.caveBlock = "sandstone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
        this.tempBias = ClimateSelections.WARM;
        this.heightBias = HeightBias.HIGH;
    }

    
    decorate(pos: Vec3, dim: Dimension) {}
}
class SandMountianTall extends Biome {
    
    constructor() {
        super();

        this.id = "custom:sand_tall_mountain";
        this.surfaceBlock = "sandstone";
        this.underGround = "sandstone";
        this.caveBlock = "sandstone";
        this.surfaceNeedsSupport = false;
        this.multiLayerSurface = false;
        this.surfaceDepth = 0;
        this.tempBias = ClimateSelections.WARM;
        this.heightBias = HeightBias.REALLY_HIGH;
    }

    
    decorate(pos: Vec3, dim: Dimension) {}
}



export function registerBiomes() {
    biomeManager.addBiome(new Planes());
    biomeManager.addBiome(new Mountian());
    biomeManager.addBiome(new Desert());
    biomeManager.addBiome(new FrozenPlanes());
    biomeManager.addBiome(new SandMountian());
    biomeManager.addBiome(new FrozenMountian());
    biomeManager.addBiome(new SandMountianTall());
}