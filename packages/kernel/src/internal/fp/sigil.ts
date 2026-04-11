// oxlint-disable id-length
import type { Echo, SigilShape } from "#/contracts";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [sigil.URI]: A extends SigilShape ? Echo<A> : unknown;
  }
}

// oxlint-disable-next-line no-namespace
export namespace sigil {
  export const URI = "Sigil";
  export type URI = typeof URI;
}
