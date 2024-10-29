import { Dimension, Vector2, Vector3, world } from "@minecraft/server";
import { Vec2, Vec3, Vector2ToString, Vector3ToString } from "./Vec";
import { BlockPosition, chunkAndYToLocation, chunkOffsetY } from "./block";
import { chunkNoiseProvider, pollNoise2D } from "./ChunkNoiseProvider";
import { biomeManager } from "./biome";
import { advanceStage, bailGeneration, ChunkStage, finishChunk, removeChunk } from "./generation";
import { NumberInputConfig, terrainConfig, ToggleConfig } from "./config";
import { structureRegistry } from "./structure";
import { renderDebug } from "./debug";
import { clamp } from "./util";
export let CHUNK_RANGE = 1;
export let SUBCHUNK_SIZE = 16;

let renderSAM = false;
export function initChunkConfig() {
    terrainConfig.addConfigOption(
        "Render Structure Avoidance Map",
        new ToggleConfig(
            () => {return renderSAM},
            (val) => renderSAM = val
        )
    ).addConfigOption(
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
        return new ChunkPosition(Math.floor(pos.x / SUBCHUNK_SIZE), Math.floor(pos.y / SUBCHUNK_SIZE));
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
        let x = pos.x;
        let z = pos.y;
        if (pos.x < 0) {
            x = -x;
        }
        if (pos.y < 0) {
            z = -z;
        }

        return new LocalChunkPosition(Math.floor(x % SUBCHUNK_SIZE), Math.floor(z % SUBCHUNK_SIZE));
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

// This function is responsible for filling any empty holes below the terrain shape
function* downStack(pos: ChunkPosition, dim: Dimension): Generator<number> {
    const noise = chunkNoiseProvider.getOrCacheChunkHeight(pos);
    const base = pos.toBlock();
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
                if (ChunkPosition.fromWorld(position) !== pos) {
                    height = pollNoise2D(position);
                } else {
                    height = noise.get(position.toLocalChunk());
                }
                heights[idx] = height;
            }
            let finished = false;
            const biome = noise.getBiome(new Vec2(x, z));
            const surfaceOffset = biomeManager.surfaceOffset(biome);
            for (let offset = 1; !finished; offset++) {
                let shouldFill = false;
                for (const height of heights) {
                    if (height < currentHeight - offset - surfaceOffset) {
                        shouldFill = true;
                        break;
                    }
                }
                if (shouldFill === true) {
                    dim.setBlockType(
                        { x: base.x + x, y: currentHeight - surfaceOffset - offset, z: base.y + z },
                        biomeManager.underground(biome)
                    );
                } else {
                    finished = true;
                }
            }
        }
        yield 1;
    }
}


function* surface(pos: ChunkPosition, dim: Dimension, yeildEnabled: boolean = false): Generator<void> {
    for (let { world, val, biome } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
        const surfaceDepth = biomeManager.surfaceOffset(biome);
        if (biomeManager.multiLayerSurface(biome)) {
            for (let x = 0; x < surfaceDepth; x++) {
                dim.setBlockType({ x: world.x, y: val - x, z: world.y }, biomeManager.surface(biome));
            }
        } else {
            dim.setBlockType({ x: world.x, y: val, z: world.y }, biomeManager.surface(biome));
        }

        if (biomeManager.support(biome)) {
            dim.setBlockType(
                { x: world.x, y: val - surfaceDepth, z: world.y },
                biomeManager.underground(biome)
            );
        }
        if (yeildEnabled) {
            yield;
        }        
    }
}

function* structure(pos: ChunkPosition, dim: Dimension, lastFinishedStage: ChunkStage, isMidStage: boolean): Generator<void> {
    let hardPassNeeded = false;
    if (lastFinishedStage === ChunkStage.Decorate) {
        let validArray = new PlaneArray(SUBCHUNK_SIZE, SUBCHUNK_SIZE, 0);
        const cache = chunkNoiseProvider.getCache(pos);

        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                if (validArray.get(new Vec2(x, z)) !== 0) {
                    continue;
                }
                var skip = structureRegistry.spawnStructure(
                    biomeManager.getBiome(cache.getBiome(new Vec2(x, z))),
                    chunkOffsetY(pos, new Vec2(x, z), cache.get(new Vec2(x, z))),
                    dim
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
                    const position = chunkOffsetY(pos, new Vec2(x, z), cache.get(new Vec2(x, z)) - 20);
                    try {
                        if (validArray.get(new Vec2(x, z)) !== 0) {
                            dim.setBlockType(position, "blue_wool");
                        } else {
                            dim.setBlockType(position, "red_wool");
                        }
                        yield;
                    } catch {}
                }
            }
        }

        yield;
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
    }

    if ((hardPassNeeded && !isMidStage) || (isMidStage && ChunkStage.Structure)) {
        try {
            for (const _ of surface(pos, dim, true)) {yield;}
        } catch {
            bailGeneration(pos);
            return;
        }
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
        yield;
    } else {
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
    }
}

export function* buildChunk(pos: ChunkPosition, dim: Dimension, lastFinishedStage: ChunkStage, isMidStage: boolean) {
    chunkNoiseProvider.getOrCacheChunkHeight(pos);
    yield;

    if (lastFinishedStage === ChunkStage.None) {
        try {
            for (const _ of surface(pos, dim)) {}
        } catch {
            bailGeneration(pos);
        }
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
        yield;
    }

    if (lastFinishedStage === ChunkStage.BaseLayer) {
        try {
            for (const e of downStack(pos, dim)) {
                yield;
            }
        } catch {
            bailGeneration(pos);
        }
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
        yield;
    }

    if (lastFinishedStage === ChunkStage.DownStack) {
        for (let { world, val, biome } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
            try {
                biomeManager.decorate(biome, new Vec3(world.x, val, world.y), dim);
                yield;
            } catch {
                return bailGeneration(pos);
            }
        }
        lastFinishedStage = advanceStage(pos, lastFinishedStage);
        yield;
    }

    if (lastFinishedStage === ChunkStage.Decorate) {
        try {
            for (const _ of structure(pos, dim, lastFinishedStage, isMidStage)) {yield;}
        } catch {
            bailGeneration(pos);
        }
        lastFinishedStage += 2;
    }
    
    
    finishChunk(pos, lastFinishedStage);
}
