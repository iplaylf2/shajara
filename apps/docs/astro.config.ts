import { defineConfig } from "astro/config";
import { docsConfig } from "./starlight.config";
import solid from "@astrojs/solid-js";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: "/shajara",
  integrations: [solid(), starlight(docsConfig)],
  site: "https://iplaylf2.github.io",
  trailingSlash: "never",
});
