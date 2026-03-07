import type { ECHO_TOKEN } from "./token";

// oxlint-disable id-length
export type Echo<S extends Sigil> =
  NonNullable<S[typeof ECHO_TOKEN]> extends readonly [infer E] ? E : never;

export interface Sigil {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
