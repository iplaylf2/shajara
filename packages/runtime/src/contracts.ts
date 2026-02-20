import type { Syscall } from "@khora/kernel";

export type RuntimePlan<ReturnValue> = Generator<Syscall<unknown>, ReturnValue, unknown>;

export type RuntimeBlueprint<ReturnValue> = () => RuntimePlan<ReturnValue>;
