import type { RuntimeProcess } from "./runtime-process";
import type { RuntimeScope } from "./runtime-scope";

export interface ScopeClosing {
  readonly children: readonly ScopeClosing[];
  readonly processes: readonly RuntimeProcess[];
  readonly scope: RuntimeScope;
}
