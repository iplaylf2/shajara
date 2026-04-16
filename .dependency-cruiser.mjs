const configuration = {
  options: {
    combinedDependencies: true,
    doNotFollow: { path: "(^|/)node_modules($|/)" },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default", "types"],
      exportsFields: ["exports"],
      extensions: [".ts", ".tsx", ".astro", ".mjs", ".js", ".d.ts"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};

export default configuration;
