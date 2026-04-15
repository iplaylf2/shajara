import type { ICruiseOptions } from "dependency-cruiser";
import type { WorkspaceTarget } from "./support/workspace-targets.ts";
import { cruise } from "dependency-cruiser";
import { getWorkspaceTargets } from "./support/workspace-targets.ts";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { requireEnvPath } from "./support/environment.ts";

const FAILURE_EXIT_CODE = 1;
const SUCCESS_EXIT_CODE = 0;

const repoRoot = requireEnvPath("PROJECT_CWD");
const cruiseConfigPath = path.join(repoRoot, ".dependency-cruiser.mjs");

await main();

async function main() {
  const cruiseOptions = await loadCruiseOptions();
  const workspaces = getWorkspaceTargets(repoRoot);
  const workspaceViolations = await Promise.all(
    workspaces.map((workspace) => checkWorkspaceForDirectoryCycles(workspace, cruiseOptions)),
  );
  const violations = workspaceViolations.flat();
  const { exitCode, output, stream } = formatViolationReport(violations);
  stream.write(output);
  process.exitCode = exitCode;
}

async function checkWorkspaceForDirectoryCycles(
  workspace: WorkspaceTarget,
  cruiseOptions: ICruiseOptions,
) {
  const baseDirectory = path.resolve(repoRoot, workspace.cwd);
  const modules = await cruiseTarget(workspace, cruiseOptions);
  return findDirectoryCycles(baseDirectory, workspace.sourceRoots, modules).map(
    ({ directories, examples }) => ({
      directories,
      examples,
      scope: workspace.name,
    }),
  );
}

async function cruiseTarget(
  { entryPaths, tsconfigPath }: WorkspaceTarget,
  cruiseOptions: ICruiseOptions,
) {
  const result = (await cruise(entryPaths, {
    ...cruiseOptions,
    baseDir: repoRoot,
    tsConfig: {
      fileName: tsconfigPath,
    },
  })) as { output: { modules: ModuleRecord[] } };

  return result.output.modules;
}

async function loadCruiseOptions() {
  const { default: configuration } = (await import(
    pathToFileURL(cruiseConfigPath).href
  )) as CruiseConfigurationModule;

  return configuration.options;
}

function findDirectoryCycles(
  baseDirectory: string,
  sourceRoots: Set<string>,
  modules: ModuleRecord[],
) {
  const graph: DirectoryGraph = {
    edges: new Map<string, Map<string, EdgeExample[]>>(),
    nodes: new Set<string>(),
  };
  for (const moduleRecord of modules.toSorted((left, right) =>
    left.source.localeCompare(right.source),
  )) {
    const fromBucket = getDirectoryNode(baseDirectory, sourceRoots, moduleRecord.source);
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
      const toBucket = getDirectoryNode(baseDirectory, sourceRoots, dependency.resolved);
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

function getDirectoryNode(baseDirectory: string, sourceRoots: Set<string>, filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(baseDirectory, filePath);
  const relativePath = path.relative(baseDirectory, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }
  const segments = relativePath.split(path.sep).filter(Boolean);
  // oxlint-disable-next-line no-magic-numbers
  if (segments.length === 0) {
    return null;
  }
  // Keep files at the workspace root in their own bucket when the tsconfig includes them.
  // oxlint-disable-next-line no-magic-numbers
  if (segments.length === 1) {
    return sourceRoots.has(".") ? "." : null;
  }
  const [sourceRoot, ...directorySegments] = segments;
  if (!sourceRoot) {
    return null;
  }
  if (!sourceRoots.has(sourceRoot)) {
    return null;
  }
  // oxlint-disable-next-line no-magic-numbers
  if (directorySegments.length === 1) {
    return sourceRoot;
  }
  return path
    .join(sourceRoot, path.dirname(directorySegments.join(path.sep)))
    .replaceAll(path.sep, "/");
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
interface CruiseConfiguration {
  options: ICruiseOptions;
}
interface CruiseConfigurationModule {
  default: CruiseConfiguration;
}
