import { MemoryTier, system, world } from "@minecraft/server";
import { runJob } from "../job";
import {  } from "./ChunkNoiseProvider";
import { ChunkPosition } from "./chunk";
import { mainLocation } from "../main";
import { terrainConfig, TextConfig } from "./config";
import { GenerationProvider } from "./generation";

export let CacheClearLimit = 0xdeadbeef;
export let KeepPercent = 0.5;

export function initCacheConfig() {
    terrainConfig.addConfigOption(
        "Max Cached Chunks",
        new TextConfig(
            () => {
                return CacheClearLimit.toString();
            },
            () => {
                return CacheClearLimit.toString();
            },
            (val) => (CacheClearLimit = parseInt(val))
        )
    );
}

function* internalWrapper() {
    const systemTier = system.serverSystemInfo.memoryTier;

    while (CacheClearLimit === 0xdeadbeef) {
        switch (systemTier) {
            case MemoryTier.SuperLow: {
                console.warn(`WGE is being ran in massivly low memory mode. This will have huge performance impacts!`);
                CacheClearLimit = 1_000;
                KeepPercent = 0.03;
                return;
            }
            case MemoryTier.Low: {
                console.warn(
                    `WGE is being ran in a extremly low memory mode. This will have huge performance impacts!`
                );
                CacheClearLimit = 2_500;
                KeepPercent = 0.06;
                return;
            }
            case MemoryTier.Mid: {
                console.warn(`WGE is being ran in a low memory mode. This will have huge performance impacts!`);
                CacheClearLimit = 30_000;
                KeepPercent = 0.1;
                return;
            }
            case MemoryTier.High: {
                console.warn(`WGE is running in a medium memory state. Expect some performance issues!`);
                CacheClearLimit = 50_000;
                KeepPercent = 0.1;
                return;
            }
            case MemoryTier.SuperHigh: {
                console.log(`WGE is running in a high memory state.`);
                CacheClearLimit = 100_000;
                KeepPercent = 0.1;
                return;
            }
        }
        yield;
    }
}

export function initLimits() {
    runJob(internalWrapper());
}

let cleanupRunning = false;

export function performCacheCleanup(gp: GenerationProvider,force?: boolean) {
    if ((gp.cnp.getTotalCacheSize() > CacheClearLimit && !cleanupRunning) || force) {
        cleanupRunning = true;
        runJob(
            gp.cnp.dropUselessInfo(ChunkPosition.from3D(mainLocation), KeepPercent, () => {
                cleanupRunning = false;
            })
        );
    }
}

