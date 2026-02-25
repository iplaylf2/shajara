// oxlint-disable id-length
import type { Syscall, SyscallReturn } from "#src/contracts/syscall";

declare module "fp-ts/HKT" {
  interface URItoKind<A extends Syscall> {
    readonly [syscall.URI]: SyscallReturn<A>;
  }
}

export namespace syscall {
  export const URI = "Syscall";
  export type URI = typeof URI;
}
