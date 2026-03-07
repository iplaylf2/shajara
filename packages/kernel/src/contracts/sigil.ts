import type { RETURN_TOKEN } from "#src/utils";

// oxlint-disable id-length
export type Echo<T extends Sigil> =
  NonNullable<T[typeof RETURN_TOKEN]> extends readonly [infer R] ? R : never;

export interface Sigil {
  readonly kind: string;
  readonly [RETURN_TOKEN]?: readonly [unknown];
}
