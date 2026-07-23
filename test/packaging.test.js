"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const pkg = require("../package.json");

test("distribution builds explicitly disable publication", () => {
  assert.equal(pkg.scripts.dist, "electron-builder --linux --publish never");
});
