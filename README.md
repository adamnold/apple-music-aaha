# Apple Music (AAHA) v0.9.1

An unofficial Apple Music desktop wrapper for Fedora KDE, built by
**Adam And His Agents (AAHA)**. It opens Apple's official web player in a
dedicated Electron window with a stable, transparent taskbar icon.

Apple publishes `music.apple.com` as a standalone-capable PWA. This project
packages that web experience as an AppImage and an unpacked personal install;
it does not redistribute Apple Music application code or media.

> Not affiliated with Apple Inc. Apple, Apple Music, and the Apple Music logo
> are trademarks of Apple Inc. See `NOTICE`.

## Fedora requirements

```bash
sudo dnf install nodejs npm fuse fuse-libs
```

The build is tested on Fedora 44 KDE Plasma, x86_64.

## Build and install

```bash
./build.sh
./install.sh
```

`build.sh` uses the committed dependency lock, checks the JavaScript, and
produces:

- `dist/linux-unpacked/`
- `dist/apple-music-aaha-v0.9.1-x86_64.AppImage`
- `dist/SHA256SUMS`

`install.sh` copies the unpacked runtime to
`~/MyApps/apple-music-aaha/app/`, stores the AppImage beside it, installs the
transparent icon at standard Linux sizes, and creates a KDE launcher whose
desktop name and window identity match exactly. Fedora prompts once through
`sudo` so the root-owned Chromium sandbox helper can be installed with mode
`4755`; this keeps the renderer sandbox enabled and avoids `--no-sandbox`.

To remove the personal installation, run `./uninstall.sh`.

## Wayland and taskbar identity

The default is a currently supported Castlabs ECS release running natively on
Wayland. The package uses the same reverse-DNS identity for Electron's
`desktopName`, Wayland app ID, X11 `WM_CLASS`, the generated desktop entry, and
`StartupWMClass`.

Chromium may print a Vulkan/Wayland capability message during startup on Fedora
44. The tested graphics report confirms that the actual display path is
hardware-accelerated ANGLE/OpenGL, with GPU compositing and video decoding
enabled; the message is not a renderer failure.

If a future KDE or graphics regression affects the native Wayland build, run
with the packaged ECS runtime through XWayland instead:

```bash
AAHA_FORCE_X11=1 ./dist/linux-unpacked/apple-music-aaha
```

This fallback does not require downgrading Electron.

## Privacy and security baseline

- Chromium background networking, domain-reliability reporting, translate,
  optimization hints, network-time queries, Media Router, and Breakpad are
  disabled outside a scheduled Widevine maintenance launch.
- Chromium Secure DNS is disabled so Fedora's configured system resolver is
  used.
- Google, DoubleClick, YouTube, and common Google tracking/resource domains
  are blocked for in-app subresources.
- Renderer sandboxing, context isolation, and web security are explicitly on;
  Node.js integration is off.
- Remote permissions are denied except protected-media access requested by an
  approved Apple origin.
- External HTTP(S) and mail links open in the system browser/application;
  unknown URL schemes are denied.

### Full-track playback and Widevine

Apple Music serves previews when the browser cannot decrypt protected catalog
audio. This wrapper therefore uses Castlabs Electron for Content Security and
Google's proprietary Widevine Content Decryption Module (CDM).

The first launch asks before contacting Google. If approved, Widevine is
downloaded dynamically from Google's component service; Linux then restarts the
app once so the sandbox can load it. The component updater is disabled after a
successful installation using both the ECS setting and Chromium's command-line
guard, and is enabled no more than once every 30 days for a maintenance check.
The Apple Music webpage remains subject to the Google-domain subresource
blocklist throughout playback.

To request an immediate CDM repair or maintenance check:

```bash
AAHA_WIDEVINE_UPDATE=1 ~/MyApps/apple-music-aaha/app/apple-music-aaha
```

Widevine cannot legally be redistributed inside the AppImage, so the initial
download is required for full tracks. Choosing **Use Previews Only** keeps the
CDM updater disabled.

The wrapped website must still contact Apple and Apple's content-delivery
providers to sign in and stream media. To print each first-seen hostname while
testing locally:

```bash
AAHA_NETWORK_AUDIT=1 npm start
```

## Versioning

The initial public release was **v0.9**. The DRM-capable follow-up is
**v0.9.1**; the npm-compatible internal version is `0.9.1`.

## License

Wrapper code is licensed under the Apache License, Version 2.0. The license
does not grant rights to Apple's service, trademarks, logo, or media.
