import { RuntimeScopeFailedError } from "#src/errors/runtime-scope-failed";

type Right<Return> = { readonly right: Return };
type Left = { readonly left: unknown };

export function unwrapEither<Return>(either: Left | Right<Return>): Return {
  if ("right" in either) {
    return either.right;
  }

  throw new RuntimeScopeFailedError(either.left);
}
