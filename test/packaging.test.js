"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pkg = require("../package.json");
const root = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

test("distribution builds explicitly disable publication", () => {
  assert.equal(pkg.scripts.dist, "electron-builder --linux --publish never");
});

test("builds start clean and install exactly one AppImage", () => {
  const build = read("build.sh");
  const install = read("install.sh");
  assert.ok(build.indexOf("rm -rf dist") !== -1);
  assert.ok(build.indexOf("rm -rf dist") < build.indexOf("npm run dist"));
  assert.match(build, /expected exactly one AppImage/);
  assert.match(install, /expected exactly one AppImage/);
  assert.doesNotMatch(install, /cp dist\/\*\.AppImage/);
});

test("release workflow is manual-only and reuses the guarded build", () => {
  const wf = read(".github", "workflows", "release.yml");
  const trigger = wf.slice(wf.indexOf("\non:"), wf.indexOf("\npermissions:"));
  assert.match(trigger, /workflow_dispatch:/);
  assert.doesNotMatch(trigger, /\b(push|pull_request|release|schedule):/);
  assert.match(wf, /^\s*- run: \.\/build\.sh$/m);
  assert.match(wf, /--draft=false/);
});
