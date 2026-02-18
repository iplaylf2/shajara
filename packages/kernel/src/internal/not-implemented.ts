export function notImplemented<ReturnValue>(subject: string): ReturnValue {
  throw new Error(`Not implemented: ${subject}.`);
}
