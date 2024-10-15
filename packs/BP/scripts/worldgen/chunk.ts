import { Dimension, Player, world } from "@minecraft/server";
import { Vec3, Vector3ToString } from "./Vec";
import { runJob } from "../job";
import { generate } from "./subchunk";
const CHUNK_RANGE = 4;
const Y_CHUNK_RANGE = 1;
export const SUBCHUNK_SIZE = 8;
let visited = new Set<String>();


function fetchUserSubchunk(player: Player): Vec3 {
    return new Vec3(Math.floor(player.location.x / SUBCHUNK_SIZE), Math.floor(player.location.y / SUBCHUNK_SIZE), Math.floor(player.location.z / SUBCHUNK_SIZE));
}


function buildSubChunk(dimension: Dimension, chnk: Vec3) {
    if (visited.has(Vector3ToString(chnk))) {
        return;
    }

    visited.add(Vector3ToString(chnk));

    runJob(generate(chnk.toWorld(), chnk.toWorld().nudge(SUBCHUNK_SIZE),dimension));
}

export function handlePlayer(player: Player, dimension: Dimension) {
    const chnk = fetchUserSubchunk(player);
    for (let x = -CHUNK_RANGE; x < CHUNK_RANGE; x++) {
        for (let z = -CHUNK_RANGE; z < CHUNK_RANGE; z++) {
            for (let y = -Y_CHUNK_RANGE; y < Y_CHUNK_RANGE; y++) {
            buildSubChunk(dimension, new Vec3(chnk.x + x, chnk.y+y, chnk.z + z ));
            buildSubChunk(dimension, new Vec3(chnk.x + x, chnk.y, chnk.z + z));
        }
    }
    }
}