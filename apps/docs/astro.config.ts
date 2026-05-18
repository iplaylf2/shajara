import { defineConfig } from "astro/config";
import { docsConfig } from "./starlight.config";
import { site } from "./site";
import solid from "@astrojs/solid-js";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: site.basePath,
  integrations: [solid(), starlight(docsConfig)],
  site: site.origin,
  trailingSlash: "never",
});
