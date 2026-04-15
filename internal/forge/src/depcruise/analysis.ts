import type { ICruiseOptions } from "dependency-cruiser";
import type { WorkspaceSpec } from "#src/support/workspaces.ts";
import { cruise } from "dependency-cruiser";
import path from "node:path";

export async function analyzeWorkspace(
  repoRoot: string,
  workspace: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
) {
  const workspaceRoot = path.resolve(repoRoot, workspace.relativePath);
  const resolveWorkspacePath = createWorkspacePathResolver(repoRoot, workspaceRoot);
  const modules = await cruiseWorkspace(repoRoot, workspace, depcruiseOptions);

  return collectCycles(resolveWorkspacePath, workspace.sourceRoots, modules).map(
    ({ directories, examples }) => ({
      directories,
      examples,
      scope: workspace.name,
    }),
  );
}

async function cruiseWorkspace(
  repoRoot: string,
  { entries, tsconfigPath }: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
) {
  const result = (await cruise(entries, {
    ...depcruiseOptions,
    baseDir: repoRoot,
    tsConfig: {
      fileName: tsconfigPath,
    },
  })) as { output: { modules: ModuleRecord[] } };

  return result.output.modules;
}

function collectCycles(
  resolveWorkspacePath: (modulePath: string) => string | null,
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
    const fromNode = resolveDirectoryNode(resolveWorkspacePath, sourceRoots, moduleRecord.source);

    if (!fromNode) {
      continue;
    }

    graph.nodes.add(fromNode);

    for (const dependency of moduleRecord.dependencies.toSorted((left, right) =>
      (left.resolved ?? "").localeCompare(right.resolved ?? ""),
    )) {
      if (!dependency.resolved || dependency.couldNotResolve || dependency.coreModule) {
        continue;
      }

      const toNode = resolveDirectoryNode(resolveWorkspacePath, sourceRoots, dependency.resolved);

      if (!toNode || fromNode === toNode) {
        continue;
      }

      graph.nodes.add(toNode);
      addEdgeExample(ensureEdgeExamples(graph.edges, fromNode, toNode), {
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

function createWorkspacePathResolver(repoRoot: string, workspaceRoot: string) {
  const resolvedPaths = new Map<string, string | null>();

  return (modulePath: string) => {
    if (path.isAbsolute(modulePath)) {
      return toWorkspacePath(workspaceRoot, modulePath);
    }

    if (resolvedPaths.has(modulePath)) {
      return resolvedPaths.get(modulePath)!;
    }

    const absolutePath = path.resolve(repoRoot, modulePath);
    const workspacePath = toWorkspacePath(workspaceRoot, absolutePath);

    resolvedPaths.set(modulePath, workspacePath);

    return workspacePath;
  };
}

function resolveDirectoryNode(
  resolveWorkspacePath: (modulePath: string) => string | null,
  sourceRoots: Set<string>,
  filePath: string,
) {
  const relativePath = resolveWorkspacePath(filePath);

  if (!relativePath) {
    return null;
  }

  const segments = relativePath.split(path.sep).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  // Keep files at the workspace root in their own bucket when the tsconfig includes them.
  if (segments.length === 1) {
    return sourceRoots.has(".") ? "." : null;
  }

  const [sourceRoot, ...directorySegments] = segments;

  if (!sourceRoot || !sourceRoots.has(sourceRoot)) {
    return null;
  }

  if (directorySegments.length === 1) {
    return sourceRoot;
  }

  return path
    .join(sourceRoot, path.dirname(directorySegments.join(path.sep)))
    .replaceAll(path.sep, "/");
}

function toWorkspacePath(workspaceRoot: string, absolutePath: string) {
  const relativePath = path.relative(workspaceRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath;
}

function ensureEdgeExamples(
  edges: Map<string, Map<string, EdgeExample[]>>,
  fromNode: string,
  toNode: string,
) {
  let outgoingEdges = edges.get(fromNode);

  if (!outgoingEdges) {
    outgoingEdges = new Map();
    edges.set(fromNode, outgoingEdges);
  }

  let edgeExamples = outgoingEdges.get(toNode);

  if (!edgeExamples) {
    edgeExamples = [];
    outgoingEdges.set(toNode, edgeExamples);
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
