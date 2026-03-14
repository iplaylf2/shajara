import type { Executor } from "./contracts";
import type { Interpreter } from "#src/interpreter";
import { notImplemented } from "#src/internal/not-implemented";

export function createExecutor(interpreter: Interpreter): Executor {
  return notImplemented(`creating an executor from interpreter ${interpreter.constructor.name}`);
}
