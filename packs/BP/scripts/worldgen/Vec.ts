import { Vector2, Vector3 } from "@minecraft/server";
import { SUBCHUNK_SIZE } from "./chunk";




export class Vec2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class Vec3 {
    y: number;
    z: number;
    x: number;

    constructor(x: number, y: number, z:number ) {
        this.x = x;
        this.y = y;
        this.z = z;
    }



    toWorld(): Vec3 {
        return new Vec3(this.x * SUBCHUNK_SIZE, this.y * SUBCHUNK_SIZE, this.z * SUBCHUNK_SIZE);
    }


    nudge(ammount: number): Vec3 {
        this.x += ammount;
        this.y += ammount;
        this.z += ammount;
        return this;
    }

    flatten(): Vec3 {
        return new Vec3(this.x, 0, this.z);
    }
}


export function Vector3ToString(vec: Vector3): String {
    return `${vec.x} ${vec.y} ${vec.z}`
}
export function Vector2ToString(vec: Vector2): String {
    return `${vec.x} ${vec.y}`
}