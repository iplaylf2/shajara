import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    solid(),
    starlight({
      description: "Structured concurrency for JavaScript applications and runtimes.",
      sidebar: [
        {
          autogenerate: { directory: "guides" },
          label: "Guides",
        },
      ],
      social: [
        {
          href: "https://github.com/iplaylf2/shajara",
          icon: "github",
          label: "GitHub",
        },
      ],
      title: "shajara",
    }),
  ],
});
