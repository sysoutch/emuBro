#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require("child_process");

const DEFAULT_PORTS = [1420, 1421];

function parsePorts(args) {
  const parsed = args
    .map((value) => Number.parseInt(String(value).trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 65535);
  if (parsed.length === 0) return DEFAULT_PORTS;
  return Array.from(new Set(parsed));
}

function killWindowsPortListeners(ports) {
  const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
  const targetPorts = new Set(ports);
  const pids = new Set();

  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 5) return;
      const proto = String(parts[0] || "").toUpperCase();
      const local = String(parts[1] || "");
      const state = String(parts[3] || "").toUpperCase();
      const pidRaw = String(parts[4] || "").trim();
      if (proto !== "TCP" || state !== "LISTENING") return;
      const localPortText = local.slice(local.lastIndexOf(":") + 1).replace("]", "");
      const localPort = Number.parseInt(localPortText, 10);
      if (!targetPorts.has(localPort)) return;
      const pid = Number.parseInt(pidRaw, 10);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    });

  if (pids.size === 0) return [];
  const killed = [];
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid} /T`, { stdio: "ignore" });
      killed.push(pid);
    } catch (_error) {
      // continue; another process may have already killed it
    }
  }
  return killed;
}

function killUnixPortListeners(ports) {
  const pids = new Set();
  ports.forEach((port) => {
    try {
      const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });
      output
        .split(/\r?\n/)
        .map((line) => Number.parseInt(String(line).trim(), 10))
        .filter((pid) => Number.isFinite(pid) && pid > 0)
        .forEach((pid) => pids.add(pid));
    } catch (_error) {
      // no listener on this port
    }
  });
  if (pids.size === 0) return [];

  const killed = [];
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
      killed.push(pid);
    } catch (_error) {
      // continue
    }
  }
  return killed;
}

function main() {
  const ports = parsePorts(process.argv.slice(2));
  let killed = [];
  try {
    killed =
      process.platform === "win32"
        ? killWindowsPortListeners(ports)
        : killUnixPortListeners(ports);
  } catch (error) {
    console.error("[cleanup:dev-ports] failed:", error.message || String(error));
    process.exitCode = 1;
    return;
  }

  if (killed.length === 0) {
    console.log(`[cleanup:dev-ports] no listeners found on ports ${ports.join(", ")}`);
    return;
  }
  console.log(
    `[cleanup:dev-ports] killed PID(s) ${killed.join(", ")} on ports ${ports.join(", ")}`
  );
}

main();
