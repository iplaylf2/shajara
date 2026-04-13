import type { Disposer } from "#/utils";

export interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Disposer;
}

export interface Slice {
  shouldYield(): boolean;
}
