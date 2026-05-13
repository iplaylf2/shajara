import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";
import type { Option } from "#/utils/index";

/**
 * Creates a sigil that observes a future without blocking.
 *
 * @returns Poll sigil whose echo is the settled result or `none` while pending.
 */
export function poll<Result>(future: FutureKey<Result>): PollSigil<Result> {
  return {
    future,
    kind: "poll",
  };
}

/** Sigil that observes a future without blocking. */
export interface PollSigil<Result> extends SigilShape {
  readonly kind: "poll";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Option<FutureResult<Result>>];
}
