import { Dimension, Player, world } from "@minecraft/server";
import { buildChunk, CHUNK_RANGE, ChunkPosition, SUBCHUNK_SIZE } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./Vec";
import { runJob } from "../job";
import { idx2D } from "./util";

export let visitedChunks = new Set<String>();

function dispatchChunkGen(pos: ChunkPosition, dim: Dimension) {
    if (visitedChunks.has(Vector2ToString(pos))) {
        return;
    }

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
