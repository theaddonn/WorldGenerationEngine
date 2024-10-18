import { Vector2, Vector3, world } from "@minecraft/server";
import { Chunk, ChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { idx2D } from "./util";
import { PerlinNoise2D } from "./noise";
import { Vec2, Vector2ToString } from "./Vec";
import { BlockPosition } from "./block";
import { biomeManager } from "./biome";

const OCTAVE_2D = 5;
const AMPLITUDE = 150;
const FREQ = 0.0075;
const BASE_OFFSET = 150;
const PERSISTANCE = 0.5;

class ChunkNoise {
    values: Int16Array;
    biomeIndex: Int16Array;
    highestPoint: number;

    constructor(values: Int16Array, biomeIndex: Int16Array, highestPoint: number) {
        this.values = values;
        this.biomeIndex = biomeIndex;
        this.highestPoint = highestPoint;
    }

    get(pos: Vector2): number {
        return this.values[idx2D(pos)];
    }
    getBiome(pos: Vector2): number {
        return this.biomeIndex[idx2D(pos)];
    }
}

class ChunkNoiseProvider {
    chunkHeightmap: Map<String, ChunkNoise>;
    heightCache: Map<String, Int16Array>
    amplitudeConstant: number; // This is a little hacky but works :33333

    constructor() {
        this.chunkHeightmap = new Map();
        this.heightCache = new Map();


        let overall = AMPLITUDE;
        let last = AMPLITUDE;

        for (let x = 0; x < OCTAVE_2D; x++) {
            last *= PERSISTANCE;
            overall += last;
        }
        this.amplitudeConstant = overall;
    }

    *getChunkHeightMap(pos: Vector2): Generator<number> {
        const heightMap = this.getOrCacheChunkHeight(pos);
        for (pos of Chunk.iterOverBlocksWorld(pos)) {
            yield heightMap.get(pos);
        }
    }

    *tiedChunkHeightMap(pos: ChunkPosition): Generator<{ world: BlockPosition; val: number, biome: number }> {
        const heightMap = this.getOrCacheChunkHeight(pos);
        for (let { world, local } of Chunk.iterOverBlocksWorldLocal(pos)) {
            yield {
                world: BlockPosition.fromVec(world),
                val: heightMap.get(local),
                biome: heightMap.getBiome(local)
            };
        }
    }

    getHighestPointForChunk(pos: Vector2): number {
        const heightMap = this.getOrCacheChunkHeight(pos);
        return heightMap.highestPoint;
    }

    buildHeight(pos: Vector2): {largest: number, heightmap: Int16Array, biomemap: Int16Array} {
        let rawBiomeData = new Float32Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let heightmap = new Int16Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let largest = -21213890;
        let base = BlockPosition.fromChunk(pos);
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                let real = new Vec2(x + base.x, z + base.y);
               const [height, raw] = pollNoise2D(real);
                rawBiomeData[idx2D(new Vec2(x, z))] = raw;
                if (raw > 1) {
                    console.warn(`Raw data larger than 1! ${raw}`);
                }
                heightmap[idx2D(new Vec2(x, z))] = height; 
                if (height > largest) {
                    largest = height;
                }
            }
        }
        let finalizedBiomeData = new Int16Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                finalizedBiomeData[idx2D(new Vec2(x, z))] = biomeManager.getBiomeIndex(rawBiomeData[idx2D(new Vec2(x, z))]);
            }
        }
        return {largest: largest, heightmap: heightmap, biomemap: finalizedBiomeData};
    }

    getOrCacheChunkHeight(pos: Vector2): ChunkNoise {
        if (this.chunkHeightmap.has(Vector2ToString(pos))) {
            const val = this.chunkHeightmap.get(Vector2ToString(pos));
            if (val == undefined) {
                throw new Error("Somehow This Happned??????????????");
            }
            return val;
        } else {
            const outData = this.buildHeight(pos);

            const noise = new ChunkNoise(outData.heightmap, outData.biomemap, outData.largest);
            this.chunkHeightmap.set(Vector2ToString(pos), noise);
            return noise;
        }
    }
}

export function pollNoise2D(pos: Vector2): number[] {
    let [height, raw] = PerlinNoise2D(pos.x, pos.y, AMPLITUDE, FREQ, OCTAVE_2D, PERSISTANCE, 1.7, 1.0);
    height += BASE_OFFSET;
    return [height, raw];
}

export let chunkNoiseProvider = new ChunkNoiseProvider();
