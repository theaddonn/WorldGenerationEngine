import { Dimension, Player, Vector2, world } from "@minecraft/server";
import { Vec2, Vec3, Vector3ToString } from "./Vec";
import { runJob } from "../job";
import { BlockPosition } from "./block";
import { chunkNoiseProvider, pollNoise2D } from "./ChunkNoiseProvider";
export const CHUNK_RANGE = 6;
const Y_CHUNK_RANGE = 1;
export const SUBCHUNK_SIZE = 16;
const GRASS_THRESHHOLD = 0.6;
const TALL_THRESHHOLD = 0.96;

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
function downStack(pos: ChunkPosition, dim: Dimension) {
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
            for (let offset = 1; !finished; offset++) {
                let shouldFill = false;
                for (const height of heights) {
                    if (height < currentHeight - offset) {
                        shouldFill = true;
                        break;
                    }
                }
                if (shouldFill === true) {
                    dim.setBlockType({ x: base.x + x, y: currentHeight - offset, z: base.y + z }, "dirt");
                } else {
                    finished = true;
                }
            }
        }
    }
}

export function* buildChunk(pos: ChunkPosition, dim: Dimension) {
    for (let { world, val } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
        dim.setBlockType({ x: world.x, y: val, z: world.y }, "grass");
    }
    yield;

    downStack(pos, dim);

    yield;

    for (let { world, val } of chunkNoiseProvider.tiedChunkHeightMap(pos)) {
        const seed = Math.random();
        if (seed > GRASS_THRESHHOLD && seed < TALL_THRESHHOLD) {
            dim.setBlockType({ x: world.x, y: val + 1, z: world.y }, "short_grass");
        } else if (seed > TALL_THRESHHOLD) {
            dim.setBlockType({ x: world.x, y: val + 1, z: world.y }, "tall_grass");
        }
    }
}
