import { debug } from "./debug";

const randCap = 1024 * 1024;
let randArray = new Float32Array(randCap);
let pollIndex = 0;

function countFloats(arr) {
    let largeCount = 0;
    let smallCount = 0;

    arr.forEach((num) => {
        if (num > 0.99) {
            largeCount++;
        } else if (num < 0.1) {
            smallCount++;
        }
    });

    return { largeCount, smallCount };
}

export function initRandom() {
    for (let x = 0; x < randCap; x++) {
        randArray[x] = Math.random();
    }

    const obj = countFloats(randArray);
    console.log(`${obj.smallCount} ${obj.largeCount}`);
}

export function renderRandomDebug() {
    debug.update("Random Index", pollIndex);
}

export function random(): number {
    pollIndex = (pollIndex + 1) & 0x3ffff;
    return randArray[pollIndex];
}
