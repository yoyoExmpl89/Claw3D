const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

const runProcess = (name, command, args) => {
  const proc = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  proc.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
    process.exit(code ?? 1);
  });

  proc.on("error", (err) => {
    console.error(`[${name}] error: ${err.message}`);
    process.exit(1);
  });

  return proc;
};

console.log("[start] Starting Hermes gateway adapter...");
const adapter = runProcess("hermes-adapter", "node", [
  path.join(__dirname, "hermes-gateway-adapter.js"),
]);

// Give the adapter a moment to bind its port before starting the main server
setTimeout(() => {
  console.log("[start] Starting Claw3D main server...");
  runProcess("claw3d", "node", [path.join(__dirname, "index.js")]);
}, 2000);

process.on("SIGTERM", () => {
  adapter.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGINT", () => {
  adapter.kill("SIGINT");
  process.exit(0);
});