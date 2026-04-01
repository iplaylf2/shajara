import type { Unsubscribe } from "#/utils";

export interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Unsubscribe;
}

export interface Slice {
  shouldYield(): boolean;
}
