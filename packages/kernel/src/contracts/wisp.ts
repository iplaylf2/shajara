import type { Echo, SigilShape } from "./sigil";
import type { UnknownArray } from "type-fest";

/**
 * Represents pending interpreter work.
 *
 * @param sigil - Interpreter instruction.
 * @param resonate - Echo continuation.
 * @returns Stirring node.
 */
export function stirringWisp<Sigil extends SigilShape, Relic>(
  sigil: Sigil,
  resonate: Resonance<Sigil, Relic>,
): StirringWisp<Sigil, Relic> {
  return { bearing: "stirring", resonate, sigil };
}

/**
 * Represents completed computation.
 *
 * @param relic - Final relic.
 * @returns Resting node.
 */
export function restingWisp<Relic>(relic: Relic): RestingWisp<Relic> {
  return { bearing: "resting", relic };
}

/**
 * Lifts one instruction into computation form.
 *
 * @param sigil - Interpreter instruction.
 * @returns Computation resolved by the echo.
 */
export function evoke<Sigil extends SigilShape>(sigil: Sigil): Wisp<Echo<Sigil>> {
  return stirringWisp(sigil, restingWisp);
}

/**
 * Deferred kernel computation entry.
 *
 * @returns Initial computation node.
 */
export type Ritual<Relic> = Incantation<[], Relic>;

/**
 * Callable kernel computation entry.
 *
 * @param args - Entry arguments.
 * @returns Initial computation node.
 */
export type Incantation<Args extends UnknownArray, Relic> = (...args: Args) => Wisp<Relic>;

/** Kernel computation node, either waiting on a sigil or carrying its final relic. */
export type Wisp<Relic> = StirringWisp<SigilShape, Relic> | RestingWisp<Relic>;

/** Wisp state that asks the interpreter to handle a sigil. */
export interface StirringWisp<Sigil extends SigilShape, Relic> {
  readonly bearing: "stirring";
  readonly sigil: Sigil;
  readonly resonate: Resonance<Sigil, Relic>;
}

/** Wisp state that has reached its final relic. */
export interface RestingWisp<Relic> {
  readonly bearing: "resting";
  readonly relic: Relic;
}

/**
 * Continuation called with a sigil echo.
 *
 * @param echo - Interpreted sigil echo.
 * @returns Next computation node.
 */
export type Resonance<Sigil extends SigilShape, Relic> = Incantation<[echo: Echo<Sigil>], Relic>;
