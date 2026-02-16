import type { RuntimeBlueprint, RuntimePlan } from "@khora/runtime";
import { action, sleep, until } from "@khora/runtime";
import {
  all,
  bind,
  cede,
  halt,
  join,
  lookup,
  race,
  resource,
  resumable,
  scoped,
  self,
  spawn,
  suspend,
  terminate,
} from "@khora/runtime/primitives";
import type { RuntimeResourceProvide } from "@khora/runtime/primitives";

function consume<Value>(value: Value): Value {
  return value;
}

function* childBlueprint(): RuntimePlan<string> {
  yield* cede();
  return "child done";
}

function* runBlueprint(): RuntimePlan<string> {
  yield* cede();
  return "run done";
}

function* spawnBlueprint(): RuntimePlan<void> {
  const spawned = yield* spawn(childBlueprint);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* allBlueprint(): RuntimePlan<void> {
  const bothDone = yield* all([cede, cede] as const);
  consume(bothDone);
}

function* raceBlueprint(): RuntimePlan<void> {
  const winner = yield* race([cede, cede] as const);
  consume(winner);
}

function* onResumableError(error: Error): RuntimePlan<string> {
  consume(error);
  yield* cede();
  return "scoped fallback";
}

function* scopedBodyBlueprint(): RuntimePlan<string> {
  const bodyResult = yield* resumable(childBlueprint);
  return bodyResult;
}

function* scopedBlueprint(): RuntimePlan<void> {
  const scopedResult = yield* scoped(scopedBodyBlueprint, onResumableError);
  consume(scopedResult);
}

function* terminateBlueprint(): RuntimePlan<void> {
  const spawned = yield* spawn(childBlueprint);
  yield* terminate(spawned);
}

function* bindLookupBlueprint(): RuntimePlan<void> {
  yield* bind("traceId", "request-1");
  const traceId = yield* lookup<string>("traceId");
  consume(traceId);
}

function* selfBlueprint(): RuntimePlan<void> {
  const descriptor = yield* self();
  consume(descriptor);
}

function* haltBlueprint(): RuntimePlan<never> {
  yield* halt();
  throw new Error("Not implemented: halt() never returns.");
}

function* suspendBlueprint(): RuntimePlan<never> {
  yield* suspend();
  throw new Error("Not implemented: suspend() only resumes as failure.");
}

function* resourceBodyBlueprint(provide: RuntimeResourceProvide<string>): RuntimePlan<void> {
  const resourceValue = "resource-ready";

  try {
    yield* provide(resourceValue);
  } finally {
    // Cleanup path: should run when parent scope reclaims this resource scope.
    yield* cede();
  }
}

function* resourceBlueprint(): RuntimePlan<void> {
  const providedValue = yield* resource(resourceBodyBlueprint);
  consume(providedValue);
}

function* actionResolveBlueprint(): RuntimePlan<void> {
  const pending = action<string>();
  pending.resolve("action done");
  const value = yield* join(pending.scope);
  consume(value);
}

function* sleepBlueprint(): RuntimePlan<void> {
  yield* sleep(10);
}

function* untilBlueprint(): RuntimePlan<void> {
  const scope = until(() => Promise.resolve("until done"));

  const value = yield* join(scope);
  consume(value);
}

const EXAMPLE_SCENARIOS = {
  actionResolve: actionResolveBlueprint,
  all: allBlueprint,
  bindLookup: bindLookupBlueprint,
  cede: childBlueprint,
  halt: haltBlueprint,
  join: spawnBlueprint,
  race: raceBlueprint,
  resource: resourceBlueprint,
  run: runBlueprint,
  scoped: scopedBlueprint,
  self: selfBlueprint,
  sleep: sleepBlueprint,
  spawn: spawnBlueprint,
  suspend: suspendBlueprint,
  terminate: terminateBlueprint,
  until: untilBlueprint,
} satisfies Record<string, RuntimeBlueprint<unknown>>;

type ExampleScenarioName = keyof typeof EXAMPLE_SCENARIOS;

function getExampleScenario(name: ExampleScenarioName): RuntimeBlueprint<unknown> {
  return EXAMPLE_SCENARIOS[name];
}

export { EXAMPLE_SCENARIOS, getExampleScenario };
export type { ExampleScenarioName };
