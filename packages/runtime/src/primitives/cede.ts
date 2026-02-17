import { createCedeSyscall } from "@khora/kernel";
import { liftSyscall } from "#src/contracts/plan";

export const cede = () => liftSyscall(createCedeSyscall());
