import type { JSX } from "solid-js";
import { createSignal } from "solid-js";

const INITIAL_COUNT = 0;
const COUNT_STEP = 1;

interface Props {
  buttonLabel: string;
  countLabel: string;
}

export default function Counter({ buttonLabel, countLabel }: Props): JSX.Element {
  const [count, setCount] = createSignal(INITIAL_COUNT);

  return (
    <div
      style={{
        display: "grid",
        gap: "0.75rem",
        "justify-items": "start",
      }}
    >
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
        {buttonLabel}
      </button>
      <p
        style={{
          color: "#374151",
          "font-size": "0.95rem",
          margin: "0",
        }}
      >
        {countLabel}: {count()}
      </p>
    </div>
  );
}
