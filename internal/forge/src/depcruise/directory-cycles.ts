import type { ModuleRecord } from "./modules.ts";
import path from "node:path";

export function collectDirectoryCycles(
  repoRoot: string,
  workspaceRoot: string,
  sourceRoots: Set<string>,
  modules: ModuleRecord[],
): DirectoryCycle[] {
  const resolveWorkspacePath = createWorkspacePathResolver(repoRoot, workspaceRoot);
  const graph = collectDirectoryGraph(resolveWorkspacePath, sourceRoots, modules);

  return findStronglyConnectedComponents(graph).map((directories) => ({
    directories,
    examples: formatEdgeExamples(directories, graph.edges),
  }));
}

function collectDirectoryGraph(
  resolveWorkspacePath: (modulePath: string) => string | null,
  sourceRoots: Set<string>,
  modules: ModuleRecord[],
) {
  const graph: DirectoryGraph = {
    edges: new Map<string, Map<string, EdgeExample[]>>(),
    nodes: new Set<string>(),
  };

  for (const moduleRecord of modules.toSorted(compareModules)) {
    const fromNode = resolveDirectoryNode(resolveWorkspacePath, sourceRoots, moduleRecord.source);

    if (!fromNode) {
      continue;
    }

    graph.nodes.add(fromNode);

    for (const dependency of moduleRecord.dependencies.toSorted(compareDependencies)) {
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

  return graph;
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

    const workspacePath = toWorkspacePath(workspaceRoot, path.resolve(repoRoot, modulePath));

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

function compareModules(left: ModuleRecord, right: ModuleRecord) {
  return left.source.localeCompare(right.source);
}

function compareDependencies(
  left: ModuleRecord["dependencies"][number],
  right: ModuleRecord["dependencies"][number],
) {
  return (left.resolved ?? "").localeCompare(right.resolved ?? "");
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

  return state.components.filter((component) => component.length > 1);
}

function visitNode(edges: DirectoryGraph["edges"], state: TraversalState, node: string) {
  pushNode(state, node);

  for (const adjacentNode of edges.get(node)?.keys() ?? []) {
    if (!state.indexByNode.has(adjacentNode)) {
      visitNode(edges, state, adjacentNode);
      updateLowLink(state, node, state.lowLinkByNode.get(adjacentNode)!);
      continue;
    }

    if (state.stackMembers.has(adjacentNode)) {
      updateLowLink(state, node, state.indexByNode.get(adjacentNode)!);
    }
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

    for (const [toNode, edgeExamples] of [...outgoingEdges.entries()].toSorted(compareEdgeNodes)) {
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

function compareEdgeNodes([left]: [string, EdgeExample[]], [right]: [string, EdgeExample[]]) {
  return left.localeCompare(right);
}

interface DirectoryGraph {
  edges: Map<string, Map<string, EdgeExample[]>>;
  nodes: Set<string>;
}

interface EdgeExample {
  from: string;
  to: string;
}

interface DirectoryCycle {
  directories: string[];
  examples: string[];
}

interface TraversalState {
  components: string[][];
  indexByNode: Map<string, number>;
  lowLinkByNode: Map<string, number>;
  nextIndex: number;
  stack: string[];
  stackMembers: Set<string>;
}
