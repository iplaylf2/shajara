import { defineConfig } from "oxlint";
import shared from "./exports/oxlint.shared.ts";
export default defineConfig({
  extends: [shared],
});
