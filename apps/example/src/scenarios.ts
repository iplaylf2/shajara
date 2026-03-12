import type { ResourceProvide, RiteCoroutine, RiteRoutine, ScopeRef } from "@shajara/host";
import { action, contextKey, messageKey, resource, sleep, until } from "@shajara/host";
import {
  all,
  bind,
  cede,
  guard,
  halt,
  lookup,
  park,
  race,
  receive,
  resumable,
  scoped,
  self,
  send,
  spawn,
  unbind,
  wait,
} from "@shajara/host/primitives";

function getExampleScenario(name: ExampleScenarioName): RiteRoutine<unknown> {
  return EXAMPLE_SCENARIOS[name];
}

const EXAMPLE_SCENARIOS = {
  actionResolve: actionResolveRitual,
  all: allRitual,
  bindLookup: bindLookupRitual,
  cede: childRitual,
  guard: guardRitual,
  halt: haltRitual,
  park: parkRitual,
  race: raceRitual,
  resource: resourceRitual,
  resumable: resumableRitual,
  run: runRitual,
  scoped: scopedRitual,
  self: selfRitual,
  sendReceive: sendReceiveRitual,
  sleep: sleepRitual,
  spawn: spawnRitual,
  until: untilRitual,
} satisfies Record<string, RiteRoutine<unknown>>;

type ExampleScenarioName = keyof typeof EXAMPLE_SCENARIOS;

function* spawnRitual(): RiteCoroutine<void> {
  const spawned = yield* spawn(childRitual);
  const joinedValue = yield* wait(spawned.exitFuture);
  consume(joinedValue);
}

function* scopedRitual(): RiteCoroutine<void> {
  const scopedValue = yield* scoped(childRitual);
  consume(scopedValue);
}

function* guardRitual(): RiteCoroutine<void> {
  yield* wait(yield* guard(guardedEntryRitual, recoverGuardFailure));
}

function* resourceRitual(): RiteCoroutine<void> {
  const providedValue = yield* wait(yield* resource(resourceBodyRitual));
  consume(providedValue);
}

function* resumableRitual(): RiteCoroutine<void> {
  const bodyResult = yield* wait(yield* resumable(childRitual));
  consume(bodyResult);
}

function* childRitual(): RiteCoroutine<string> {
  yield* cede();
  return "child done";
}

function* guardedEntryRitual(): RiteCoroutine<void> {
  const recoveredValue = yield* wait(yield* resumable(failingResumableRitual));
  consume(recoveredValue);
}

function failingResumableRitual(): RiteCoroutine<string> {
  throw new Error("guarded failure");
}

function* recoverGuardFailure(_error: Error): RiteCoroutine<string> {
  yield* cede();
  return "recovered";
}

function* resourceBodyRitual(provide: ResourceProvide<string>): RiteCoroutine<void> {
  try {
    yield* provide("resource-ready");
  } finally {
    yield* cede();
  }
}

function* allRitual(): RiteCoroutine<void> {
  const bothDone = yield* wait(yield* all([cede, cede] as const));
  consume(bothDone);
}

function* raceRitual(): RiteCoroutine<void> {
  const winner = yield* wait(yield* race([cede, cede] as const));
  consume(winner);
}

function* actionResolveRitual(): RiteCoroutine<void> {
  const pending = yield* action<string>();
  pending.resolve("action done");
  const value = yield* wait(pending.future);
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
  const joinedValue = yield* wait(spawned.exitFuture);
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
