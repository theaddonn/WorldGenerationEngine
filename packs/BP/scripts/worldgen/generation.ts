import { Dimension, Player, Vector2, world } from "@minecraft/server";
import { buildChunk, CHUNK_RANGE, ChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./Vec";
import { runJob } from "../job";
import { idx2D } from "./util";

export let visitedChunks = new Set<String>();
export const MAX_BUILDING_CHUNKS = 100;
export let currentChunkBuildCount = 0;

export function removeChunk() {
    currentChunkBuildCount--;
}

export function bailGeneration(pos: Vector2) {
    removeChunk();
    visitedChunks.delete(Vector2ToString(pos));
}

function dispatchChunkGen(pos: ChunkPosition, dim: Dimension) {
    if (visitedChunks.has(Vector2ToString(pos))) {
        return;
    }
    if (currentChunkBuildCount >= MAX_BUILDING_CHUNKS) {
        return;
    }
    currentChunkBuildCount++;

    visitedChunks.add(Vector2ToString(pos));

    runJob(buildChunk(pos, dim));
}

export function managePlayer(player: Player, dim: Dimension) {
    const playerChunk = ChunkPosition.fromWorld(new Vec2(player.location.x, player.location.z));
    let queue = new Array<ChunkPosition>();
    for (let x = -CHUNK_RANGE; x < CHUNK_RANGE; x++) {
        for (let z = -CHUNK_RANGE; z < CHUNK_RANGE; z++) {
            queue.push(new ChunkPosition(playerChunk.x + x, playerChunk.y + z));
        }
    }

    queue.sort((a, b) => {
        let aDist = playerChunk.distance(a);
        let bDist = playerChunk.distance(b);
        return aDist - bDist;
    });

    for (const pos of queue) {
        dispatchChunkGen(pos, dim);
    }
}
