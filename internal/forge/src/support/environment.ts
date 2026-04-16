import path from "node:path";

export function requireEnv(name: string): string {
  if (!(name in process.env)) {
    throw new Error(`Expected ${name} to be set.`);
  }

  return process.env[name]!;
}

export function requireEnvPath(name: string): string {
  return path.resolve(requireEnv(name));
}
