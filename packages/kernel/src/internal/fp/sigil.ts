// oxlint-disable id-length
import type { Sigil, Echo } from "#src/contracts";

declare module "fp-ts/HKT" {
  interface URItoKind<A extends Sigil> {
    readonly [sigil.URI]: Echo<A>;
  }
}

export namespace sigil {
  export const URI = "Sigil";
  export type URI = typeof URI;
}
