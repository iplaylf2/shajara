// oxlint-disable id-length
import type { Echo, Sigil } from "#src/contracts";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [sigil.URI]: A extends Sigil ? Echo<A> : unknown;
  }
}

export namespace sigil {
  export const URI = "Sigil";
  export type URI = typeof URI;
}
