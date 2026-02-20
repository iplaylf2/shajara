export interface ResolvedSettlement<ReturnValue> {
  readonly status: "resolved";
  readonly value: ReturnValue;
}

export interface RejectedSettlement {
  readonly status: "rejected";
  readonly reason: unknown;
}

export type Settlement<ReturnValue> = ResolvedSettlement<ReturnValue> | RejectedSettlement;
