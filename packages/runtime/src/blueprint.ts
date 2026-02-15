type RuntimeInstruction = {
  readonly kind: "cede";
};

type Blueprint<ReturnValue> = () => Generator<
  RuntimeInstruction,
  ReturnValue,
  null | unknown
>;

function* cede(): Generator<
  RuntimeInstruction,
  void,
  null | unknown
> {
  yield { kind: "cede" };
}

export type { Blueprint, RuntimeInstruction };
export { cede };
