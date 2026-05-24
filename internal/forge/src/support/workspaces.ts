import { execFileSync } from "node:child_process";
import path from "node:path";
import typescript from "typescript";

export function collectWorkspaces(repoRoot: string, entryExtensions: string[]): WorkspaceSpec[] {
  return listWorkspaces(repoRoot).flatMap((workspace) =>
    workspace.location === "." ? [] : [collectWorkspace(repoRoot, workspace, entryExtensions)],
  );
}

export interface WorkspaceListItem {
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

function listWorkspaces(repoRoot: string): WorkspaceListItem[] {
  return execFileSync("yarn", ["workspaces", "list", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as WorkspaceListItem);
}

function collectWorkspace(
  repoRoot: string,
  { location, name }: WorkspaceListItem,
  entryExtensions: string[],
): WorkspaceSpec {
  const workspaceRoot = path.resolve(repoRoot, location);
  const tsconfigPath = path.join(workspaceRoot, "tsconfig.json");
  const parsedTsconfig = parseTsconfig(tsconfigPath);
  const includedFiles = excludeGitIgnoredPaths(
    repoRoot,
    collectCruiseEntries(workspaceRoot, parsedTsconfig, entryExtensions),
  );
  const entries = toPathsRelativeTo(repoRoot, includedFiles);

  return {
    entries,
    name,
    relativePath: location,
    sourceRoots: getSourceRoots(workspaceRoot, includedFiles),
    tsconfigPath,
  };
}

function collectCruiseEntries(
  workspaceRoot: string,
  parsedTsconfig: ParsedTsconfig,
  entryExtensions: string[],
): string[] {
  const entryExtensionSet = new Set(entryExtensions);
  const includedFiles = readWorkspaceEntries(workspaceRoot, parsedTsconfig.raw, entryExtensions);
  const explicitlyListedFiles = ((parsedTsconfig.raw.files ?? []) as string[])
    .map((fileName: string) => path.resolve(workspaceRoot, fileName))
    .filter((fileName) => entryExtensionSet.has(getFileExtension(fileName)));

  return [...new Set([...includedFiles, ...explicitlyListedFiles])];
}

function readWorkspaceEntries(
  workspaceRoot: string,
  rawTsconfig: ParsedTsconfig["raw"],
  entryExtensions: string[],
): string[] {
  if (rawTsconfig.include && rawTsconfig.include.length > 0) {
    return typescript.sys.readDirectory(
      workspaceRoot,
      entryExtensions,
      rawTsconfig.exclude,
      rawTsconfig.include,
    );
  }

  if (rawTsconfig.files) {
    return typescript.sys.readDirectory(workspaceRoot, entryExtensions, rawTsconfig.exclude, []);
  }

  return typescript.sys.readDirectory(workspaceRoot, entryExtensions, rawTsconfig.exclude);
}

function getFileExtension(fileName: string) {
  return fileName.endsWith(".d.ts") ? ".d.ts" : path.extname(fileName);
}

function parseTsconfig(tsconfigPath: string): typescript.ParsedCommandLine {
  const parsedTsconfig = typescript.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    {},
    {
      ...typescript.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new TypeError(typescript.formatDiagnostics([diagnostic], diagnosticsHost));
      },
    },
  )!;

  if (parsedTsconfig.errors.length > 0) {
    throw new Error(typescript.formatDiagnostics(parsedTsconfig.errors, diagnosticsHost));
  }

  return parsedTsconfig;
}

function getSourceRoots(workspaceRoot: string, fileNames: string[]): Set<string> {
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

function excludeGitIgnoredPaths(repoRoot: string, fileNames: string[]): string[] {
  if (fileNames.length === 0) {
    return fileNames;
  }

  const repoRelativePaths = toPathsRelativeTo(repoRoot, fileNames);
  const ignoredPaths = listGitIgnoredPaths(repoRoot, repoRelativePaths);

  return fileNames.filter((_, index) => !ignoredPaths.has(repoRelativePaths[index]!));
}

function toPathsRelativeTo(baseDirectory: string, fileNames: string[]): string[] {
  return fileNames.map((fileName) => path.relative(baseDirectory, fileName));
}

function listGitIgnoredPaths(repoRoot: string, repoRelativePaths: string[]): Set<string> {
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

type ParsedTsconfig = typescript.ParsedCommandLine;
