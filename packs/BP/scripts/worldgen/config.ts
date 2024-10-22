import { ModalFormData } from "@minecraft/server-ui";
import { MAX_BUILDING_CHUNKS, setMaxBuildingChunks } from "./generation";
import { CHUNK_RANGE, SUBCHUNK_SIZE, setChunkRange, setSubchunkSize } from "./chunk";
import { AMPLITUDE, BASE_OFFSET, FREQUENCY, OCTAVE_2D, PERSISTANCE, setAmplitude, setOctave2D, setPersistance, setBaseOffset, setFrequency } from "./ChunkNoiseProvider";
import { Player } from "@minecraft/server";

export async function configure(player: Player) {
    let form = new ModalFormData()
        .title("Config")
        .slider("MAX_BUILDING_CHUNKS", 0, 200, 10, MAX_BUILDING_CHUNKS)
        .slider("CHUNK_RANGE", 0, 12, 1, CHUNK_RANGE)
        .slider("OCTAVE_2D", 0, 12, 1, OCTAVE_2D)
        .slider("AMPLITUDE", 0, 100, 5, AMPLITUDE)
        .slider("FREQUENCY", 0, 0.02 * 1000, 0.0005, FREQUENCY * 1000)
        .slider("BASE_OFFSET", 0, 200, 10, BASE_OFFSET)
        .slider("PERSISTANCE", 0, 1 * 100, 0.1, PERSISTANCE * 100);

    let response = await form.show(player);

    if (response.formValues === undefined) {
        return;
    }

    setMaxBuildingChunks(response.formValues![0] as number);
    setChunkRange(response.formValues![1] as number);
    setOctave2D(response.formValues![2] as number);
    setAmplitude(response.formValues![3] as number);
    setFrequency(response.formValues![4] as number / 1000);
    setBaseOffset(response.formValues![5] as number);
    setPersistance(response.formValues![6] as number / 100);

}
