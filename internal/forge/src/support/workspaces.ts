import { execFileSync } from "node:child_process";
import path from "node:path";
import typescript from "typescript";

export function collectWorkspaces(repoRoot: string) {
  return listWorkspaces(repoRoot)
    .map((workspace) => resolveWorkspace(repoRoot, workspace))
    .filter((workspace): workspace is WorkspaceSpec => workspace !== null);
}

function listWorkspaces(repoRoot: string) {
  return execFileSync("yarn", ["workspaces", "list", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map(parseWorkspaceLine);
}

function parseWorkspaceLine(line: string) {
  return JSON.parse(line) as WorkspaceListItem;
}

function resolveWorkspace(repoRoot: string, { location, name }: WorkspaceListItem) {
  if (location === ".") {
    return null;
  }

  const workspaceRoot = path.resolve(repoRoot, location);
  const tsconfigPath = path.join(workspaceRoot, "tsconfig.json");
  const parsedTsconfig = parseTsconfig(tsconfigPath);
  const includedFiles = excludeGitIgnoredPaths(repoRoot, parsedTsconfig.fileNames);
  const entries = toPathsRelativeTo(repoRoot, includedFiles);

  return {
    entries,
    name,
    relativePath: location,
    sourceRoots: getSourceRoots(workspaceRoot, includedFiles),
    tsconfigPath,
  };
}

function parseTsconfig(tsconfigPath: string) {
  const configFile = typescript.readConfigFile(tsconfigPath, typescript.sys.readFile);

  if (configFile.error) {
    throw new TypeError(typescript.formatDiagnostics([configFile.error], diagnosticsHost));
  }

  const parsedTsconfig = typescript.parseJsonConfigFileContent(
    configFile.config,
    typescript.sys,
    path.dirname(tsconfigPath),
    {},
    tsconfigPath,
  );

  if (parsedTsconfig.errors.length > 0) {
    throw new Error(typescript.formatDiagnostics(parsedTsconfig.errors, diagnosticsHost));
  }

  return parsedTsconfig;
}

function getSourceRoots(workspaceRoot: string, fileNames: string[]) {
  const sourceRoots = new Set<string>();

  for (const fileName of fileNames) {
    const relativePath = path.relative(workspaceRoot, fileName);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      continue;
    }

    const segments = relativePath.split(path.sep).filter(Boolean);

    if (segments.length <= 1) {
      sourceRoots.add(".");
      continue;
    }

    sourceRoots.add(segments[0]!);
  }

  return sourceRoots;
}

function excludeGitIgnoredPaths(repoRoot: string, fileNames: string[]) {
  if (fileNames.length === 0) {
    return fileNames;
  }

  const repoRelativePaths = toPathsRelativeTo(repoRoot, fileNames);
  const ignoredPaths = listGitIgnoredPaths(repoRoot, repoRelativePaths);

  return fileNames.filter((_, index) => !ignoredPaths.has(repoRelativePaths[index]!));
}

function toPathsRelativeTo(baseDirectory: string, fileNames: string[]) {
  return fileNames.map((fileName) => path.relative(baseDirectory, fileName));
}

function listGitIgnoredPaths(repoRoot: string, repoRelativePaths: string[]) {
  try {
    const output = execFileSync("git", ["check-ignore", "--stdin"], {
      cwd: repoRoot,
      encoding: "utf8",
      input: `${repoRelativePaths.join("\n")}\n`,
    });

    return new Set(output.trim().split("\n").filter(Boolean));
  } catch (error) {
    if (isGitCheckIgnoreMiss(error)) {
      return new Set<string>();
    }

    throw error;
  }
}

function isGitCheckIgnoreMiss(error: unknown) {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status === 1
  );
}

const diagnosticsHost = {
  getCanonicalFileName(fileName: string) {
    return typescript.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
  },
  getCurrentDirectory() {
    return process.cwd();
  },
  getNewLine() {
    return "\n";
  },
};

interface WorkspaceListItem {
  location: string;
  name: string;
}

export interface WorkspaceSpec {
  entries: string[];
  name: string;
  relativePath: string;
  sourceRoots: Set<string>;
  tsconfigPath: string;
}
