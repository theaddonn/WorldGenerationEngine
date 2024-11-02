import { Dimension, Player, Vector2, world } from "@minecraft/server";
import { CHUNK_RANGE, ChunkPosition, WorldChunk } from "./chunk";
import { Vec2, Vec3, Vector2ToString } from "./Vec";
import { runJob } from "../job";
import { debug } from "./debug";
import { SliderConfig, terrainConfig } from "./config";
import { jsonBlob, readStringFromWorld, writeStringToWorld } from "../serialize";
import { ChunkNoiseProvider } from "./ChunkNoiseProvider";
import { BiomeList } from "./biome";
import { WGEStructureManager } from "./structure";

export let MAX_BUILDING_CHUNKS = 121;

export function initGenConfig() {
    terrainConfig.addConfigOption(
        "Max building chunks",
        new SliderConfig(
            10,
            1000,
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

export enum ChunkStage {
    None = 0,
    BaseLayer,
    DownStack,
    Decorate,
    Structure,
    HardSurface,
    Finished,
}

export class GenerationProvider {
    dim: Dimension;
    private visitedChunks: Map<String, ChunkStage>;
    private workingChunks: Set<string>;
    private currentChunkBuildCount = 0;
    sr: WGEStructureManager;
    bm: BiomeList;
    cnp: ChunkNoiseProvider;

    constructor(
        targetDimension: Dimension,
        onRegisterStructures?: (gp: GenerationProvider, sm: WGEStructureManager) => void,
        onRegisterBiomes?: (gp: GenerationProvider, bm: BiomeList) => void
    ) {
        this.dim = targetDimension;
        this.visitedChunks = new Map();
        this.workingChunks = new Set();
        this.currentChunkBuildCount = 0;

        this.bm = new BiomeList();
        if (onRegisterBiomes !== undefined) {
            onRegisterBiomes(this, this.bm);
        }

        this.sr = new WGEStructureManager();
        if (onRegisterStructures !== undefined) {
            onRegisterStructures(this, this.sr);
        }

        this.cnp = new ChunkNoiseProvider(this.bm);
        this.loadVisitedCaches();
    }

    handlePlayer(player: Player) {
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
            this.dispatchChunkGen(pos);
        }
    }

    dispatchChunkGen(pos: ChunkPosition) {
        if (this.workingChunks.has(Vector2ToString(pos))) {
            return;
        }
        if (this.currentChunkBuildCount >= MAX_BUILDING_CHUNKS) {
            return;
        }
        let visitState = this.visitedChunks.get(Vector2ToString(pos));
        if (visitState === undefined) {
            visitState = ChunkStage.None;
        } else if (visitState === ChunkStage.Finished) {
            return;
        }

        this.addWorkingChunk(pos);
        let chnk = new WorldChunk(pos, this.dim, this.cnp, this.bm, visitState, this.sr, this);
        runJob(chnk.generate());
    }

    finishChunk(pos: ChunkPosition, state: ChunkStage) {
        if (state + 1 !== ChunkStage.Finished) {
            world.sendMessage(`Stage when finished doesnt equal finished ${state} ${ChunkStage.Finished}`);
        }
        this.advanceStage(pos, state);
        this.workingChunks.delete(Vector2ToString(pos));
        this.removeChunk();
    }

    advanceStage(position: ChunkPosition, stage: ChunkStage): ChunkStage {
        stage++;
        this.visitedChunks.set(Vector2ToString(position), stage);
        return stage;
    }

    removeChunk() {
        this.currentChunkBuildCount--;

        for (; this.currentChunkBuildCount < 0; this.currentChunkBuildCount++) {}
    }

    bailGeneration(pos: Vector2) {
        this.removeChunk();
        this.workingChunks.delete(Vector2ToString(pos));
    }
    addWorkingChunk(pos: ChunkPosition) {
        this.workingChunks.add(Vector2ToString(pos));
        this.currentChunkBuildCount++;
    }

    debug() {
        debug.update(`Current queue out of ${MAX_BUILDING_CHUNKS}`, this.currentChunkBuildCount);
    }
    saveVisitedCaches() {
        let blob: jsonBlob = {};
        for (const [key, stage] of this.visitedChunks) {
            blob[key as string] = stage;
        }
        writeStringToWorld("VISITED_CHUNK_MARKERS", JSON.stringify(blob));
    }
    loadVisitedCaches() {
        this.visitedChunks = new Map<String, ChunkStage>();
        const visitedBlob = readStringFromWorld("VISITED_CHUNK_MARKERS");
        if (visitedBlob === undefined) {
            console.log(`No Saved Chunks In Cache. Assuming New World`);
            return;
        }
        const out = JSON.parse(visitedBlob);

        for (const key in out) {
            const val = out[key];
            this.visitedChunks.set(key, val);
        }
    }

    drop() {
        this.visitedChunks.clear();
        this.workingChunks.clear();
    }
}
