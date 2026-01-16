#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const binaryPath = path.join(
  __dirname,
  "browsehand" + (process.platform === "win32" ? ".exe" : "")
);

const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (err) => {
  console.error(`Failed to start browsehand: ${err.message}`);
  console.error("Run 'npm rebuild browsehand' to reinstall the binary.");
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
