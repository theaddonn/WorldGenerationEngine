import { Vector2, Vector3, world } from "@minecraft/server";
import { Chunk, ChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { idx2D } from "./util";
import { PerlinNoise2D } from "./noise";
import { Vec2, Vector2ToString } from "./Vec";
import { BlockPosition } from "./block";


const OCTAVE_2D = 5
const AMPLITUDE = 50;
const FREQ = 0.0075


class ChunkHeightNoise {
    values: Int16Array;
    highestPoint: number;

    constructor(values: Int16Array, highestPoint: number) {
        this.values = values;
        this.highestPoint = highestPoint;
    }

    get(pos: Vector2): number {
        return this.values[idx2D(pos)];
    }
}


class ChunkNoiseProvider {
    chunkHeightmap: Map<String, ChunkHeightNoise>;
    constructor() {
        this.chunkHeightmap = new Map();
    }


    *getChunkHeightMap(pos: Vector2): Generator<number> {
        const heightMap = this.getOrCacheChunkHeight(pos);
        for (pos of Chunk.iterOverBlocksWorld(pos)) {
            yield heightMap.get(pos);
        }
    }

    *tiedChunkHeightMap(pos: ChunkPosition): Generator<{ world: BlockPosition, val: number}> {
        const heightMap = this.getOrCacheChunkHeight(pos);
        for (let {world, local} of Chunk.iterOverBlocksWorldLocal(pos)) {
            yield {
                world: BlockPosition.fromVec(world), val: heightMap.get(local)
            };
        }
    }

    getHighestPointForChunk(pos: Vector2): number {
        const heightMap = this.getOrCacheChunkHeight(pos);
        return heightMap.highestPoint
    }


    computeChunkHeightmap(pos: Vector2): ChunkHeightNoise {
        let returnArray = new Int16Array(SUBCHUNK_SIZE * SUBCHUNK_SIZE);
        let largest = -29138712983; // Some big chonker 
        for (let x = 0; x < SUBCHUNK_SIZE; x++) {
            for (let z = 0; z < SUBCHUNK_SIZE; z++) {
                let val = pollNoise2D(new Vec2(pos.x * SUBCHUNK_SIZE + x, pos.y *SUBCHUNK_SIZE + z));
                if (val > largest) {
                    largest = val;
                }
                returnArray[idx2D({x: x, y: z})] = val
            }
        }

        for (let ele of returnArray) {
        }

        let returnChunk = new ChunkHeightNoise(returnArray, largest);

        this.chunkHeightmap.set(Vector2ToString(pos), returnChunk);
        return returnChunk;
    }



    getOrCacheChunkHeight(pos: Vector2): ChunkHeightNoise {
        if (!this.chunkHeightmap.has(Vector2ToString(pos))) {
            return this.computeChunkHeightmap(pos);
        } else {
            const val = this.chunkHeightmap.get(Vector2ToString(pos));
            if (val == undefined) {
                throw new Error("Somehow This Happned??????????????");
            }
            return val;
        }
    }

}

export function pollNoise2D(pos: Vector2): number {
    return PerlinNoise2D(pos.x , pos.y, AMPLITUDE, FREQ, OCTAVE_2D, 0.5, 1.7) + 50;
}


export let chunkNoiseProvider = new ChunkNoiseProvider();



