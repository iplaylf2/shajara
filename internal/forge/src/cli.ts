const processArguments = process.argv.slice(2);
const [command, ...arguments_] = processArguments;

switch (command) {
  case "depcruise": {
    await import("./check-directory-cycles.ts");
    break;
  }
  case "pack:license": {
    process.argv = [process.argv[0]!, process.argv[1]!, ...arguments_];
    await import("./pack-license.ts");
    break;
  }
  default: {
    throw new Error('Expected "depcruise" or "pack:license".');
  }
}
