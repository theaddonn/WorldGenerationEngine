import { world } from "@minecraft/server";

export type jsonBlob = { [key: string]: any };
const splitThreshhold = 20_000;

function splitString(str: string): string[] {
    const segments: string[] = [];

    while (str.length > splitThreshhold) {
        segments.push(str.slice(0, splitThreshhold));
        str = str.slice(splitThreshhold);
    }

    if (str.length > 0) {
        segments.push(str);
    }

    return segments;
}
export function dumpJson(blob: jsonBlob) {
    for (const key in blob) {
        const val = blob[key];
        world.sendMessage(`${key}: ${val}`);
    }
}

export function writeJsonToWorld(key: string, blob: jsonBlob, enableLog?: boolean) {
    if (enableLog) {
        for (const key in blob) {
            const val = blob[key];
            world.sendMessage(`Writing: ${key} with val of ${val}`);
        }
    }
    const baseStr = JSON.stringify(blob);
    const slices = splitString(baseStr);
    world.setDynamicProperty(`${key}_count`, slices.length);
    if (enableLog) {
        world.sendMessage(`Slice count is: ${world.getDynamicProperty(`${key}_count`)}`);
    }

    for (let x = 0; x < slices.length; x++) {
        world.setDynamicProperty(`${key}_chunk_${x}`, slices[x]);
        if (enableLog) {
            world.sendMessage(`Wrote Chunk ${x}. Full string: ${world.getDynamicProperty(`${key}_chunk_${x}`)}`);
        }
    }
}

export function decodeWorldToJson(key: string, enableLog?: boolean): jsonBlob | undefined {
    const chunkCount = world.getDynamicProperty(`${key}_count`) as number | undefined;
    if (enableLog) {
        world.sendMessage(`${key} has ${chunkCount} chunks`);
    }
    if (chunkCount === undefined) {
        return undefined;
    }
    let jsonString = "";
    for (let x = 0; x < chunkCount; x++) {
        jsonString += world.getDynamicProperty(`${key}_chunk_${x}`) as string;
        if (enableLog) {
            world.sendMessage(`decoded ${key}_chunk_${x} as ${world.getDynamicProperty(`${key}_chunk_${x}`)}`);
        }
    }
    if (enableLog) {
        world.sendMessage(`${jsonString}`);
    }
    try {
        return JSON.parse(jsonString);
    } catch {
        console.error(`Mangled JSON for ${key}`);
        return undefined;
    }
}

export function writeStringToWorld(key: string, val: string, enableLog?: boolean) {
    const chunks = splitString(val);
    if (enableLog) {
        world.sendMessage(`${key} has ${chunks.length} chunks`);
    }
    world.setDynamicProperty(`${key}_string_count`, chunks.length);
    for (let x = 0; x < chunks.length; x++) {
        world.setDynamicProperty(`${key}_string_chunk_${x}`, chunks[x]);
        if (enableLog) {
            console.log(`${key}_string_chunk_${x} ${chunks[x]}`);
        }
    }
}

export function readStringFromWorld(key: string, enableLog?: boolean): string | undefined {
    const count = world.getDynamicProperty(`${key}_string_count`) as number | undefined;
    if (count === undefined) {
        return undefined;
    }
    if (enableLog) {
        world.sendMessage(`${key} has ${count} chunks`);
    }
    let retStr = "";
    for (let x = 0; x < count; x++) {
        retStr += world.getDynamicProperty(`${key}_string_chunk_${x}`) as string;
    }
    if (enableLog) {
        world.sendMessage(`${retStr}`);
    }
    return retStr;
}
export function deleteWorldInfo(key: string) {
    const chunkCount = world.getDynamicProperty(`${key}_count`) as number | undefined;
    if (chunkCount === undefined) {return;}
    for (let x = 0; x < chunkCount; x++) {
        world.setDynamicProperty(`${key}_chunk_${x}`, undefined);
    }
    world.setDynamicProperty(`${key}_count`, undefined);
}