import { defineConfig } from "astro/config";
import { docsConfig } from "./config/starlight";
import solid from "@astrojs/solid-js";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [solid(), starlight(docsConfig)],
});
