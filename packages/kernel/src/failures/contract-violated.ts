import type { Failure } from "#src/contracts";

export function contractViolated(subject: string, contract: string): ContractViolatedFailure {
  return {
    contract,
    kind: "contract-violated",
    message(): string {
      return `Contract violated (${subject}): ${contract}`;
    },
    subject,
  };
}

export interface ContractViolatedFailure extends Failure {
  readonly kind: "contract-violated";
  readonly subject: string;
  readonly contract: string;
}
