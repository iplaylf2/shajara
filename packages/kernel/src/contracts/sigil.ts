import type { RETURN_TOKEN } from "./token";

// oxlint-disable id-length
export type Echo<S extends Sigil> =
  NonNullable<S[typeof RETURN_TOKEN]> extends readonly [infer E] ? E : never;

export interface Sigil {
  readonly kind: string;
  readonly [RETURN_TOKEN]?: readonly [unknown];
}
