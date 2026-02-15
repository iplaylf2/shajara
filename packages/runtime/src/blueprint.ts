import type { RuntimeInstruction } from "#src/runtime-instruction";

type Blueprint<ReturnValue, ResumeValue = unknown> = () => Generator<
  RuntimeInstruction,
  ReturnValue,
  ResumeValue
>;

export type { Blueprint, RuntimeInstruction };
