import type { JSX } from "solid-js";
import { createSignal } from "solid-js";

const INITIAL_COUNT = 0;
const COUNT_STEP = 1;

export default function SolidCounter(): JSX.Element {
  const [count, setCount] = createSignal(INITIAL_COUNT);

  return (
    <button
      onClick={() => setCount((value) => value + COUNT_STEP)}
      style={{
        "background-color": "#111827",
        border: "0",
        "border-radius": "999px",
        color: "#f9fafb",
        cursor: "pointer",
        "font-size": "1rem",
        "font-weight": "600",
        padding: "0.875rem 1.25rem",
      }}
      type="button"
    >
      Clicked {count()} times
    </button>
  );
}
