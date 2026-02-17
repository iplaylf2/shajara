import type { RuntimeSpawnRef } from "#src/contracts";

export type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

export function until<ReturnValue>(
  _thunk: RuntimeUntilThunk<ReturnValue>,
): RuntimeSpawnRef<ReturnValue> {
  throw new Error(
    "Not implemented: creating a runtime scope that resolves/rejects from a host promise thunk.",
  );
}
