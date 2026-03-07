import type { Echo, Sigil } from "./sigil";

export type Incantation<Args extends unknown[], Relic> = (...args: Args) => Wisp<Relic>;

export type Resonance<SigilType extends Sigil, Relic> = Incantation<[echo: Echo<SigilType>], Relic>;

export type Ritual<Relic> = Incantation<[], Relic>;

// oxlint-disable-next-line id-length
export function evoke<S extends Sigil>(sigil: S): Wisp<Echo<S>> {
  return stirringWisp(sigil, restingWisp);
}

export type Wisp<Relic> = StirringWisp<Sigil, Relic> | RestingWisp<Relic>;

export function restingWisp<Relic>(relic: Relic): RestingWisp<Relic> {
  return { bearing: "resting", relic };
}

// oxlint-disable-next-line id-length
export function stirringWisp<S extends Sigil, Relic>(
  sigil: S,
  resonance: Resonance<S, Relic>,
): StirringWisp<S, Relic> {
  return { bearing: "stirring", resonance, sigil };
}

export interface RestingWisp<Relic> {
  readonly bearing: "resting";
  readonly relic: Relic;
}

// oxlint-disable-next-line id-length
export interface StirringWisp<S extends Sigil, Relic> {
  readonly bearing: "stirring";
  readonly sigil: S;
  readonly resonance: Resonance<S, Relic>;
}
