import type { Failure } from "#/index";

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

  for (const nested of nestedFailures(failure.cause)) {
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

function nestedFailures(cause: unknown): readonly unknown[] {
  if (!cause || typeof cause !== "object") {
    return [];
  }

  const legacyCause = cause as { failure?: unknown };
  if (legacyCause.failure) {
    return [legacyCause.failure, cause];
  }

  return [cause];
}

interface FailureTree {
  cause?: unknown;
  kind?: string;
  suppressed?: readonly unknown[];
}
