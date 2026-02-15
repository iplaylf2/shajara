interface KernelBoundary {
  readonly kind: "kernel-boundary";
}

const createKernelBoundary = (): KernelBoundary => ({ kind: "kernel-boundary" });

export { createKernelBoundary };
