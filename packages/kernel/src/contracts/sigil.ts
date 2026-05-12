import type { ECHO_TOKEN } from "./token";

/** Echo type produced when a sigil is interpreted. */
export type Echo<Sigil extends SigilShape> =
  NonNullable<Sigil[typeof ECHO_TOKEN]> extends readonly [infer EchoValue] ? EchoValue : never;

/** Base shape for runtime instructions handled by the kernel interpreter. */
export interface SigilShape {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
