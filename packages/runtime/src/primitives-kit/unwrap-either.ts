import type { KhoraFailure } from "@khora/kernel";
import { RuntimeKhoraError } from "#src/errors";

type Right<Return> = { readonly right: Return };
type Left = { readonly left: KhoraFailure };

export function unwrapEither<Return>(either: Left | Right<Return>): Return {
  if ("right" in either) {
    return either.right;
  }

  throw new RuntimeKhoraError(either.left);
}
