import type { ContextKey, Wisp } from "#src/contracts";
import { bind as bindSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function bind<Value>(key: ContextKey<Value>, value: Value): Wisp<void> {
  return wisp.liftF(bindSigil(key, value));
}
