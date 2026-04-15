import { cruise } from "dependency-cruiser";
import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(requireEnv("PROJECT_CWD"));
const cruiseOptions = {
  combinedDependencies: true,
  doNotFollow: {
    path: ["(^|/)node_modules($|/)"],
  },
  enhancedResolveOptions: {
    conditionNames: ["import", "require", "node", "default", "types"],
    exportsFields: ["exports"],
    extensions: [".ts", ".tsx", ".astro", ".mjs", ".js", ".d.ts"],
    mainFields: ["module", "main", "types", "typings"],
  },
  exclude: {
    path: [
      "(^|/)dist($|/)",
      "(^|/)coverage($|/)",
      "(^|/)node_modules($|/)",
      String.raw`(^|/)\.astro($|/)`,
    ],
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
  .map(parseWorkspace)
  .filter(({ location }) => location !== "." && !location.startsWith("internal/"))
  .map(({ name, location }) => ({
    cwd: location,
    name,
    target: "src",
  }));

await main();

async function main() {
  const violations = [];

  for (const workspace of cruises) {
    const baseDirectory = path.resolve(repoRoot, workspace.cwd);
    const modules = await cruiseTarget(workspace);
    const graph = buildDirectoryGraph(baseDirectory, workspace.target, modules);
    const components = findStronglyConnectedComponents(graph);

    for (const component of components) {
      violations.push({
        directories: component,
        examples: formatEdgeExamples(component, graph.edges),
        scope: workspace.name,
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

async function cruiseTarget({ cwd, target }: { cwd: string; target: string }) {
  const previousDirectory = process.cwd();
  const workingDirectory = path.resolve(repoRoot, cwd);

  try {
    process.chdir(workingDirectory);
    const result = (await cruise([target], cruiseOptions)) as {
      output: { modules: ModuleRecord[] };
    };

    return result.output.modules;
  } finally {
    process.chdir(previousDirectory);
  }
}

function buildDirectoryGraph(baseDirectory: string, target: string, modules: ModuleRecord[]) {
  const nodes = new Set<string>();
  const edges = new Map<string, Map<string, EdgeExample[]>>();

  for (const moduleRecord of modules.toSorted((left, right) =>
    left.source.localeCompare(right.source),
  )) {
    const fromBucket = getDirectoryNode(baseDirectory, target, moduleRecord.source);

    if (!fromBucket) {
      continue;
    }

    nodes.add(fromBucket);

    for (const dependency of moduleRecord.dependencies.toSorted((left, right) =>
      (left.resolved ?? "").localeCompare(right.resolved ?? ""),
    )) {
      if (!dependency.resolved || dependency.couldNotResolve || dependency.coreModule) {
        continue;
      }

      const toBucket = getDirectoryNode(baseDirectory, target, dependency.resolved);

      if (!toBucket || fromBucket === toBucket) {
        continue;
      }

      nodes.add(toBucket);
      let currentEdges = edges.get(fromBucket);

      if (!currentEdges) {
        currentEdges = new Map();
        edges.set(fromBucket, currentEdges);
      }

      let examples = currentEdges.get(toBucket);

      if (!examples) {
        examples = [];
        currentEdges.set(toBucket, examples);
      }

      const example = {
        from: moduleRecord.source,
        to: dependency.resolved,
      };

      if (!examples.some(({ from, to }) => from === example.from && to === example.to)) {
        examples.push(example);
        examples.sort((left, right) => {
          const fromOrder = left.from.localeCompare(right.from);

          if (fromOrder !== 0) {
            return fromOrder;
          }

          return left.to.localeCompare(right.to);
        });
      }
    }
  }

  return { edges, nodes };
}

function getDirectoryNode(baseDirectory: string, target: string, filePath: string) {
  const targetRoot = path.resolve(baseDirectory, target);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(baseDirectory, filePath);
  const relativePath = path.relative(targetRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  const segments = relativePath.split(path.sep).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    return target;
  }

  return path.join(target, path.dirname(relativePath)).replaceAll(path.sep, "/");
}

function findStronglyConnectedComponents({
  nodes,
  edges,
}: {
  nodes: Set<string>;
  edges: Map<string, Map<string, EdgeExample[]>>;
}) {
  let nextIndex = 0;
  const stack: string[] = [];
  const stackMembers = new Set<string>();
  const indexByNode = new Map<string, number>();
  const lowLinkByNode = new Map<string, number>();
  const components: string[][] = [];

  function visit(node: string) {
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
            Math.min(lowLinkByNode.get(node)!, lowLinkByNode.get(adjacentNode)!),
          );
          continue;
        }

        if (stackMembers.has(adjacentNode)) {
          lowLinkByNode.set(
            node,
            Math.min(lowLinkByNode.get(node)!, indexByNode.get(adjacentNode)!),
          );
        }
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) {
      return;
    }

    const component = [];

    while (stack.length > 0) {
      const currentNode = stack.pop()!;
      stackMembers.delete(currentNode);
      component.push(currentNode);

      if (currentNode === node) {
        break;
      }
    }

    components.push(component.toSorted());
  }

  for (const node of [...nodes].toSorted()) {
    if (!indexByNode.has(node)) {
      visit(node);
    }
  }

  return components.filter((component) => component.length > 1);
}

function formatEdgeExamples(component: string[], edges: Map<string, Map<string, EdgeExample[]>>) {
  const componentNodes = new Set(component);
  const examples = [];

  for (const fromNode of component.toSorted()) {
    const outgoingEdges = edges.get(fromNode);

    if (!outgoingEdges) {
      continue;
    }

    for (const [toNode, edgeExamples] of [...outgoingEdges.entries()].toSorted(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (!componentNodes.has(toNode)) {
        continue;
      }

      examples.push(`    ${fromNode} -> ${toNode}`);

      for (const example of edgeExamples) {
        examples.push(`      via ${example.from} -> ${example.to}`);
      }
    }
  }

  return examples;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Expected ${name} to be set.`);
  }

  return value;
}

function parseWorkspace(line: string) {
  return JSON.parse(line) as WorkspaceRecord;
}

interface WorkspaceRecord {
  location: string;
  name: string;
}

interface ModuleRecord {
  dependencies: DependencyRecord[];
  source: string;
}

interface DependencyRecord {
  couldNotResolve?: boolean;
  coreModule?: boolean;
  resolved?: string;
}

interface EdgeExample {
  from: string;
  to: string;
}
