import { Dimension, Vector2, Vector3 } from "@minecraft/server";
import { Vec2, Vec3 } from "./Vec";
import { BlockPosition } from "./block";
import { chunkNoiseProvider, pollNoise2D } from "./ChunkNoiseProvider";
import { biomeManager } from "./biome";
import { advanceStage, bailGeneration, ChunkStage, finishChunk, removeChunk } from "./generation";
import { SliderConfig, terrainConfig } from "./config";
export let CHUNK_RANGE = 5;
export let SUBCHUNK_SIZE = 2;

export function initChunkConfig() {
    terrainConfig.addConfigOption(
        "Chunk Build Distance",
        new SliderConfig(
            0,
            50,
            1,
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

export function* buildChunk(pos: ChunkPosition, dim: Dimension, lastFinishedStage: ChunkStage) {
    chunkNoiseProvider.getOrCacheChunkHeight(pos);
    yield;

    if (lastFinishedStage === ChunkStage.None) {
        for (let { world, val, biome } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
            const surfaceDepth = biomeManager.surfaceOffset(biome);
            try {
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
            } catch {
                bailGeneration(pos);
                return;
            }
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
        let lastX = -1;
        for (let { world, val, biome } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
            try {
                biomeManager.decorate(biome, new Vec3(world.x, val, world.y), dim);
            } catch {
                return bailGeneration(pos);
            }
            if (lastX != world.x) {
                yield;
            }
            lastX = world.x;
        }
        lastFinishedStage++; // This is a hack it is evil
    }
    finishChunk(pos, lastFinishedStage);
}
