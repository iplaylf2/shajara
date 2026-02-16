import type { Syscall } from "./plan-contract";

interface CedeSyscall extends Syscall<void> {
  readonly kind: "cede";
}

function createCedeSyscall(): CedeSyscall {
  return { kind: "cede" };
}

export type { CedeSyscall };
export { createCedeSyscall };
