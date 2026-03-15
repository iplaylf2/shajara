import { Interpreter } from "#src/interpreters/interpreter.js";
import { notImplemented } from "#src/internal/not-implemented";

export class DomainInterpreter extends Interpreter {
  public constructor() {
    super(() => notImplemented(`creating the default entry ritual for ${DomainInterpreter.name}`));
  }
}
