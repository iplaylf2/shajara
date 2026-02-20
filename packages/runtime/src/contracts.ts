import type { Syscall } from "@khora/kernel";

export type RuntimePlan<ReturnValue> = Generator<Syscall<unknown>, ReturnValue, unknown>;

export type RuntimeBlueprint<ReturnValue> = () => RuntimePlan<ReturnValue>;

export type RuntimePlanFactoryTuple<ReturnValues extends readonly unknown[]> = {
  readonly [Index in keyof ReturnValues]: () => RuntimePlan<ReturnValues[Index]>;
};
