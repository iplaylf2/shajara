import type { Syscall } from "@khora/kernel";

export type RuntimePlan<Return> = Generator<Syscall, Return, unknown>;

export type RuntimeBlueprint<Return> = () => RuntimePlan<Return>;
