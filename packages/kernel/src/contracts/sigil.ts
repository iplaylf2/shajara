import type { ECHO_TOKEN } from "./token";

export type Echo<Sigil extends SigilShape> =
  NonNullable<Sigil[typeof ECHO_TOKEN]> extends readonly [infer EchoValue] ? EchoValue : never;

export interface SigilShape {
  readonly kind: string;
  readonly [ECHO_TOKEN]?: readonly [unknown];
}
