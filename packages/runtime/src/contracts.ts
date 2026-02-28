import type { Syscall } from "@khora/kernel";

export type RuntimeBlueprint<Return> = () => RuntimePlan<Return>;

export type RuntimePlan<Return> = Generator<Syscall, Return, unknown>;
