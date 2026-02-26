export function notImplemented<Return>(subject: string): Return {
  throw new Error(`Not implemented: ${subject}.`);
}
