import { Interpreter } from "#/interpreter";
import { notImplemented } from "#/internal/not-implemented";

export class DomainInterpreter extends Interpreter {
  public constructor() {
    super(() => notImplemented(`creating the default entry ritual for ${DomainInterpreter.name}`));
  }
}
