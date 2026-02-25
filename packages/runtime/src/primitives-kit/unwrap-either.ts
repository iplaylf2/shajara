import { RuntimeScopeFailedError } from "#src/errors/runtime-scope-failed";

type Right<ReturnValue> = { readonly right: ReturnValue };
type Left = { readonly left: unknown };

export function unwrapEither<ReturnValue>(either: Left | Right<ReturnValue>): ReturnValue {
  if ("right" in either) {
    return either.right;
  }

  throw new RuntimeScopeFailedError(either.left);
}
