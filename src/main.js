const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("path");
const cfg = require("../app.config.js");

app.setName(cfg.name);

if (process.platform === "linux") {
  app.setDesktopName(cfg.desktopName);
  app.commandLine.appendSwitch("class", cfg.wmClass);

  if (cfg.forceX11 || process.env.AAHA_FORCE_X11 === "1") {
    app.commandLine.appendSwitch("ozone-platform", "x11");
  }
}

if (!cfg.disableHardening) {
  app.commandLine.appendSwitch("disable-background-networking");
  app.commandLine.appendSwitch("disable-domain-reliability");
  app.commandLine.appendSwitch("disable-component-update");
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
