import { Vector2, Vector3, world } from "@minecraft/server";
import { SUBCHUNK_SIZE } from "./chunk";

export function idx2D(pos: Vector2 | Vector3) {
    return pos.x * SUBCHUNK_SIZE + pos.y;
}

export function throwError(err: Error): never {
    throw err
}