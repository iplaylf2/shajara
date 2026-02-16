import type { RuntimeScopeHandle } from "./runtime-kit/runtime-entities";

interface RuntimeHostInputPort {
  post(scope: RuntimeScopeHandle, input: unknown): void;
}

interface RuntimeHostResolvers<ReturnValue> {
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

type RuntimeHostAdapter<ReturnValue> = RuntimeHostInputPort & RuntimeHostResolvers<ReturnValue>;

interface RuntimeHostSession<ReturnValue> {
  readonly promise: Promise<ReturnValue>;
  readonly hostAdapter: RuntimeHostAdapter<ReturnValue>;
}

function withRuntimeResolvers<ReturnValue>(): RuntimeHostSession<ReturnValue> {
  throw new Error(
    "Not implemented: creating runtime host adapter and promise resolvers for run().",
  );
}

export { withRuntimeResolvers };
export type {
  RuntimeHostAdapter,
  RuntimeHostInputPort,
  RuntimeHostResolvers,
  RuntimeHostSession,
};
