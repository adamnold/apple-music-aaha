const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  recordWidevineFailure,
  recordWidevineSuccess,
  widevineUpdateIsDue,
  widevineWasPrepared
} = require("../src/widevine-state.js");

const NOW = new Date("2026-07-10T07:00:00.000Z");

test("an installation without a success timestamp is due for repair", () => {
  const state = { consent: true, componentVersion: "4.10.3050.0" };
  assert.equal(widevineWasPrepared(state), false);
  assert.equal(widevineUpdateIsDue(state, 30, NOW.getTime()), true);
});

test("a recent successful installation remains offline between maintenance checks", () => {
  const state = {
    consent: true,
    componentVersion: "4.10.3050.0",
    lastSuccessfulUpdate: "2026-07-09T07:00:00.000Z"
  };
  assert.equal(widevineWasPrepared(state), true);
  assert.equal(widevineUpdateIsDue(state, 30, NOW.getTime()), false);
});

test("first Linux installation records exactly one pending manual reopen", () => {
  const state = recordWidevineSuccess(
    { consent: true },
    "4.10.3050.0",
    { now: NOW, restartRequired: true }
  );
  assert.equal(state.lastSuccessfulUpdate, NOW.toISOString());
  assert.equal(state.componentVersion, "4.10.3050.0");
  assert.equal(state.restartRequired, true);
});

test("a successful reopen clears restart and failure markers", () => {
  const state = recordWidevineSuccess(
    {
      consent: true,
      componentVersion: "4.10.3050.0",
      lastFailureAt: "2026-07-09T06:00:00.000Z",
      restartRequired: true
    },
    "4.10.3050.0",
    { now: NOW }
  );
  assert.equal("restartRequired" in state, false);
  assert.equal("lastFailureAt" in state, false);
});

test("an offline load failure schedules a repair without discarding consent or version", () => {
  const state = recordWidevineFailure(
    {
      consent: true,
      componentVersion: "4.10.3050.0",
      lastSuccessfulUpdate: "2026-07-09T07:00:00.000Z"
    },
    { now: NOW, repairDue: true }
  );
  assert.equal(state.consent, true);
  assert.equal(state.componentVersion, "4.10.3050.0");
  assert.equal("lastSuccessfulUpdate" in state, false);
  assert.equal(state.lastFailureAt, NOW.toISOString());
});

test("main process has no automatic relaunch or global component-updater kill switch", () => {
  const mainPath = path.join(__dirname, "..", "src", "main.js");
  const source = fs.readFileSync(mainPath, "utf8");
  assert.doesNotMatch(source, /disable-component-update/);
  assert.doesNotMatch(source, /app\.relaunch\s*\(/);
  assert.doesNotMatch(source, /app\.exit\s*\(/);
});
