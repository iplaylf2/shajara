import type { Either } from "#src/utils";
import type { Failure } from "./failure";
import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";

export interface ScopeRef<Value> {
  readonly [REF_TOKEN]: "scope";
  readonly exitFuture: FutureKey<Either<Failure, Value>>;
}

export interface ScopeSpec {
  readonly role: string;
}
