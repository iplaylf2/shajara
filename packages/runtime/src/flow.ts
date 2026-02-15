type RuntimeInstruction = {
  readonly kind: "yield-now";
};

type Flow<ReturnValue> = Generator<RuntimeInstruction, ReturnValue, null | unknown>;

type FlowFactory<ReturnValue> = () => Flow<ReturnValue>;

const yieldNow = function* yieldNowGenerator(): Flow<void> {
  yield { kind: "yield-now" };
};

export type { Flow, FlowFactory, RuntimeInstruction };
export { yieldNow };
