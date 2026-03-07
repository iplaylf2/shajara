import type { RiteRoutine, RiteCoroutine, ScopeRef } from "@shajara/host";
import { action, channel, contextKey, sleep, until } from "@shajara/host";
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
} from "@shajara/host/primitives";
import type { HostResourceProvide } from "@shajara/host/primitives";

function getExampleScenario(name: ExampleScenarioName): RiteRoutine<unknown> {
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
} satisfies Record<string, RiteRoutine<unknown>>;

type ExampleScenarioName = keyof typeof EXAMPLE_SCENARIOS;

function* scopedBlueprint(): RiteCoroutine<void> {
  const scopedResult = yield* scoped(scopedBodyBlueprint);
  consume(scopedResult);
}

function* spawnBlueprint(): RiteCoroutine<void> {
  const spawned = yield* spawn(childBlueprint);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* resourceBlueprint(): RiteCoroutine<void> {
  const providedValue = yield* resource(resourceBodyBlueprint);
  consume(providedValue);
}

function* scopedBodyBlueprint(): RiteCoroutine<string> {
  const bodyResult = yield* resumable(childBlueprint);
  return bodyResult;
}

function* childBlueprint(): RiteCoroutine<string> {
  yield* cede();
  return "child done";
}

function* resourceBodyBlueprint(provide: HostResourceProvide<string>): RiteCoroutine<void> {
  const resourceValue = "resource-ready";

  try {
    yield* provide(resourceValue);
  } finally {
    // Cleanup path: should run when parent scope reclaims this resource scope.
    yield* cede();
  }
}

function* allBlueprint(): RiteCoroutine<void> {
  const bothDone = yield* all([cede, cede] as const);
  consume(bothDone);
}

function* raceBlueprint(): RiteCoroutine<void> {
  const winner = yield* race([cede, cede] as const);
  consume(winner);
}

function* actionResolveBlueprint(): RiteCoroutine<void> {
  const pending = yield* action<string>();
  pending.resolve("action done");
  const value = yield* join(pending.scope);
  consume(value);
}

function* bindLookupBlueprint(): RiteCoroutine<void> {
  yield* bind(TRACE_ID_KEY, "request-1");
  const traceId = yield* lookup(TRACE_ID_KEY);
  consume(traceId);
  yield* unbind(TRACE_ID_KEY);
}

function* sendReceiveBlueprint(): RiteCoroutine<void> {
  const { scopeRef: callerRef } = yield* self();
  const spawned = yield* spawn(() => senderBlueprint(callerRef));
  const { value } = yield* receive(EXAMPLE_MESSAGE_CHANNEL);
  consume(value);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* selfBlueprint(): RiteCoroutine<void> {
  const descriptor = yield* self();
  consume(descriptor);
}

function* untilBlueprint(): RiteCoroutine<void> {
  const value = yield* until(() => Promise.resolve("until done"));
  consume(value);
}

function* sleepBlueprint(): RiteCoroutine<void> {
  yield* sleep(EXAMPLE_SLEEP_MILLISECONDS);
}

function* runBlueprint(): RiteCoroutine<string> {
  yield* cede();
  return "run done";
}

function* senderBlueprint(callerRef: ScopeRef<unknown>): RiteCoroutine<"sent"> {
  yield* send(callerRef, EXAMPLE_MESSAGE_CHANNEL, "message from child");
  return "sent";
}

function* haltBlueprint(): RiteCoroutine<never> {
  yield* halt();
  throw new Error("Not implemented: halt() never returns.");
}

function* suspendBlueprint(): RiteCoroutine<never> {
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
