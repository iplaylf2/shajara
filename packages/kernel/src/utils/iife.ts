// oxlint-disable-next-line id-length
export function iife<T>(run: () => T): T {
  return run();
}
