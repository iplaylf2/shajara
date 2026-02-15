import type { RuntimeInstruction } from "#src/runtime-instruction";

function* cede(): Generator<RuntimeInstruction, void, unknown> {
  yield { kind: "cede" };
}

export { cede };
