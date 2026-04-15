// oxlint-disable max-lines
import { cruise } from "dependency-cruiser";
import { execFileSync } from "node:child_process";
import path from "node:path";

const FAILURE_EXIT_CODE = 1;
const SUCCESS_EXIT_CODE = 0;
const repoRoot = path.resolve(requireEnv("PROJECT_CWD"));
const cruiseOptions = {
  combinedDependencies: true,
  doNotFollow: { path: ["(^|/)node_modules($|/)"] },
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
  tsConfig: { fileName: "tsconfig.json" },
};
const workspaces = execFileSync("yarn", ["workspaces", "list", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .map(parseWorkspace)
  .filter(({ location }) => location !== "." && !location.startsWith("internal/"))
  .map(({ name, location }) => ({ cwd: location, name, target: "src" }));

await main();

async function main() {
  const workspaceViolations = await Promise.all(workspaces.map(checkWorkspaceForDirectoryCycles));
  const violations = workspaceViolations.flat();
  const { exitCode, output, stream } = formatViolationReport(violations);
  stream.write(output);
  process.exitCode = exitCode;
}
async function checkWorkspaceForDirectoryCycles(workspace: WorkspaceTarget) {
  const baseDirectory = path.resolve(repoRoot, workspace.cwd);
  const modules = await cruiseTarget(workspace);
  return findDirectoryCycles(baseDirectory, workspace.target, modules).map(
    ({ directories, examples }) => ({
      directories,
      examples,
      scope: workspace.name,
    }),
  );
}

async function cruiseTarget({ cwd, target }: CruiseTarget) {
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

function findDirectoryCycles(baseDirectory: string, target: string, modules: ModuleRecord[]) {
  const graph: DirectoryGraph = {
    edges: new Map<string, Map<string, EdgeExample[]>>(),
    nodes: new Set<string>(),
  };
  for (const moduleRecord of modules.toSorted((left, right) =>
    left.source.localeCompare(right.source),
  )) {
    const fromBucket = getDirectoryNode(baseDirectory, target, moduleRecord.source);
    if (!fromBucket) {
      continue;
    }
    graph.nodes.add(fromBucket);
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
      graph.nodes.add(toBucket);
      addEdgeExample(getOrCreateEdgeExamples(graph.edges, fromBucket, toBucket), {
        from: moduleRecord.source,
        to: dependency.resolved,
      });
    }
  }
  return findStronglyConnectedComponents(graph).map((directories) => ({
    directories,
    examples: formatEdgeExamples(directories, graph.edges),
  }));
}

function getDirectoryNode(baseDirectory: string, target: string, filePath: string) {
  const targetRoot = path.resolve(baseDirectory, target);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(baseDirectory, filePath);
  const relativePath = path.relative(targetRoot, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }
  const segments = relativePath.split(path.sep).filter(Boolean);
  // oxlint-disable-next-line no-magic-numbers
  if (segments.length === 0) {
    return null;
  }
  // oxlint-disable-next-line no-magic-numbers
  if (segments.length === 1) {
    return target;
  }
  return path.join(target, path.dirname(relativePath)).replaceAll(path.sep, "/");
}

function getOrCreateEdgeExamples(
  edges: Map<string, Map<string, EdgeExample[]>>,
  fromBucket: string,
  toBucket: string,
) {
  let outgoingEdges = edges.get(fromBucket);
  if (!outgoingEdges) {
    outgoingEdges = new Map();
    edges.set(fromBucket, outgoingEdges);
  }
  let edgeExamples = outgoingEdges.get(toBucket);
  if (!edgeExamples) {
    edgeExamples = [];
    outgoingEdges.set(toBucket, edgeExamples);
  }
  return edgeExamples;
}

function addEdgeExample(edgeExamples: EdgeExample[], edgeExample: EdgeExample) {
  if (edgeExamples.some(({ from, to }) => from === edgeExample.from && to === edgeExample.to)) {
    return;
  }
  edgeExamples.push(edgeExample);
  edgeExamples.sort(compareEdgeExamples);
}

function compareEdgeExamples(left: EdgeExample, right: EdgeExample) {
  const fromOrder = left.from.localeCompare(right.from);
  // oxlint-disable-next-line no-magic-numbers
  if (fromOrder !== 0) {
    return fromOrder;
  }
  return left.to.localeCompare(right.to);
}
function findStronglyConnectedComponents(graph: DirectoryGraph) {
  const state: TraversalState = {
    components: [],
    indexByNode: new Map<string, number>(),
    lowLinkByNode: new Map<string, number>(),
    nextIndex: 0,
    stack: [],
    stackMembers: new Set<string>(),
  };
  for (const node of [...graph.nodes].toSorted()) {
    if (!state.indexByNode.has(node)) {
      visitNode(graph.edges, state, node);
    }
  }
  // Ignore single-node components; this command only reports cycles spanning directories.
  // oxlint-disable-next-line no-magic-numbers
  return state.components.filter((component) => component.length > 1);
}

function visitNode(edges: DirectoryGraph["edges"], state: TraversalState, node: string) {
  pushNode(state, node);
  for (const adjacentNode of edges.get(node)?.keys() ?? []) {
    visitAdjacentNode(edges, state, node, adjacentNode);
  }
  if (state.lowLinkByNode.get(node) === state.indexByNode.get(node)) {
    state.components.push(popComponent(state, node));
  }
}

function pushNode(state: TraversalState, node: string) {
  state.indexByNode.set(node, state.nextIndex);
  state.lowLinkByNode.set(node, state.nextIndex);
  // oxlint-disable-next-line no-magic-numbers
  state.nextIndex += 1;
  state.stack.push(node);
  state.stackMembers.add(node);
}

function visitAdjacentNode(
  edges: DirectoryGraph["edges"],
  state: TraversalState,
  node: string,
  adjacentNode: string,
) {
  if (!state.indexByNode.has(adjacentNode)) {
    visitNode(edges, state, adjacentNode);
    updateLowLink(state, node, state.lowLinkByNode.get(adjacentNode)!);
    return;
  }
  if (state.stackMembers.has(adjacentNode)) {
    updateLowLink(state, node, state.indexByNode.get(adjacentNode)!);
  }
}

function updateLowLink(state: TraversalState, node: string, candidateIndex: number) {
  state.lowLinkByNode.set(node, Math.min(state.lowLinkByNode.get(node)!, candidateIndex));
}

function popComponent(state: TraversalState, node: string) {
  const component: string[] = [];
  // oxlint-disable-next-line no-magic-numbers
  while (state.stack.length > 0) {
    const currentNode = state.stack.pop()!;
    state.stackMembers.delete(currentNode);
    component.push(currentNode);
    if (currentNode === node) {
      break;
    }
  }
  return component.toSorted();
}

function formatEdgeExamples(component: string[], edges: DirectoryGraph["edges"]) {
  const componentNodes = new Set(component);
  const examples: string[] = [];
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

function formatViolationReport(violations: Violation[]) {
  // oxlint-disable-next-line no-magic-numbers
  if (violations.length === 0) {
    return {
      exitCode: SUCCESS_EXIT_CODE,
      output: "No directory-level circular dependencies found.\n",
      stream: process.stdout,
    };
  }
  const lines = ["Directory-level circular dependencies found:", ""];
  for (const violation of violations) {
    lines.push(`[${violation.scope}] ${violation.directories.join(" <-> ")}`);
    lines.push(violation.examples.join("\n"));
    lines.push("");
  }
  return { exitCode: FAILURE_EXIT_CODE, output: `${lines.join("\n")}\n`, stream: process.stderr };
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Expected ${name} to be set.`);
  }
  return value;
}

function parseWorkspace(line: string) {
  return JSON.parse(line) as WorkspaceListItem;
}

interface WorkspaceListItem {
  location: string;
  name: string;
}
interface CruiseTarget {
  cwd: string;
  target: string;
}
interface WorkspaceTarget extends CruiseTarget {
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
interface DirectoryGraph {
  edges: Map<string, Map<string, EdgeExample[]>>;
  nodes: Set<string>;
}
interface EdgeExample {
  from: string;
  to: string;
}
interface TraversalState {
  components: string[][];
  indexByNode: Map<string, number>;
  lowLinkByNode: Map<string, number>;
  nextIndex: number;
  stack: string[];
  stackMembers: Set<string>;
}
interface Violation {
  directories: string[];
  examples: string[];
  scope: string;
}
