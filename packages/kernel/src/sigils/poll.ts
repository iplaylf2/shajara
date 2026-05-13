import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";
import type { Option } from "#/utils/index";

/**
 * Encodes non-blocking future observation as a sigil.
 *
 * @returns `poll` sigil.
 */
export function poll<Result>(future: FutureKey<Result>): PollSigil<Result> {
  return {
    future,
    kind: "poll",
  };
}

/** Non-blocking future observation sigil. */
export interface PollSigil<Result> extends SigilShape {
  readonly kind: "poll";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Option<FutureResult<Result>>];
}
