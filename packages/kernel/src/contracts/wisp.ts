import type { Echo, SigilShape } from "./sigil";
import type { UnknownArray } from "type-fest";

export function stirringWisp<Sigil extends SigilShape, Relic>(
  sigil: Sigil,
  resonate: Resonance<Sigil, Relic>,
): StirringWisp<Sigil, Relic> {
  return { bearing: "stirring", resonate, sigil };
}

export function restingWisp<Relic>(relic: Relic): RestingWisp<Relic> {
  return { bearing: "resting", relic };
}

export function evoke<Sigil extends SigilShape>(sigil: Sigil): Wisp<Echo<Sigil>> {
  return stirringWisp(sigil, restingWisp);
}

export type Ritual<Relic> = Incantation<[], Relic>;

export type Incantation<Args extends UnknownArray, Relic> = (...args: Args) => Wisp<Relic>;

export type Wisp<Relic> = StirringWisp<SigilShape, Relic> | RestingWisp<Relic>;

export interface StirringWisp<Sigil extends SigilShape, Relic> {
  readonly bearing: "stirring";
  readonly sigil: Sigil;
  readonly resonate: Resonance<Sigil, Relic>;
}

export interface RestingWisp<Relic> {
  readonly bearing: "resting";
  readonly relic: Relic;
}

export type Resonance<Sigil extends SigilShape, Relic> = Incantation<[echo: Echo<Sigil>], Relic>;
