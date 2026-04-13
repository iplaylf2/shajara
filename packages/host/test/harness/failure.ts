import type { Failure } from "#/contracts";

export function findFailureByKind<Kind extends Failure["kind"]>(
  value: unknown,
  kind: Kind,
): Extract<Failure, { kind: Kind }> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const failure = value as FailureTree;
  if (failure.kind === kind) {
    return failure as Extract<Failure, { kind: Kind }>;
  }

  const nested = failure.cause?.failure;
  if (nested) {
    const foundNested = findFailureByKind(nested, kind);
    if (foundNested !== null) {
      return foundNested;
    }
  }

  for (const suppressed of failure.suppressed ?? []) {
    const foundSuppressed = findFailureByKind(suppressed, kind);
    if (foundSuppressed !== null) {
      return foundSuppressed;
    }
  }

  return null;
}

interface FailureTree {
  cause?: { failure?: unknown };
  kind?: string;
  suppressed?: readonly unknown[];
}
