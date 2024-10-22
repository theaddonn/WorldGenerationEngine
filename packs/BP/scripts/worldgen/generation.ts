import { Dimension, Player, Vector2 } from "@minecraft/server";
import { buildChunk, CHUNK_RANGE, ChunkPosition, } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./Vec";
import { runJob } from "../job";
import { debug } from "./debug";

export let visitedChunks = new Set<String>();
export let MAX_BUILDING_CHUNKS = 100;

export function setMaxBuildingChunks(val: number) {
    MAX_BUILDING_CHUNKS = val;
}
export let currentChunkBuildCount = 0;

export function removeChunk() {
    currentChunkBuildCount--;

    for (; currentChunkBuildCount < 0; currentChunkBuildCount++) {}
}
export function addChunk() {
    currentChunkBuildCount++;
}

export function bailGeneration(pos: Vector2) {
    removeChunk();
    visitedChunks.delete(Vector2ToString(pos));
}

function dispatchChunkGen(pos: ChunkPosition, dim: Dimension) {
    debug.update(`Queue out of ${MAX_BUILDING_CHUNKS}`, currentChunkBuildCount);
    if (visitedChunks.has(Vector2ToString(pos))) {
        return;
    }
    if (currentChunkBuildCount >= MAX_BUILDING_CHUNKS) {
        return;
    }
    addChunk();

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
