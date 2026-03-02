import type { RuntimeBlueprint, RuntimePlan, ScopeRef } from "@khora/runtime";
import { action, channel, contextKey, sleep, until } from "@khora/runtime";
import {
  all,
  bind,
  cede,
  halt,
  join,
  lookup,
  race,
  receive,
  resource,
  resumable,
  scoped,
  self,
  send,
  spawn,
  suspend,
  unbind,
} from "@khora/runtime/primitives";
import type { RuntimeResourceProvide } from "@khora/runtime/primitives";

function getExampleScenario(name: ExampleScenarioName): RuntimeBlueprint<unknown> {
  return EXAMPLE_SCENARIOS[name];
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
  sendReceive: sendReceiveBlueprint,
  sleep: sleepBlueprint,
  spawn: spawnBlueprint,
  suspend: suspendBlueprint,
  until: untilBlueprint,
} satisfies Record<string, RuntimeBlueprint<unknown>>;

type ExampleScenarioName = keyof typeof EXAMPLE_SCENARIOS;

function* scopedBlueprint(): RuntimePlan<void> {
  const scopedResult = yield* scoped(scopedBodyBlueprint);
  consume(scopedResult);
}

function* spawnBlueprint(): RuntimePlan<void> {
  const spawned = yield* spawn(childBlueprint);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* resourceBlueprint(): RuntimePlan<void> {
  const providedValue = yield* resource(resourceBodyBlueprint);
  consume(providedValue);
}

function* scopedBodyBlueprint(): RuntimePlan<string> {
  const bodyResult = yield* resumable(childBlueprint);
  return bodyResult;
}

function* childBlueprint(): RuntimePlan<string> {
  yield* cede();
  return "child done";
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

function* allBlueprint(): RuntimePlan<void> {
  const bothDone = yield* all([cede, cede] as const);
  consume(bothDone);
}

function* raceBlueprint(): RuntimePlan<void> {
  const winner = yield* race([cede, cede] as const);
  consume(winner);
}

function* actionResolveBlueprint(): RuntimePlan<void> {
  const pending = yield* action<string>();
  pending.resolve("action done");
  const value = yield* join(pending.scope);
  consume(value);
}

function* bindLookupBlueprint(): RuntimePlan<void> {
  yield* bind(TRACE_ID_KEY, "request-1");
  const traceId = yield* lookup(TRACE_ID_KEY);
  consume(traceId);
  yield* unbind(TRACE_ID_KEY);
}

function* sendReceiveBlueprint(): RuntimePlan<void> {
  const { scopeRef: callerRef } = yield* self();
  const spawned = yield* spawn(() => senderBlueprint(callerRef));
  const { value } = yield* receive(EXAMPLE_MESSAGE_CHANNEL);
  consume(value);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* selfBlueprint(): RuntimePlan<void> {
  const descriptor = yield* self();
  consume(descriptor);
}

function* untilBlueprint(): RuntimePlan<void> {
  const value = yield* until(() => Promise.resolve("until done"));
  consume(value);
}

function* sleepBlueprint(): RuntimePlan<void> {
  yield* sleep(EXAMPLE_SLEEP_MILLISECONDS);
}

function* runBlueprint(): RuntimePlan<string> {
  yield* cede();
  return "run done";
}

function* senderBlueprint(callerRef: ScopeRef<unknown>): RuntimePlan<"sent"> {
  yield* send(callerRef, EXAMPLE_MESSAGE_CHANNEL, "message from child");
  return "sent";
}

function* haltBlueprint(): RuntimePlan<never> {
  yield* halt();
  throw new Error("Not implemented: halt() never returns.");
}

function* suspendBlueprint(): RuntimePlan<never> {
  yield* suspend();
  throw new Error("Not implemented: suspend() only resumes as failure.");
}

function consume<Value>(value: Value): Value {
  return value;
}

const EXAMPLE_SLEEP_MILLISECONDS = 10;
const TRACE_ID_KEY = contextKey<string>();
const EXAMPLE_MESSAGE_CHANNEL = channel<string>();

export { EXAMPLE_SCENARIOS, getExampleScenario };
export type { ExampleScenarioName };
