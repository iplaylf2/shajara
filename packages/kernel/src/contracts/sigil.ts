import type { ECHO_TOKEN } from "./token";

export type Echo<Sigil extends SigilShape> =
  // oxlint-disable-next-line id-length
  NonNullable<Sigil[typeof ECHO_TOKEN]> extends readonly [infer E] ? E : never;

export interface SigilShape {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
