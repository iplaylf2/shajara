export function assume<Type>(value: unknown): Type {
  return value as Type;
}
