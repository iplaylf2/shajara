import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";
import type { Option } from "#/utils/index";

/**
 * Models non-blocking future observation.
 *
 * @param future - Future to inspect.
 * @returns Poll instruction.
 */
export function poll<Result>(future: FutureKey<Result>): PollSigil<Result> {
  return {
    future,
    kind: "poll",
  };
}

/** Sigil shape for non-blocking future observation. */
export interface PollSigil<Result> extends SigilShape {
  readonly kind: "poll";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Option<FutureResult<Result>>];
}
