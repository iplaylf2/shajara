import { enableCompileCache } from "node:module";

enableCompileCache();

const argv = process.argv.slice(2);
const [command, ...commandArgs] = argv;

switch (command) {
  case "depcruise": {
    await import("./depcruise/index.ts");
    break;
  }
  case "pack:license": {
    process.argv = [process.argv[0]!, process.argv[1]!, ...commandArgs];
    await import("./pack-license.ts");
    break;
  }
  default: {
    throw new Error('Expected "depcruise" or "pack:license".');
  }
}
