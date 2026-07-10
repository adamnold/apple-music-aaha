# Apple Music (AAHA) v0.9

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
- `dist/apple-music-aaha-v0.9-x86_64.AppImage`
- `dist/SHA256SUMS`

`install.sh` copies the unpacked runtime to
`~/MyApps/apple-music-aaha/app/`, stores the AppImage beside it, installs the
transparent icon at standard Linux sizes, and creates a KDE launcher whose
desktop name and window identity match exactly.

To remove the personal installation, run `./uninstall.sh`.

## Wayland and taskbar identity

The default is current Electron running natively on Wayland. The package uses
the same reverse-DNS identity for Electron's `desktopName`, Wayland app ID,
X11 `WM_CLASS`, the generated desktop entry, and `StartupWMClass`.

Chromium 150 may print a Vulkan/Wayland capability message during startup on
Fedora 44. The tested graphics report confirms that the actual display path is
hardware-accelerated ANGLE/OpenGL, with GPU compositing and video decoding
enabled; the message is not a renderer failure.

If a future KDE or graphics regression affects the native Wayland build, run
with the current Electron through XWayland instead:

```bash
AAHA_FORCE_X11=1 ./dist/linux-unpacked/apple-music-aaha
```

This fallback does not require downgrading Electron.

## Privacy and security baseline

- Chromium background networking, component updates, domain-reliability
  reporting, translate, optimization hints, network-time queries, Media Router,
  and Breakpad are disabled.
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

The wrapped website must still contact Apple and Apple's content-delivery
providers to sign in and stream media. To print each first-seen hostname while
testing locally:

```bash
AAHA_NETWORK_AUDIT=1 npm start
```

## Versioning

The initial development cycle and first public release use the user-facing
version **v0.9**. The npm-compatible internal version is `0.9.0`.

## License

Wrapper code is licensed under the Apache License, Version 2.0. The license
does not grant rights to Apple's service, trademarks, logo, or media.
