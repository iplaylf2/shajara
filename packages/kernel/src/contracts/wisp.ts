import type { Echo, SigilShape } from "./sigil";
import type { UnknownArray } from "type-fest";

/**
 * Creates a computation node waiting for a sigil echo.
 *
 * @param sigil - Instruction the interpreter must satisfy before the computation resumes.
 * @param resonate - Continuation invoked with the sigil echo.
 * @returns Stirring node bound to the supplied sigil and continuation.
 */
export function stirringWisp<Sigil extends SigilShape, Relic>(
  sigil: Sigil,
  resonate: Resonance<Sigil, Relic>,
): StirringWisp<Sigil, Relic> {
  return { bearing: "stirring", resonate, sigil };
}

/**
 * Creates a computation node that has reached its final relic.
 *
 * @returns Resting node carrying the final relic.
 */
export function restingWisp<Relic>(relic: Relic): RestingWisp<Relic> {
  return { bearing: "resting", relic };
}

/**
 * Lifts one sigil into a computation that resolves to the sigil echo.
 *
 * @returns Computation resolved by the sigil echo.
 */
export function evoke<Sigil extends SigilShape>(sigil: Sigil): Wisp<Echo<Sigil>> {
  return stirringWisp(sigil, restingWisp);
}

/**
 * Deferred computation entry without arguments.
 *
 * @returns Initial computation node.
 */
export type Ritual<Relic> = Incantation<[], Relic>;

/**
 * Callable computation entry.
 *
 * @returns Initial computation node.
 */
export type Incantation<Args extends UnknownArray, Relic> = (...args: Args) => Wisp<Relic>;

/** Computation node, either waiting on a sigil or carrying its final relic. */
export type Wisp<Relic> = StirringWisp<SigilShape, Relic> | RestingWisp<Relic>;

/** Computation state waiting for a sigil echo before it can continue. */
export interface StirringWisp<Sigil extends SigilShape, Relic> {
  readonly bearing: "stirring";
  readonly sigil: Sigil;
  readonly resonate: Resonance<Sigil, Relic>;
}

/** Computation state that has reached its final relic. */
export interface RestingWisp<Relic> {
  readonly bearing: "resting";
  readonly relic: Relic;
}

/**
 * Continuation from a sigil echo to the next computation node.
 *
 * @returns Next computation node.
 */
export type Resonance<Sigil extends SigilShape, Relic> = Incantation<[echo: Echo<Sigil>], Relic>;
