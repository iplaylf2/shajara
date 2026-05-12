/**
 * Runs a callback in expression position.
 *
 * @returns Callback result.
 */
// oxlint-disable-next-line id-length
export function iife<T>(run: () => T): T {
  return run();
}
