const { spawn } = require("child_process");

function runElectron() {
  let electronBinary = "";
  try {
    electronBinary = require("electron");
  } catch (error) {
    console.error("[run-electron] Unable to resolve Electron binary:", error?.message || error);
    process.exit(1);
  }

  const env = { ...process.env };
  if (Object.prototype.hasOwnProperty.call(env, "ELECTRON_RUN_AS_NODE")) {
    delete env.ELECTRON_RUN_AS_NODE;
  }

  const appPath = process.cwd();
  const extraArgs = process.argv.slice(2);
  const child = spawn(electronBinary, [appPath, ...extraArgs], {
    stdio: "inherit",
    env
  });

  child.on("error", (error) => {
    console.error("[run-electron] Failed to start Electron:", error?.message || error);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(Number.isInteger(code) ? code : 1);
  });
}

runElectron();
