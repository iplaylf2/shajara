import type { Plan } from "./plan-contract";

interface KernelRaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

type KernelResumableErrorHandler<CaughtValue> = (error: Error) => Plan<CaughtValue>;

type KernelResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;

type KernelResourceBody<ProvidedValue> = (
  provide: KernelResourceProvide<ProvidedValue>,
) => Plan<unknown>;

function notImplementedKernelPrimitivePlan<ReturnValue>(primitiveName: string): Plan<ReturnValue> {
  throw new Error(`Not implemented: kernel primitive '${primitiveName}'.`);
}

function cede(): Plan<void> {
  return notImplementedKernelPrimitivePlan("cede");
}

function all<ReturnValues extends readonly unknown[]>(_primitives: {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
}): Plan<ReturnValues> {
  return notImplementedKernelPrimitivePlan("all");
}

function bind<Key extends string, Value>(_key: Key, _value: Value): Plan<void> {
  return notImplementedKernelPrimitivePlan("bind");
}

function halt(): Plan<never> {
  return notImplementedKernelPrimitivePlan("halt");
}

function join<ReturnValue, SpawnRef = unknown>(_spawned: SpawnRef): Plan<ReturnValue> {
  return notImplementedKernelPrimitivePlan("join");
}

function lookup<Value>(_key: string): Plan<Value> {
  return notImplementedKernelPrimitivePlan("lookup");
}

function race<ReturnValues extends readonly unknown[]>(_primitives: {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
}): Plan<KernelRaceResult<ReturnValues[number]>> {
  return notImplementedKernelPrimitivePlan("race");
}

function resource<ProvidedValue>(_body: KernelResourceBody<ProvidedValue>): Plan<ProvidedValue> {
  return notImplementedKernelPrimitivePlan("resource");
}

function resumable<ReturnValue>(_plan: Plan<ReturnValue>): Plan<ReturnValue> {
  return notImplementedKernelPrimitivePlan("resumable");
}

function scoped<ReturnValue, CaughtValue = never>(
  _plan: Plan<ReturnValue>,
  _onResumableError?: KernelResumableErrorHandler<CaughtValue> | undefined,
): Plan<ReturnValue | CaughtValue> {
  return notImplementedKernelPrimitivePlan("scoped");
}

function self<SelfDescriptor = unknown>(): Plan<SelfDescriptor> {
  return notImplementedKernelPrimitivePlan("self");
}

function spawn<ReturnValue, SpawnRef = unknown>(_plan: Plan<ReturnValue>): Plan<SpawnRef> {
  return notImplementedKernelPrimitivePlan("spawn");
}

function suspend(): Plan<never> {
  return notImplementedKernelPrimitivePlan("suspend");
}

function terminate<SpawnRef = unknown>(_spawned: SpawnRef): Plan<void> {
  return notImplementedKernelPrimitivePlan("terminate");
}

export type {
  KernelRaceResult,
  KernelResumableErrorHandler,
  KernelResourceBody,
  KernelResourceProvide,
};

export {
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
};
