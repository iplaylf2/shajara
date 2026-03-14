import type { Failure, RiteCoroutine, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import type { Either } from "@shajara/kernel/utils";
import { enclose as kernelEnclose } from "@shajara/kernel";

export function* enclose<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelEnclose(decodeRitual(ritual)))();
  return unwrapEither(outcome as Either<Failure, Return>);
}
