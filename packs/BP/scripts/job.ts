import { system, world } from "@minecraft/server";

const job_ids: (number | null)[] = [];


export function runJob(e: Generator<void, void, void>) {
    job_ids.push(system.runJob(e));
}

export function clearJobs() {
  for (const job_id of job_ids) {
    if (job_id == null) {
      continue;
    }
    system.clearJob(job_id);
  }
}

export function stopJob(id: number) {

  for (let job_id of job_ids) {
    if (job_id == id) {
      job_id = null;
      system.clearJob(id);
    }
  }
}