import type { ContextKey, Wisp } from "#/contracts";
import { bind as bindSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function bind<Value>(key: ContextKey<Value>, value: Value): Wisp<void> {
  return wisp.liftF(bindSigil(key, value));
}
