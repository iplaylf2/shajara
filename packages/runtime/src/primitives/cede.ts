import { createCedeSyscall } from "@khora/kernel";
import { liftSyscall } from "#src/runtime-kit/runtime-protocol";

export const cede = () => liftSyscall(createCedeSyscall());
