import { Dimension, Player, Vector2, world } from "@minecraft/server";
import { buildChunk, CHUNK_RANGE, ChunkPosition, } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./Vec";
import { runJob } from "../job";
import { debug } from "./debug";

export let MAX_BUILDING_CHUNKS = 100;

export function setMaxBuildingChunks(val: number) {
    MAX_BUILDING_CHUNKS = val;
}
export let currentChunkBuildCount = 0;

export function removeChunk() {
    currentChunkBuildCount--;

    for (; currentChunkBuildCount < 0; currentChunkBuildCount++) {}
}
export function addWorkingChunk(pos: ChunkPosition) {
    workingChunks.add(Vector2ToString(pos));
    currentChunkBuildCount++;
}

export function bailGeneration(pos: Vector2) {
    removeChunk();
    workingChunks.delete(Vector2ToString(pos));
}

export enum ChunkStage {
    None = 0,
    BaseLayer,
    DownStack,
    Decorate,
    Finished
}
export let visitedChunks = new Map<String, ChunkStage>();
export let workingChunks = new Set<String>();

export function advanceStage(position: ChunkPosition, stage: ChunkStage): ChunkStage {
    stage++;
    visitedChunks.set(Vector2ToString(position), stage);
    return stage;
}

export function finishChunk(pos: ChunkPosition, state: ChunkStage) {
    if (state+1 !== ChunkStage.Finished) {
        world.sendMessage(`Stage when finished doesnt equal finished ${state} ${ChunkStage.Finished}`);
    }
    advanceStage(pos, state)
    workingChunks.delete(Vector2ToString(pos));
    removeChunk();
}


function dispatchChunkGen(pos: ChunkPosition, dim: Dimension) {
    debug.update(`Queue out of ${MAX_BUILDING_CHUNKS}`, currentChunkBuildCount);
    if (workingChunks.has(Vector2ToString(pos))) {
        return;
    }
    if (currentChunkBuildCount >= MAX_BUILDING_CHUNKS) {
        return;
    }

    let visitState = visitedChunks.get(Vector2ToString(pos));
    if (visitState === undefined) {
        visitState = ChunkStage.None
    }
    if (visitState === ChunkStage.Finished) {
        return;
    }



    addWorkingChunk(pos);

    runJob(buildChunk(pos, dim, visitState));
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
