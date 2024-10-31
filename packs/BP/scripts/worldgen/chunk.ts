import { Dimension, Vector2, Vector3, world } from "@minecraft/server";
import { Vec2, Vec3, Vector2ToString, Vector3ToString } from "./Vec";
import { BlockPosition, chunkOffsetY } from "./block";
import { ChunkNoiseProvider, pollNoise2D } from "./ChunkNoiseProvider";
import { BiomeList } from "./biome";
import { ChunkStage, GenerationProvider } from "./generation";
import { NumberInputConfig, terrainConfig, ToggleConfig } from "./config";
import { WGEStructureManager } from "./structure";
import { clamp } from "./util";
export let CHUNK_RANGE = 5;
export let SUBCHUNK_SIZE = 16;

let renderSAM = false;
export function initChunkConfig() {
    terrainConfig
        .addConfigOption(
            "Render Structure Avoidance Map",
            new ToggleConfig(
                () => {
                    return renderSAM;
                },
                (val) => (renderSAM = val)
            )
        )
        .addConfigOption(
            "Chunk Build Distance",
            new NumberInputConfig(
                () => {
                    return CHUNK_RANGE;
                },
                (range) => {
                    CHUNK_RANGE = range;
                }
            )
        );
}

export class ChunkPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static fromWorld(pos: Vector2): ChunkPosition {
        let x = Math.floor(pos.x / SUBCHUNK_SIZE);
        let y = Math.floor(pos.y / SUBCHUNK_SIZE);
        return new ChunkPosition(x, y);
    }

    static from3D(pos: Vector3): ChunkPosition {
        return ChunkPosition.fromWorld({ x: pos.x, y: pos.z });
    }

    toBlock(): BlockPosition {
        return BlockPosition.fromChunk(this);
    }

    distance(other: Vector2): number {
        return (other.x - this.x) ** 2 + (other.y - this.y) ** 2;
    }
}

export class PlaneArray {
    private raw: Uint8Array;
    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number = width, val: number = 0) {
        this.raw = new Uint8Array(height * width);
        this.raw.fill(val);
        this.width = width;
        this.height = height;
    }

    get(pos: Vector2 | Vector3) {
        return this.raw[pos.y * this.width + pos.x];
    }
    set(pos: Vector2 | Vector3, val: number) {
        this.raw[pos.y * this.width + pos.x] = val;
    }
}

export class LocalChunkPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static fromWorld(pos: Vector2): LocalChunkPosition {
        const block = ChunkPosition.fromWorld(pos).toBlock();
        let x = pos.x - block.x;
        let z = pos.y - block.y;

        return new LocalChunkPosition(Math.floor(x), Math.floor(z));
    }
}

export class Chunk {
    static *iterOverBlocksLocal(): Generator<Vector2> {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                yield new Vec2(x, z);
            }
        }
    }

    // The base param is chunk space
    static *iterOverBlocksWorld(base: Vector2): Generator<Vector2> {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                yield new Vec2(x + base.x * SUBCHUNK_SIZE, z + base.y * SUBCHUNK_SIZE);
            }
        }
    }

    static *iterOverBlocksWorldLocal(base: Vector2): Generator<{ local: Vector2; world: Vector2 }> {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                yield {
                    local: new Vec2(x, z),
                    world: new Vec2(x + base.x * SUBCHUNK_SIZE, z + base.y * SUBCHUNK_SIZE),
                };
            }
        }
    }
}

export class WorldChunk {
    private pos: ChunkPosition;
    private dim: Dimension;
    private cnp: ChunkNoiseProvider;
    private bl: BiomeList;
    private stage: ChunkStage;
    private midStage: boolean;
    private sm: WGEStructureManager;
    private gp: GenerationProvider;

    /**
     *
     * @param pos. This is the position of the chunk to build from
     * @param dim. This is the dimension the chunk is placed in
     * @param cnp. This is the instance of ChunkNoiseProvider that this chunk polls
     * @param bl. This is the list of biomes this chunk can select from
     * @param stage. This is the last stage this chunk was known to be in. This is used to handle the chunk unloading mid build
     * @param sm. This is the structure manager
     * @param gp. This is the generation provider
     */
    constructor(
        pos: ChunkPosition,
        dim: Dimension,
        cnp: ChunkNoiseProvider,
        bl: BiomeList,
        stage: ChunkStage,
        sm: WGEStructureManager,
        gp: GenerationProvider
    ) {
        this.pos = pos;
        this.dim = dim;
        this.cnp = cnp;
        this.bl = bl;
        this.midStage = false;
        this.stage = stage;
        this.sm = sm;
        this.gp = gp;
    }

    *generate() {
        this.cnp.getOrCacheChunkHeight(this.pos);
        yield;

        if (this.stage === ChunkStage.None) {
            try {
                for (const _ of this.surface()) {
                }
            } catch {
                this.gp.bailGeneration(this.pos);
            }
            this.stage = this.gp.advanceStage(this.pos, this.stage);
            yield;
        } else {
            this.midStage = true;
        }

        if (this.stage === ChunkStage.BaseLayer) {
            try {
                for (const e of this.downStack()) {
                    yield;
                }
            } catch {
                this.gp.bailGeneration(this.pos);
            }
            this.stage = this.gp.advanceStage(this.pos, this.stage);
            yield;
        }

        if (this.stage === ChunkStage.DownStack) {
            for (let { world, val, biome } of this.cnp.tiedChunkHeightMap(this.pos)) {
                try {
                    this.bl.decorate(biome, new Vec3(world.x, val, world.y), this.dim);
                    yield;
                } catch {
                    return this.gp.bailGeneration(this.pos);
                }
            }
            this.stage = this.gp.advanceStage(this.pos, this.stage);
            yield;
        }

        if (this.stage === ChunkStage.Decorate) {
            try {
                for (const _ of this.structure(this.midStage)) {
                    yield;
                }
            } catch {
                this.gp.bailGeneration(this.pos);
            }
            this.stage += 2;
        }

        this.gp.finishChunk(this.pos, this.stage);
    }

    *surface(yeildEnabled: boolean = false) {
        for (let { world, val, biome } of this.cnp.tiedChunkHeightMap(this.pos)) {
            const surfaceDepth = this.bl.surfaceOffset(biome);
            if (this.bl.multiLayerSurface(biome)) {
                for (let x = 0; x < surfaceDepth; x++) {
                    this.dim.setBlockType({ x: world.x, y: val - x, z: world.y }, this.bl.surface(biome));
                }
            } else {
                this.dim.setBlockType({ x: world.x, y: val, z: world.y }, this.bl.surface(biome));
            }

            if (this.bl.support(biome)) {
                this.dim.setBlockType({ x: world.x, y: val - surfaceDepth, z: world.y }, this.bl.underground(biome));
            }
            if (yeildEnabled) {
                yield;
            }
        }
    }

    *structure(isMidStage: boolean): Generator<void> {
        let hardPassNeeded = false;
        if (this.stage === ChunkStage.Decorate) {
            let validArray = new PlaneArray(SUBCHUNK_SIZE, SUBCHUNK_SIZE, 0);
            const cache = this.cnp.getCache(this.pos);

            for (let x = 0; x < SUBCHUNK_SIZE; x++) {
                for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                    if (validArray.get(new Vec2(x, z)) !== 0) {
                        continue;
                    }
                    var skip = this.sm.spawnStructure(
                        this.bl.getBiome(cache.getBiome(new Vec2(x, z))),
                        chunkOffsetY(this.pos, new Vec2(x, z), cache.get(new Vec2(x, z))),
                        this.dim
                    );
                    yield;
                    if (skip === undefined) {
                        continue;
                    }
                    hardPassNeeded = true;
                    for (let x_sub = x - skip.low.x; x_sub < x + skip.high.x + 1; x_sub++) {
                        for (let z_sub = z - skip.low.y; z_sub < z + skip.high.y + 1; z_sub++) {
                            validArray.set(
                                new Vec2(clamp(x_sub, 0, SUBCHUNK_SIZE - 1), clamp(z_sub, 0, SUBCHUNK_SIZE - 1)),
                                1
                            );
                        }
                    }
                }
            }

            if (renderSAM) {
                for (let x = 0; x < SUBCHUNK_SIZE; x++) {
                    for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                        const position = chunkOffsetY(this.pos, new Vec2(x, z), cache.get(new Vec2(x, z)) - 20);
                        try {
                            if (validArray.get(new Vec2(x, z)) !== 0) {
                                this.dim.setBlockType(position, "blue_wool");
                            } else {
                                this.dim.setBlockType(position, "red_wool");
                            }
                            yield;
                        } catch {}
                    }
                }
            }

            yield;
        }

        if ((hardPassNeeded && !isMidStage) || (isMidStage && ChunkStage.Structure)) {
            try {
                for (const _ of this.surface(true)) {
                    yield;
                }
            } catch {
                this.gp.bailGeneration(this.pos);
                return;
            }
            yield;
        }
    }

    *downStack(): Generator<number> {
        const noise = this.cnp.getOrCacheChunkHeight(this.pos);
        const base = this.pos.toBlock();
        const heights: Int16Array = new Int16Array(4);
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const currentHeight = noise.get({ x: x, y: z });
                const samplePositions: BlockPosition[] = [
                    BlockPosition.fromVec({ x: base.x + x - 1, y: base.y + z }),
                    BlockPosition.fromVec({ x: base.x + x + 1, y: base.y + z }),
                    BlockPosition.fromVec({ x: base.x + x, y: base.y + z - 1 }),
                    BlockPosition.fromVec({ x: base.x + x, y: base.y + z + 1 }),
                ];

                for (let idx = 0; idx < samplePositions.length; idx++) {
                    const position = samplePositions[idx];
                    let height;
                    if (ChunkPosition.fromWorld(position) !== this.pos) {
                        //height = pollNoise2D(position);
                        height = this.cnp.getHeightCacheOrNew(position);
                    } else {
                        height = noise.get(position.toLocalChunk());
                    }
                    heights[idx] = height;
                }
                let finished = false;
                const biome = noise.getBiome(new Vec2(x, z));
                const surfaceOffset = this.bl.surfaceOffset(biome);
                for (let offset = 1; !finished; offset++) {
                    let shouldFill = false;
                    for (const height of heights) {
                        if (height < currentHeight - offset - surfaceOffset) {
                            shouldFill = true;
                            break;
                        }
                    }
                    if (shouldFill === true) {
                        this.dim.setBlockType(
                            { x: base.x + x, y: currentHeight - surfaceOffset - offset, z: base.y + z },
                            this.bl.underground(biome)
                        );
                    } else {
                        finished = true;
                    }
                }
            }
            yield 1;
        }
    }
}
