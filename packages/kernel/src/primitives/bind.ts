import type { ContextKey, Wisp } from "#/contracts/index.js";
import { bind as bindSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Adds or shadows a context binding on the current scope. */
export function bind<Value>(key: ContextKey<Value>, value: Value): Wisp<void> {
  return wisp.liftF(bindSigil(key, value));
}
