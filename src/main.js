const fs = require("fs");
const { app, BrowserWindow, components, dialog, Menu, session, shell } = require("electron");
const path = require("path");
const cfg = require("../app.config.js");
const {
  recordWidevineFailure,
  recordWidevineSuccess,
  widevineUpdateIsDue,
  widevineWasPrepared
} = require("./widevine-state.js");

app.setName(cfg.name);

const widevineStatePath = path.join(app.getPath("userData"), "widevine-state.json");
const forceWidevineUpdate = process.env.AAHA_WIDEVINE_UPDATE === "1";

function readWidevineState() {
  try {
    return JSON.parse(fs.readFileSync(widevineStatePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[widevine] Could not read update state: ${error.message}`);
    }
    return {};
  }
}

function writeWidevineState(state) {
  const stateDirectory = path.dirname(widevineStatePath);
  const temporaryPath = `${widevineStatePath}.tmp-${process.pid}`;
  fs.mkdirSync(stateDirectory, { recursive: true });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryPath, widevineStatePath);
}

const startupWidevineState = readWidevineState();
const widevineUpdateScheduled =
  forceWidevineUpdate ||
  (startupWidevineState.consent !== false &&
    widevineUpdateIsDue(startupWidevineState, cfg.widevineUpdateIntervalDays));

if (process.platform === "linux") {
  app.setDesktopName(cfg.desktopName);
  app.commandLine.appendSwitch("class", cfg.wmClass);

  if (cfg.forceX11 || process.env.AAHA_FORCE_X11 === "1") {
    app.commandLine.appendSwitch("ozone-platform", "x11");
  }
}

if (!cfg.disableHardening) {
  if (!widevineUpdateScheduled) {
    app.commandLine.appendSwitch("disable-background-networking");
  }
  app.commandLine.appendSwitch("disable-domain-reliability");
  app.commandLine.appendSwitch("disable-breakpad");
  app.commandLine.appendSwitch(
    "disable-features",
    "NetworkTimeServiceQuerying,Translate,OptimizationHints,MediaRouter"
  );
}

const chromeVersion = process.versions.chrome;
app.userAgentFallback =
  `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

const iconPath = path.join(__dirname, "..", "build", "icons", "512x512.png");
const observedHosts = new Set();
let mainWindow;

async function prepareWidevine() {
  if (!components?.whenReady || !components.WIDEVINE_CDM_ID) {
    console.error("[widevine] DRM-capable Electron runtime is unavailable");
    await dialog.showMessageBox({
      type: "error",
      title: "Protected playback unavailable",
      message: "This build cannot initialize Widevine.",
      detail: "Apple Music will be limited to previews. Reinstall the DRM-capable release.",
      buttons: ["Continue"]
    });
    return true;
  }

  let state = { ...startupWidevineState };

  // Stop the updater before obtaining consent. This setting persists across launches.
  components.updatesEnabled = false;

  if (forceWidevineUpdate) {
    state.consent = true;
  } else if (state.consent !== true && state.consent !== false) {
    const { response } = await dialog.showMessageBox({
      type: "question",
      title: "Enable full Apple Music playback?",
      message: "Full tracks require Google Widevine DRM on Linux.",
      detail:
        "Enable a direct Widevine download from Google? The updater is disabled again " +
        `after installation and checked no more than every ${cfg.widevineUpdateIntervalDays} days. ` +
        "Google advertising and analytics domains remain blocked inside Apple Music.",
      buttons: ["Enable Full Playback", "Use Previews Only"],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    state.consent = response === 0;
    writeWidevineState(state);
  }

  if (state.consent !== true) {
    console.info("[widevine] Download declined; preview-only playback remains available");
    return true;
  }

  const widevineId = components.WIDEVINE_CDM_ID;
  const widevineWasPreparedBeforeLaunch = widevineWasPrepared(state);
  const shouldUpdate =
    forceWidevineUpdate || widevineUpdateIsDue(state, cfg.widevineUpdateIntervalDays);
  components.updatesEnabled = shouldUpdate;

  let readyComponents;
  try {
    readyComponents = await components.whenReady([widevineId]);
  } catch (error) {
    components.updatesEnabled = false;
    state = recordWidevineFailure(state, { repairDue: !shouldUpdate });
    writeWidevineState(state);

    if (!shouldUpdate) {
      console.warn("[widevine] Installed component was unavailable; repair due next launch");
      await dialog.showMessageBox({
        type: "warning",
        title: "Widevine repair needed",
        message: "Full-track playback is temporarily unavailable.",
        detail:
          "Apple Music will open in preview mode. The next launch will make one consented " +
          "repair check with Google's Widevine component service; it will not restart itself.",
        buttons: ["Continue"]
      });
      return true;
    }

    console.error(`[widevine] Installation or update failed: ${error.message}`);
    await dialog.showMessageBox({
      type: "error",
      title: "Widevine setup failed",
      message: "Full-track playback could not be prepared.",
      detail:
        "Apple Music will remain available in preview mode. Check the network connection, " +
        "then launch once with AAHA_WIDEVINE_UPDATE=1 to retry.",
      buttons: ["Continue"]
    });
    return true;
  }

  components.updatesEnabled = false;
  const statusAfter = components.status()[widevineId];
  const readyComponent = readyComponents?.find((component) => component.id === widevineId);
  const componentVersion =
    statusAfter?.version || readyComponent?.version || state.componentVersion || null;
  const requiresManualRestart =
    process.platform === "linux" && !widevineWasPreparedBeforeLaunch && Boolean(componentVersion);

  if (shouldUpdate) {
    state = recordWidevineSuccess(state, componentVersion, {
      restartRequired: requiresManualRestart
    });
    writeWidevineState(state);
  } else if (state.restartRequired) {
    delete state.restartRequired;
    delete state.lastFailureAt;
    writeWidevineState(state);
  }

  console.info(
    `[widevine] Ready: ${componentVersion || "installed"}; automatic updates disabled`
  );

  if (requiresManualRestart) {
    console.info("[widevine] First Linux installation requires one manual reopen");
    await dialog.showMessageBox({
      type: "info",
      title: "Widevine installed",
      message: "Full Apple Music playback will be ready after one reopen.",
      detail:
        "Apple Music will close cleanly now. Reopen it from the application launcher; " +
        "it will not download Widevine again.",
      buttons: ["Close Apple Music"]
    });
    app.quit();
    return false;
  }

  return true;
}

function hostnameMatches(hostname, suffixes) {
  const normalized = hostname.toLowerCase();
  return suffixes.some((suffix) => {
    const expected = suffix.toLowerCase();
    return normalized === expected || normalized.endsWith(`.${expected}`);
  });
}

function parseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}

function isAllowedInApp(urlString) {
  const parsed = parseUrl(urlString);
  if (!parsed) return false;
  if (parsed.protocol === "about:" && parsed.href === "about:blank") return true;
  if (parsed.protocol !== "https:") return false;
  return hostnameMatches(parsed.hostname, cfg.allowedHostSuffixes);
}

function isSafeExternal(urlString) {
  const parsed = parseUrl(urlString);
  return Boolean(parsed && ["https:", "http:", "mailto:"].includes(parsed.protocol));
}

function originIsAllowed(urlString) {
  const parsed = parseUrl(urlString);
  return Boolean(
    parsed &&
      parsed.protocol === "https:" &&
      hostnameMatches(parsed.hostname, cfg.allowedHostSuffixes)
  );
}

function permissionIsAllowed(permission, origin) {
  return cfg.allowedPermissions.includes(permission) && originIsAllowed(origin);
}

function openExternal(url) {
  if (!isSafeExternal(url)) return;
  shell.openExternal(url).catch((error) => {
    console.error(`[navigation] Could not open external URL: ${error.message}`);
  });
}

function guardNavigation(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInApp(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          icon: iconPath,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            backgroundThrottling: false,
            spellcheck: false
          }
        }
      };
    }

    if (cfg.openExternalInBrowser) openExternal(url);
    return { action: "deny" };
  });

  const handleNavigation = (event, url) => {
    if (isAllowedInApp(url)) return;
    event.preventDefault();
    if (cfg.openExternalInBrowser) openExternal(url);
  };

  contents.on("will-navigate", handleNavigation);
  contents.on("will-redirect", handleNavigation);
}

async function configureSession() {
  await app.configureHostResolver({ secureDnsMode: "off" });

  const ses = session.defaultSession;
  const requestFilter = {
    urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"]
  };

  ses.webRequest.onBeforeRequest(requestFilter, (details, callback) => {
    const parsed = parseUrl(details.url);
    if (!parsed) {
      callback({ cancel: false });
      return;
    }

    if (process.env.AAHA_NETWORK_AUDIT === "1" && !observedHosts.has(parsed.hostname)) {
      observedHosts.add(parsed.hostname);
      console.info(`[network] observed host: ${parsed.hostname}`);
    }

    const shouldBlock =
      details.resourceType !== "mainFrame" &&
      hostnameMatches(parsed.hostname, cfg.blockedHostSuffixes);

    if (shouldBlock) {
      console.warn(`[privacy] blocked request to ${parsed.hostname}`);
    }

    callback({ cancel: shouldBlock });
  });

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => {
    const origin = requestingOrigin || details?.requestingUrl || "";
    return permissionIsAllowed(permission, origin);
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details?.requestingUrl || webContents.getURL();
    callback(permissionIsAllowed(permission, origin));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: cfg.width,
    height: cfg.height,
    minWidth: cfg.minWidth,
    minHeight: cfg.minHeight,
    title: cfg.name,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  guardNavigation(mainWindow.webContents);
  mainWindow.webContents.on("did-create-window", (childWindow) => {
    guardNavigation(childWindow.webContents);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    if (code !== -3) console.error(`[load] ${description} (${code}) at ${url}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer] process ended: ${details.reason}`);
  });

  mainWindow.loadURL(cfg.url);
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    const shouldContinue = await prepareWidevine();
    if (!shouldContinue) return;
    await configureSession();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
