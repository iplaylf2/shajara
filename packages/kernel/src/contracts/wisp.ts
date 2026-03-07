import type { Echo, Sigil } from "./sigil";
import type { UnknownArray } from "type-fest";

// oxlint-disable-next-line id-length
export function stirringWisp<S extends Sigil, Relic>(
  sigil: S,
  resonate: Resonance<S, Relic>,
): StirringWisp<S, Relic> {
  return { bearing: "stirring", resonate, sigil };
}

export function restingWisp<Relic>(relic: Relic): RestingWisp<Relic> {
  return { bearing: "resting", relic };
}

// oxlint-disable-next-line id-length
export function evoke<S extends Sigil>(sigil: S): Wisp<Echo<S>> {
  return stirringWisp(sigil, restingWisp);
}

export type Ritual<Relic> = Incantation<[], Relic>;

export type Incantation<Args extends UnknownArray, Relic> = (...args: Args) => Wisp<Relic>;

export type Wisp<Relic> = StirringWisp<Sigil, Relic> | RestingWisp<Relic>;

// oxlint-disable-next-line id-length
export interface StirringWisp<S extends Sigil, Relic> {
  readonly bearing: "stirring";
  readonly sigil: S;
  readonly resonate: Resonance<S, Relic>;
}

export interface RestingWisp<Relic> {
  readonly bearing: "resting";
  readonly relic: Relic;
}

// oxlint-disable-next-line id-length
export type Resonance<S extends Sigil, Relic> = Incantation<[echo: Echo<S>], Relic>;
