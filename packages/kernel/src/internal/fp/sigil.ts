// oxlint-disable id-length
import type { Echo, SigilShape } from "#/contracts/index.js";

declare module "fp-ts/HKT" {
  interface URItoKind<A> {
    readonly [sigil.URI]: sigil.Kind<A>;
  }
}

// oxlint-disable-next-line no-namespace
export namespace sigil {
  export const URI = "Sigil";
  export type URI = typeof URI;

  export type Kind<A> = A extends SigilShape ? Echo<A> : unknown;
}
