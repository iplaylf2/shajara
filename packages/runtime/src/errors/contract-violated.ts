import { KhoraError } from "#src/contracts";
import { contractViolated } from "@khora/kernel";

export class ContractViolatedError extends KhoraError {
  constructor(subject: string, contract: string) {
    super(contractViolated(subject, contract));
    this.name = "ContractViolatedError";
  }
}
