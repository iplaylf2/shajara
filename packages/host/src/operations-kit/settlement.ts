export type Settlement<Return> = ResolvedSettlement<Return> | RejectedSettlement;

export interface ResolvedSettlement<Return> {
  readonly status: "resolved";
  readonly value: Return;
}

export interface RejectedSettlement {
  readonly status: "rejected";
  readonly reason: unknown;
}
