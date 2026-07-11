const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const uninstallScript = path.join(repoRoot, "uninstall.sh");

function createDisposableInstall() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "apple-music-aaha-uninstall-"));
  const paths = {
    app: path.join(home, "MyApps", "apple-music-aaha", "app"),
    desktop: path.join(
      home,
      ".local",
      "share",
      "applications",
      "com.adamandhisagents.applemusic.desktop"
    ),
    icon: path.join(
      home,
      ".local",
      "share",
      "icons",
      "hicolor",
      "512x512",
      "apps",
      "apple-music-aaha.png"
    ),
    profile: path.join(home, ".config", "Apple Music"),
    profileMarker: path.join(home, ".config", "Apple Music", "Cookies")
  };

  for (const directory of [paths.app, path.dirname(paths.desktop), path.dirname(paths.icon), paths.profile]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(paths.desktop, "desktop entry\n");
  fs.writeFileSync(paths.icon, "icon\n");
  fs.writeFileSync(paths.profileMarker, "session data\n");

  return { home, paths };
}

function runUninstall(home, args = []) {
  return spawnSync("bash", [uninstallScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, HOME: home }
  });
}

test("normal uninstall removes the app and preserves the profile", (t) => {
  const { home, paths } = createDisposableInstall();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const result = runUninstall(home);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(paths.app), false);
  assert.equal(fs.existsSync(paths.desktop), false);
  assert.equal(fs.existsSync(paths.icon), false);
  assert.equal(fs.existsSync(paths.profileMarker), true);
  assert.match(result.stdout, /Preserved local profile/);
});

test("--purge removes the app and the entire local profile", (t) => {
  const { home, paths } = createDisposableInstall();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const result = runUninstall(home, ["--purge"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(paths.app), false);
  assert.equal(fs.existsSync(paths.profile), false);
  assert.match(result.stdout, /Purging the local Apple Music profile/);
});

test("unknown arguments fail before deleting anything", (t) => {
  const { home, paths } = createDisposableInstall();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const result = runUninstall(home, ["--unknown"]);
  assert.equal(result.status, 2);
  assert.equal(fs.existsSync(paths.app), true);
  assert.equal(fs.existsSync(paths.profileMarker), true);
  assert.match(result.stderr, /Usage: \.\/uninstall\.sh/);
});
