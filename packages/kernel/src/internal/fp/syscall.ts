// oxlint-disable id-length
import type { Sigil, Echo } from "#src/contracts";

declare module "fp-ts/HKT" {
  interface URItoKind<A extends Sigil> {
    readonly [syscall.URI]: Echo<A>;
  }
}

export namespace syscall {
  export const URI = "Sigil";
  export type URI = typeof URI;
}
