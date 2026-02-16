import { createCedeSyscall } from "@khora/kernel";
import { liftSyscall } from "#src/primitives-kit/runtime-protocol";

export const cede = () => liftSyscall(createCedeSyscall());
