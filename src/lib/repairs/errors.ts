import type { MoveProblem } from "./state-machine";

export type RepairProblem =
  MoveProblem | "not_found" | "nothing_to_undo" | "cannot_quote" | "stale_quote" | "empty_update";

export class RepairError extends Error {
  override name = "RepairError";
  constructor(readonly problem: RepairProblem) {
    super(problem);
  }
}
