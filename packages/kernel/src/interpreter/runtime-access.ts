import type { RuntimeProcess, RuntimeScope } from "./runtime";

export function branchDescriptor(process: RuntimeProcess, scope: RuntimeScope) {
  return {
    processRef: process.ref,
    scopeRef: scope.ref,
  };
}

export function selfDescriptor(process: RuntimeProcess) {
  return {
    processRef: process.ref,
    scopeRef: process.scope.ref,
  };
}
