import { Dimension, Player, Vector2, world } from "@minecraft/server";
import { buildChunk, CHUNK_RANGE, ChunkPosition } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./vec";
import { runJob } from "../job";
import { debug } from "./debug";
import { SliderConfig, terrainConfig } from "./config";
import { jsonBlob, readStringFromWorld, writeStringToWorld } from "../serialize";

export let MAX_BUILDING_CHUNKS = 100;

export function initGenConfig() {
    terrainConfig.addConfigOption(
        "Max building chunks",
        new SliderConfig(
            10,
            20000,
            1,
            () => {
                return MAX_BUILDING_CHUNKS;
            },
            (val) => {
                MAX_BUILDING_CHUNKS = val;
            }
        )
    );
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
    Structure,
    HardSurface,
    Finished,
}

export let visitedChunks: Map<String, ChunkStage>;
export let workingChunks = new Set<string>();

export function advanceStage(position: ChunkPosition, stage: ChunkStage): ChunkStage {
    stage++;
    visitedChunks.set(Vector2ToString(position), stage);
    return stage;
}

export function finishChunk(pos: ChunkPosition, state: ChunkStage) {
    if (state + 1 !== ChunkStage.Finished) {
        world.sendMessage(`Stage when finished doesnt equal finished ${state} ${ChunkStage.Finished}`);
    }

    advanceStage(pos, state);
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

    let isMidState = true;
    let visitState = visitedChunks.get(Vector2ToString(pos));

    if (visitState === undefined) {
        isMidState = false;
        visitState = ChunkStage.None;
    } else if (visitState === ChunkStage.Finished) {
        return;
    }

    addWorkingChunk(pos);

    runJob(buildChunk(pos, dim, visitState, isMidState));
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

export function saveVisitedCaches() {
    let blob: jsonBlob = {};

    for (const [key, stage] of visitedChunks) {
        blob[key as string] = stage;
    }

    writeStringToWorld("VISITED_CHUNK_MARKERS", JSON.stringify(blob));
}

export function loadVisitedCaches() {
    visitedChunks = new Map<String, ChunkStage>();

    const visitedBlob = readStringFromWorld("VISITED_CHUNK_MARKERS");

    if (visitedBlob === undefined) {
        console.log(`No Saved Chunks In Cache. Assuming New World`);
        return;
    }

    const out = JSON.parse(visitedBlob);

    for (const key in out) {
        const val = out[key];
        visitedChunks.set(key, val);
    }
}
