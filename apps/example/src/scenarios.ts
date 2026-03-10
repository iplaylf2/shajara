import type { RiteCoroutine, RiteRoutine, ScopeRef } from "@shajara/host";
import { action, contextKey, messageKey, sleep, until } from "@shajara/host";
import {
  all,
  awaitFuture,
  bind,
  cede,
  halt,
  join,
  lookup,
  park,
  race,
  receive,
  resource,
  resumable,
  self,
  send,
  spawn,
  unbind,
} from "@shajara/host/primitives";
import type { HostResourceProvide } from "@shajara/host/primitives";

function getExampleScenario(name: ExampleScenarioName): RiteRoutine<unknown> {
  return EXAMPLE_SCENARIOS[name];
}

const EXAMPLE_SCENARIOS = {
  actionResolve: actionResolveRitual,
  all: allRitual,
  bindLookup: bindLookupRitual,
  cede: childRitual,
  halt: haltRitual,
  join: spawnRitual,
  park: parkRitual,
  race: raceRitual,
  resource: resourceRitual,
  resumable: resumableRitual,
  run: runRitual,
  self: selfRitual,
  sendReceive: sendReceiveRitual,
  sleep: sleepRitual,
  spawn: spawnRitual,
  until: untilRitual,
} satisfies Record<string, RiteRoutine<unknown>>;

type ExampleScenarioName = keyof typeof EXAMPLE_SCENARIOS;

function* spawnRitual(): RiteCoroutine<void> {
  const spawned = yield* spawn(childRitual);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* resourceRitual(): RiteCoroutine<void> {
  const providedValue = yield* awaitFuture(yield* resource(resourceBodyRitual));
  consume(providedValue);
}

function* resumableRitual(): RiteCoroutine<void> {
  const bodyResult = yield* awaitFuture(yield* resumable(childRitual));
  consume(bodyResult);
}

function* childRitual(): RiteCoroutine<string> {
  yield* cede();
  return "child done";
}

function* resourceBodyRitual(provide: HostResourceProvide<string>): RiteCoroutine<void> {
  const resourceValue = "resource-ready";

  try {
    yield* provide(resourceValue);
  } finally {
    // Cleanup path: should run when parent scope reclaims this resource scope.
    yield* cede();
  }
}

function* allRitual(): RiteCoroutine<void> {
  const bothDone = yield* awaitFuture(yield* all([cede, cede] as const));
  consume(bothDone);
}

function* raceRitual(): RiteCoroutine<void> {
  const winner = yield* awaitFuture(yield* race([cede, cede] as const));
  consume(winner);
}

function* actionResolveRitual(): RiteCoroutine<void> {
  const pending = yield* action<string>();
  pending.resolve("action done");
  const value = yield* awaitFuture(pending.future);
  consume(value);
}

function* bindLookupRitual(): RiteCoroutine<void> {
  yield* bind(TRACE_ID_KEY, "request-1");
  const traceId = yield* lookup(TRACE_ID_KEY);
  consume(traceId);
  yield* unbind(TRACE_ID_KEY);
}

function* sendReceiveRitual(): RiteCoroutine<void> {
  const { scopeRef: callerRef } = yield* self();
  const spawned = yield* spawn(() => senderRitual(callerRef));
  const value = yield* receive(EXAMPLE_MESSAGE_KEY);
  consume(value);
  const joinedValue = yield* join(spawned);
  consume(joinedValue);
}

function* selfRitual(): RiteCoroutine<void> {
  const descriptor = yield* self();
  consume(descriptor);
}

function* untilRitual(): RiteCoroutine<void> {
  const value = yield* until(() => Promise.resolve("until done"));
  consume(value);
}

function* sleepRitual(): RiteCoroutine<void> {
  yield* sleep(EXAMPLE_SLEEP_MILLISECONDS);
}

function* runRitual(): RiteCoroutine<string> {
  yield* cede();
  return "run done";
}

function* senderRitual(callerRef: ScopeRef<unknown>): RiteCoroutine<"sent"> {
  yield* send(callerRef, EXAMPLE_MESSAGE_KEY, "message from child");
  return "sent";
}

function* haltRitual(): RiteCoroutine<never> {
  yield* halt();
  throw new Error("Not implemented: halt() never returns.");
}

function* parkRitual(): RiteCoroutine<never> {
  yield* park();
  throw new Error("Not implemented: park() only resumes as failure.");
}

function consume<Value>(value: Value): Value {
  return value;
}

const EXAMPLE_SLEEP_MILLISECONDS = 10;
const TRACE_ID_KEY = contextKey<string>();
const EXAMPLE_MESSAGE_KEY = messageKey<string>();

export { EXAMPLE_SCENARIOS, getExampleScenario };
export type { ExampleScenarioName };
