// oxlint-disable no-magic-numbers
import { execFileSync } from "node:child_process";
import path from "node:path";
import typescript from "typescript";

export function getWorkspaceTargets(repoRoot: string) {
  return listWorkspaces(repoRoot)
    .map((workspace) => resolveWorkspaceTarget(repoRoot, workspace))
    .filter((workspace): workspace is WorkspaceTarget => workspace !== null);
}

function listWorkspaces(repoRoot: string) {
  return execFileSync("yarn", ["workspaces", "list", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map(parseWorkspace);
}

function parseWorkspace(line: string) {
  return JSON.parse(line) as WorkspaceListItem;
}

function resolveWorkspaceTarget(repoRoot: string, { location, name }: WorkspaceListItem) {
  if (location === ".") {
    return null;
  }

  const workspaceRoot = path.resolve(repoRoot, location);
  const tsconfigPath = path.join(workspaceRoot, "tsconfig.json");
  const parsedTsconfig = parseTsconfig(tsconfigPath);
  const includedFileNames = excludeGitIgnoredPaths(repoRoot, parsedTsconfig.fileNames);
  const entryPaths = toRepoRelativePaths(repoRoot, includedFileNames);

  return {
    cwd: location,
    entryPaths,
    name,
    sourceRoots: getSourceRoots(workspaceRoot, includedFileNames),
    tsconfigPath,
  };
}

function parseTsconfig(tsconfigPath: string) {
  const configFile = typescript.readConfigFile(tsconfigPath, typescript.sys.readFile);

  if (configFile.error) {
    throw new TypeError(
      typescript.formatDiagnostics([configFile.error], typescriptFormatDiagnosticsHost),
    );
  }

  const parsedTsconfig = typescript.parseJsonConfigFileContent(
    configFile.config,
    typescript.sys,
    path.dirname(tsconfigPath),
    {},
    tsconfigPath,
  );

  if (parsedTsconfig.errors.length > 0) {
    throw new Error(
      typescript.formatDiagnostics(parsedTsconfig.errors, typescriptFormatDiagnosticsHost),
    );
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

  const repoRelativePaths = toRepoRelativePaths(repoRoot, fileNames);
  const ignoredPaths = listGitIgnoredPaths(repoRoot, repoRelativePaths);

  return fileNames.filter((_, index) => !ignoredPaths.has(repoRelativePaths[index]!));
}

function toRepoRelativePaths(repoRoot: string, fileNames: string[]) {
  return fileNames.map((fileName) => path.relative(repoRoot, fileName));
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

const typescriptFormatDiagnosticsHost = {
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

export interface WorkspaceTarget {
  cwd: string;
  entryPaths: string[];
  name: string;
  sourceRoots: Set<string>;
  tsconfigPath: string;
}
