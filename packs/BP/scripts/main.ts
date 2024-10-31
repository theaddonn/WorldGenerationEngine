import { Player, system, Vector3, world } from "@minecraft/server";
import { initGenConfig, GenerationProvider } from "./worldgen/generation";
import { registerBiomes } from "./worldgen/biomes";
import { terrainConfig, ToggleConfig } from "./worldgen/config";
import { initChunkNoiseProviderConfig } from "./worldgen/ChunkNoiseProvider";
import { initDebugConfig, manageDebugPlayer } from "./worldgen/debug";
import { ChunkPosition, initChunkConfig } from "./worldgen/chunk";
import { runJob } from "./job";
import { Vec2 } from "./worldgen/Vec";
import { initCacheConfig, initLimits, performCacheCleanup } from "./worldgen/cache";
import { initBiomeConfig } from "./worldgen/biome";
import { decodeWorldToJson, deleteWorldInfo, dumpJson, writeJsonToWorld } from "./serialize";
import { initNoiseConfig } from "./worldgen/noise";
import { initRandom } from "./worldgen/random";
import { registerStructures } from "./worldgen/structures";

export let mainLocation: Vector3;
let dim = world.getDimension("overworld");
let gp = new GenerationProvider(dim);

registerBiomes(gp);
registerStructures(gp.sr);
gp.sr.buildIndexes(gp.bm.allbiomes());
initLimits();
initRandom();


export function saveConfig(enableLog?: boolean) {
    writeJsonToWorld("WGE_CONFIG_DATA", terrainConfig.serializeToJson(), enableLog);
}
function loadConfig(enableLog?: boolean) {
    const config = decodeWorldToJson("WGE_CONFIG_DATA", enableLog);
    if (config !== undefined) {
        console.info("Config found! To clear please open the config pannel and toggle config clear");
        if (enableLog) {
            dumpJson(config);
        }
        terrainConfig.loadFromJson(config);
    } else {
        console.info("No config information found. Defaulting");
    }
}

function forceDropCache() {
    
    const location = dim.getPlayers()[0].location;
    const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z));
    runJob(gp.cnp.dropUselessInfo(start, 0.0));
    
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    switch (event.id) {
        case "wge:config": {
            terrainConfig.show(event.sourceEntity as Player).then(() => {});
            break;
        }
        case "wge:cache": {
            const location = dim.getPlayers()[0].location;
            const start = ChunkPosition.fromWorld(new Vec2(location.x, location.z));
            runJob(gp.cnp.dropUselessInfo(start, 0.5));
            break;
        }
        case "wge:dropcache": {
            forceDropCache();
            break;
        }
        case "wge:force_save": {
            saveConfig(true);
            break;
        }
        case "wge:force_load": {
            loadConfig(true);
            break;
        }
    }
});

system.beforeEvents.watchdogTerminate.subscribe((arg) => {
    console.warn(`Cancled watchdog terminate! ${arg.terminateReason}`);
    arg.cancel = true;
});
system.runInterval(() => {
    dim.getPlayers().forEach((player) => {
        mainLocation = player.location;
        gp.handlePlayer(player);
        manageDebugPlayer(player, dim, gp);
    });
    performCacheCleanup(gp);
}, 0);


function initMainConfig() {
    let clearSaved = false;
    let forceCompaction = false;
    let dropVisited = false;
    terrainConfig.addConfigOption(
        "Delete Saved Config",
        new ToggleConfig(
            false,
            (val) => {
                clearSaved = val;
            }
        )
    ).addClosedCallback(() => {
        if (clearSaved) {
            clearSaved = false;
            world.sendMessage("Clearing saved data");
            deleteWorldInfo("WGE_CONFIG_DATA");
            world.sendMessage("Cleared save data!");
        }
    }).addConfigOption(
        "Force Cache Compaction",
        new ToggleConfig(
            false,
            (val) => {
                forceCompaction = val;
            }
        )
    ).addClosedCallback(() => {
        if (!forceCompaction) {
            return;
        }
        forceCompaction = false;
        performCacheCleanup(gp, true);
    }).addConfigOption(
        "Drop Visited Caches",
        new ToggleConfig(
            false,
            (val) => dropVisited=val
        )
    ).addClosedCallback(() => {
        if (!dropVisited) {
            return;
        }
        dropVisited = false;
        forceDropCache();
    });
}

world.afterEvents.worldInitialize.subscribe((_) => {
    initDebugConfig();
    initChunkConfig();
    initCacheConfig();
    initBiomeConfig();
    initNoiseConfig();
    initChunkNoiseProviderConfig();
    initGenConfig();
    initMainConfig();
    loadConfig();
});


world.beforeEvents.playerLeave.subscribe((_) => {
    if (world.getAllPlayers().length - 1 > 0) {
        return;
    }
    console.log("Saving");
    gp.saveVisitedCaches();
});