import { ModalFormData } from "@minecraft/server-ui";
import { SEED } from "./noise";
import { MAX_BUILDING_CHUNKS } from "./generation";
import { CHUNK_RANGE, SUBCHUNK_SIZE } from "./chunk";
import { AMPLITUDE, BASE_OFFSET, FREQUENCY, OCTAVE_2D, PERSISTANCE } from "./ChunkNoiseProvider";
import { Player } from "@minecraft/server";

async function configure(player: Player) {
    let form = new ModalFormData()
        .title("Config")
        .slider("MAX_BUILDING_CHUNKS", 0, 200, 10, MAX_BUILDING_CHUNKS)
        .textField("SEED", "", SEED.toString())
        .slider("SUBCHUNK_SIZE", 0, 96, 4, SUBCHUNK_SIZE)
        .slider("CHUNK_RANGE", 0, 12, 1, CHUNK_RANGE)
        .slider("OCTAVE_2D", 0, 12, 1, OCTAVE_2D)
        .slider("AMPLITUDE", 0, 100, 5, AMPLITUDE)
        .slider("FREQUENCY", 0, 0.02, 0.0005, FREQUENCY)
        .slider("BASE_OFFSET", 0, 200, 10, BASE_OFFSET)
        .slider("PERSISTANCE", 0, 1, 0.1, PERSISTANCE);

    let response = await form.show(player);

    if (response.formValues === undefined) {
        return;
    }

    MAX_BUILDING_CHUNKS = response.formValues![0] as number;
    SEED = response.formValues![0] as string;
    SUBCHUNK_SIZE = response.formValues![0] as number;
    CHUNK_RANGE = response.formValues![0] as number;
    OCTAVE_2D = response.formValues![0] as number;
    AMPLITUDE = response.formValues![0] as number;
    FREQUENCY = response.formValues![0] as number;
    BASE_OFFSET = response.formValues![0] as number;
    PERSISTANCE = response.formValues![0] as number;
}
