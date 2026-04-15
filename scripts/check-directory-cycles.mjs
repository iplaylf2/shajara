import { cruise } from "dependency-cruiser";
import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(process.env.PROJECT_CWD);
const cruiseOptions = {
  combinedDependencies: true,
  doNotFollow: {
    path: ["(^|/)node_modules($|/)"],
  },
  exclude: {
    path: ["(^|/)dist($|/)", "(^|/)coverage($|/)", "(^|/)node_modules($|/)", "(^|/)\\.astro($|/)"],
  },
  enhancedResolveOptions: {
    exportsFields: ["exports"],
    conditionNames: ["import", "require", "node", "default", "types"],
    extensions: [".ts", ".tsx", ".astro", ".mjs", ".js", ".d.ts"],
    mainFields: ["module", "main", "types", "typings"],
  },
  tsConfig: {
    fileName: "tsconfig.json",
  },
};

const cruises = execFileSync("yarn", ["workspaces", "list", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .filter(({ location }) => location !== "." && !location.startsWith("internal/"))
  .map(({ name, location }) => ({
    name,
    cwd: location,
    target: "src",
  }));

await main();

async function main() {
  const violations = [];

  for (const cruise of cruises) {
    const baseDirectory = path.resolve(repoRoot, cruise.cwd);
    const modules = await cruiseTarget(cruise);
    const graph = buildDirectoryGraph(baseDirectory, cruise.target, modules);
    const components = findStronglyConnectedComponents(graph);

    for (const component of components) {
      violations.push({
        scope: cruise.name,
        directories: component,
        examples: formatEdgeExamples(component, graph.edges),
      });
    }
  }

  if (violations.length === 0) {
    console.log("No directory-level circular dependencies found.");
    process.exit(0);
  }

  console.error("Directory-level circular dependencies found:\n");

  for (const violation of violations) {
    console.error(`[${violation.scope}] ${violation.directories.join(" <-> ")}`);
    console.error(violation.examples.join("\n"));
    console.error("");
  }

  process.exit(1);
}

function getDirectoryBucket(baseDirectory, target, filePath) {
  const targetRoot = path.resolve(baseDirectory, target);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(baseDirectory, filePath);
  const relativePath = path.relative(targetRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  const segments = relativePath.split(path.sep).filter(Boolean);

  if (segments.length <= 1) {
    return target;
  }

  return `${target}/${segments[0]}`.replaceAll(path.sep, "/");
}

async function cruiseTarget({ cwd, target }) {
  const previousDirectory = process.cwd();
  const workingDirectory = path.resolve(repoRoot, cwd);

  try {
    process.chdir(workingDirectory);
    const result = await cruise([target], cruiseOptions);

    return result.output.modules;
  } finally {
    process.chdir(previousDirectory);
  }
}

function buildDirectoryGraph(baseDirectory, target, modules) {
  const nodes = new Set();
  const edges = new Map();

  for (const moduleRecord of modules) {
    const fromBucket = getDirectoryBucket(baseDirectory, target, moduleRecord.source);

    if (!fromBucket) {
      continue;
    }

    nodes.add(fromBucket);

    for (const dependency of moduleRecord.dependencies) {
      if (!dependency.resolved || dependency.couldNotResolve || dependency.coreModule) {
        continue;
      }

      const toBucket = getDirectoryBucket(baseDirectory, target, dependency.resolved);

      if (!toBucket || fromBucket === toBucket) {
        continue;
      }

      nodes.add(toBucket);
      let currentEdges = edges.get(fromBucket);

      if (!currentEdges) {
        currentEdges = new Map();
        edges.set(fromBucket, currentEdges);
      }

      if (!currentEdges.has(toBucket)) {
        currentEdges.set(toBucket, {
          from: moduleRecord.source,
          to: dependency.resolved,
        });
      }
    }
  }

  return { nodes, edges };
}

function findStronglyConnectedComponents({ nodes, edges }) {
  let nextIndex = 0;
  const stack = [];
  const stackMembers = new Set();
  const indexByNode = new Map();
  const lowLinkByNode = new Map();
  const components = [];

  function visit(node) {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    stackMembers.add(node);

    const adjacentNodes = edges.get(node);

    if (adjacentNodes) {
      for (const adjacentNode of adjacentNodes.keys()) {
        if (!indexByNode.has(adjacentNode)) {
          visit(adjacentNode);
          lowLinkByNode.set(
            node,
            Math.min(lowLinkByNode.get(node), lowLinkByNode.get(adjacentNode)),
          );
          continue;
        }

        if (stackMembers.has(adjacentNode)) {
          lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), indexByNode.get(adjacentNode)));
        }
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) {
      return;
    }

    const component = [];

    while (stack.length > 0) {
      const currentNode = stack.pop();
      stackMembers.delete(currentNode);
      component.push(currentNode);

      if (currentNode === node) {
        break;
      }
    }

    components.push(component.sort());
  }

  for (const node of [...nodes].sort()) {
    if (!indexByNode.has(node)) {
      visit(node);
    }
  }

  return components.filter((component) => component.length > 1);
}

function formatEdgeExamples(component, edges) {
  const componentNodes = new Set(component);
  const examples = [];

  for (const fromNode of component) {
    const outgoingEdges = edges.get(fromNode);

    if (!outgoingEdges) {
      continue;
    }

    for (const [toNode, example] of outgoingEdges.entries()) {
      if (!componentNodes.has(toNode)) {
        continue;
      }

      examples.push(`    ${fromNode} -> ${toNode}\n      via ${example.from} -> ${example.to}`);
    }
  }

  return examples;
}
