export function createPendingPromise(): Promise<never> {
  return new Promise<never>(() => {
    // Keep the promise pending until the test drives cancellation.
  });
}
