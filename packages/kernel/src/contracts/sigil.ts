import type { ECHO_TOKEN } from "./token";

/** Echo value associated with a sigil. */
export type Echo<Sigil extends SigilShape> =
  NonNullable<Sigil[typeof ECHO_TOKEN]> extends readonly [infer EchoValue] ? EchoValue : never;

/** Shared shape for public sigil values. */
export interface SigilShape {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
