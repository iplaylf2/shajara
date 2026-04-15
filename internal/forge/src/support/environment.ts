import path from "node:path";

export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Expected ${name} to be set.`);
  }

  return value;
}

export function requireEnvPath(name: string) {
  return path.resolve(requireEnv(name));
}
