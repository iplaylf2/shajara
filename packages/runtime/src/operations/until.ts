import type { RuntimeSpawnRef } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

export function until<ReturnValue>(
  _thunk: RuntimeUntilThunk<ReturnValue>,
): RuntimeSpawnRef<ReturnValue> {
  return notImplemented("creating a runtime scope that resolves/rejects from a host promise thunk");
}
