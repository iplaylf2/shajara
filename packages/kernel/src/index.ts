interface KernelStub {
  readonly phase: "stub";
}

const KERNEL_STUB: KernelStub = { phase: "stub" };

export type { KernelStub };
export { KERNEL_STUB };
