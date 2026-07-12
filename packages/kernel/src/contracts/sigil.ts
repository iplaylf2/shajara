import type { ECHO_TOKEN } from "./token.js";

/** Echo value returned to a sigil after interpretation. */
export type Echo<Sigil extends SigilShape> =
  NonNullable<Sigil[typeof ECHO_TOKEN]> extends readonly [infer EchoValue] ? EchoValue : never;

/** Shared discriminant and echo witness shape for public sigil values. */
export interface SigilShape {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
