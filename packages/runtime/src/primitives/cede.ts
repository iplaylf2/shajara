import { createCedeSyscall } from "@khora/kernel";
import { liftSyscall } from "#src/plan-runtime";

export const cede = () => liftSyscall(createCedeSyscall());
