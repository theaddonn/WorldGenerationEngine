import { Vector2, Vector3, world } from "@minecraft/server";
import { Chunk, ChunkPosition, LocalChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { idx2D } from "./util";
import { PerlinNoise2D, pollClimateNoise2D, pollMoistureNoise2D, pollTieNoise2D, singlePerlin2D } from "./noise";
import { Vec2, Vector2ToString } from "./Vec";
import { BlockPosition } from "./block";
import { biomeManager } from "./biome";
import { mainLocation } from "../main";

export let OCTAVE_2D = 5;
export let AMPLITUDE = 50;
export let FREQUENCY = 0.0055;
export let BASE_OFFSET = 70;
export let PERSISTANCE = 0.5;

export function setOctave2D(val: number) {
    OCTAVE_2D = val;
}

export function setAmplitude(val: number) {
    AMPLITUDE = val;

    HEIGHT_MAX = Math.round(BASE_OFFSET + AMPLITUDE * 1);
    HEIGHT_MIN = Math.round(BASE_OFFSET - AMPLITUDE * 1.1);
}

export function setFrequency(val: number) {
    FREQUENCY = val;
}

export function setBaseOffset(val: number) {
    BASE_OFFSET = val;
}

export function setPersistance(val: number) {
    PERSISTANCE = val;
}


export let HEIGHT_MAX = Math.round(BASE_OFFSET + AMPLITUDE * 1);
export let HEIGHT_MIN = Math.round(BASE_OFFSET - AMPLITUDE * 1.1);
world.sendMessage(`new min and max ${HEIGHT_MIN} ${HEIGHT_MAX}`);

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
    climateCache: Map<String, Float32Array>;
    tieCache: Map<String, Float32Array>;
    moistureCache: Map<String, Float32Array>;
    amplitudeConstant: number; // This is a little hacky but works :33333

    constructor() {
        this.chunkHeightmap = new Map();
        this.climateCache = new Map();
        this.tieCache = new Map();
        this.moistureCache = new Map();

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

    *tiedChunkHeightMap(pos: ChunkPosition): Generator<{ world: BlockPosition; val: number; biome: number }> {
        const heightMap = this.getOrCacheChunkHeight(pos);
        for (let { world, local } of Chunk.iterOverBlocksWorldLocal(pos)) {
            yield {
                world: BlockPosition.fromVec(world),
                val: heightMap.get(local),
                biome: heightMap.getBiome(local),
            };
        }
    }

    getHighestPointForChunk(pos: Vector2): number {
        const heightMap = this.getOrCacheChunkHeight(pos);
        return heightMap.highestPoint;
    }

    buildHeight(pos: Vector2): { largest: number; heightmap: Int16Array; biomemap: Int16Array } {
        let tieBreakerNoise = new Float32Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let climateNoise = new Float32Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let heightmap = new Int16Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let moistureMap = new Float32Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
    
        const base = BlockPosition.fromChunk(pos);
        let { largest, smallest } = this.populateHeightNoise(base, heightmap, tieBreakerNoise);

        this.populateTieNoise(base, tieBreakerNoise);
        this.populateClimateNoise(base, climateNoise);
        this.populateMoistureNoise(base, moistureMap);
        
        const finalizedBiomeData = this.generateBiomeData(heightmap, climateNoise, tieBreakerNoise);

        this.checkHeightExtremes(largest, smallest);

        return { largest, heightmap, biomemap: finalizedBiomeData };
    }
    
    private populateHeightNoise(base: Vector2, heightmap: Int16Array, tieBreakerNoise: Float32Array) {
        let largest = -21213890;
        let smallest = 13721987938;

        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const real = new Vec2(x + base.x, z + base.y);
                const height = pollNoise2D(real);
                const index = idx2D(new Vec2(x, z));
    
                heightmap[index] = height;

                if (height > largest) largest = height;
                if (height < smallest) smallest = height;
            }
        }
        return { largest, smallest };
    }

    private populateClimateNoise(base: Vector2, climateNoise: Float32Array) {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const index = idx2D(new Vec2(x, z));
                climateNoise[index] = pollClimateNoise2D(base.x + x, base.y + z, 0.00095);
            }
        }
        this.climateCache.set(Vector2ToString(ChunkPosition.fromWorld(base)), climateNoise);
    }
    
    private populateTieNoise(base: Vector2, tieNoise: Float32Array) {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const index = idx2D(new Vec2(x, z));
                tieNoise[index] = pollTieNoise2D(base.x + x, base.y + z, 0.005);
            }
        }
        this.tieCache.set(Vector2ToString(ChunkPosition.fromWorld(base)), tieNoise);
    }
    private populateMoistureNoise(base: Vector2, moistureNoise: Float32Array) {
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const index = idx2D(new Vec2(x, z));
                moistureNoise[index] = pollMoistureNoise2D(base.x + x, base.y + z, 0.01);
            }
        }
        this.moistureCache.set(Vector2ToString(ChunkPosition.fromWorld(base)), moistureNoise);
    }
    
    getClimateNoise(Chunk: ChunkPosition, Local: LocalChunkPosition): number {

        const cache = this.climateCache.get(Vector2ToString(Chunk));
        if (cache === undefined) {
            return 0.5;
        } else {
            return cache[idx2D(Local)];
        }
    }
    getClimateNoiseFull(fullPos: Vector3): number {
        const chunkPos = ChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        const local = LocalChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        return this.getClimateNoise(chunkPos, local);

    }
    
    getMoistureNoise(Chunk: ChunkPosition, Local: LocalChunkPosition): number {

        const cache = this.moistureCache.get(Vector2ToString(Chunk));
        if (cache === undefined) {
            return 0.5;
        } else {
            return cache[idx2D(Local)];
        }

    }
    getMoistureNoiseFull(fullPos: Vector3): number {
        const chunkPos = ChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        const local = LocalChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        return this.getMoistureNoise(chunkPos, local);

    }

    getTieBreakerNoise(Chunk: ChunkPosition, Local: LocalChunkPosition): number {

        const cache = this.tieCache.get(Vector2ToString(Chunk));
        if (cache === undefined) {
            return 0.5;
        } else {
            return cache[idx2D(Local)];
        }

    }
    getTieBreakerNoiseFull(fullPos: Vector3): number {
        const chunkPos = ChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        const local = LocalChunkPosition.fromWorld({x: fullPos.x, y: fullPos.z});
        return this.getTieBreakerNoise(chunkPos, local);
    }
    
    private generateBiomeData(
        heightmap: Int16Array,
        climateNoise: Float32Array,
        tieBreakerNoise: Float32Array
    ): Int16Array {
        let biomeData = new Int16Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);

        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                const index = idx2D(new Vec2(x, z));
                biomeData[index] = biomeManager.getBiomeIndexNew(
                    climateNoise[index],
                    heightmap[index],
                    tieBreakerNoise[index]
                );
            }
        }
        return biomeData;
    }

    private checkHeightExtremes(largest: number, smallest: number) {
        if (largest > HEIGHT_MAX) {
            world.sendMessage(`Largest is higher than expected! ${largest}`);
        }
        if (smallest < HEIGHT_MIN) {
            world.sendMessage(`Smallest is lower than expected! ${smallest}`);
        }
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

export function pollNoise2D(pos: Vector2): number {
    let height = PerlinNoise2D(pos.x, pos.y, AMPLITUDE, FREQUENCY, OCTAVE_2D, PERSISTANCE, 1.7, 1.0)[0];
    height += BASE_OFFSET;
    return height
}

export let chunkNoiseProvider = new ChunkNoiseProvider();
