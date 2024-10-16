import { Block, Vector2 } from "@minecraft/server";
import { ChunkPosition, LocalChunkPosition, SUBCHUNK_SIZE } from "./chunk";

export class BlockPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static fromChunk(pos: Vector2): BlockPosition {
        return new BlockPosition(Math.floor(pos.x * SUBCHUNK_SIZE), Math.floor(pos.y * SUBCHUNK_SIZE));
    }
    static fromVec(pos: Vector2): BlockPosition {
        return new BlockPosition(pos.x, pos.y);
    }

    toChunk(): ChunkPosition {
        return ChunkPosition.fromWorld(this);
    }

    toLocalChunk(): LocalChunkPosition {
        return new LocalChunkPosition(this.x % SUBCHUNK_SIZE, this.y % SUBCHUNK_SIZE);
    }
}

export const WorldGenBlockTypes = ["deepslate", "stone", "dirt", "grass", "short_grass", "air"];

export enum WorldGenBlockType {
    Deepslate = 0,
    Stone,
    Dirt,
    Grass,
    GrassShort,
    Air,
}
