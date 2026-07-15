# Apple Music (AAHA) v0.9.3

An unofficial Apple Music desktop wrapper for Fedora KDE, built by
**Adam And His Agents (AAHA)**. It opens Apple's official web player in a
dedicated Electron window with a stable, transparent taskbar icon.

Apple publishes `music.apple.com` as a standalone-capable PWA. This project
packages that web experience as an AppImage and an unpacked personal install;
it does not redistribute Apple Music application code or media.

> Not affiliated with Apple Inc. Apple, Apple Music, and the Apple Music logo
> are trademarks of Apple Inc. See `NOTICE`.

> **Privacy notice — Electron and Google dependency:** This wrapper uses
> Castlabs Electron, which is based on Chromium. Full-track playback requires
> Google's proprietary Widevine CDM and a consented download from Google's
> component service. The wrapper disables several Chromium background services
> and blocks common Google tracking/resource domains, but it cannot make
> Chromium or Widevine completely Google-free or independently auditable.
> Choosing preview-only mode avoids installing Widevine. Read
> [PRIVACY.md](PRIVACY.md) before installing if this distinction matters to you.

Project documentation: [Changelog](CHANGELOG.md) · [Privacy](PRIVACY.md) ·
[Contributing](CONTRIBUTING.md)

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
- `dist/apple-music-aaha-v0.9.3-x86_64.AppImage`
- `dist/SHA256SUMS`

The AppImage can run directly from any location and does not create an
installation directory. The optional `install.sh` integration copies the
unpacked runtime to `~/.local/opt/aaha/apple-music-aaha/app/` by default,
stores the AppImage beside it, installs the transparent icon at standard Linux
sizes, and creates a KDE launcher whose desktop name and window identity match
exactly. Use `./install.sh --install-root /absolute/path/apple-music-aaha` for
an explicit per-application destination. Fedora prompts once through `sudo` so
the root-owned Chromium sandbox helper can be installed with mode `4755`;
updates preserve a byte-identical secure helper and avoid another prompt.

To remove the application while preserving its saved website profile, run
`./uninstall.sh`. To also delete the local login/session data, caches, Widevine
state, and downloaded component data, run `./uninstall.sh --purge`. Purging does
not delete the user's Apple account or cloud library.

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
downloaded dynamically from Google's component service. Linux then displays a
one-time message and closes cleanly; reopen Apple Music from the application
launcher so the sandbox can load the newly installed CDM. The app never
automatically relaunches itself.

The component updater is disabled after a successful installation using ECS's
persistent `components.updatesEnabled` control, and is enabled no more than
once every 30 days for a maintenance check. Chromium's unrelated background
services remain disabled between those checks. The Apple Music webpage remains
subject to the Google-domain subresource blocklist throughout playback.

If an installed CDM cannot be loaded, Apple Music remains open in preview mode,
records one repair check for the next manual launch, and does not enter a
restart loop.

### KDE notifications after upgrading from v0.9.1

KDE DrKonqi may replay queued crash notifications from v0.9.1 after a reboot,
even after v0.9.2 is installed. Check the timestamp in the crash report: the
known v0.9.1 failures predate the v0.9.2 installation. A newly timestamped
`apple-music-aaha` core dump created while running v0.9.2 is a new incident and
should be reported with its journal and `coredumpctl` details.

The expected first-install Widevine notice is an in-app dialog asking for one
manual close and reopen. Routine launches and 30-day maintenance checks should
not create KDE crash notifications.

To request an immediate CDM repair or maintenance check:

```bash
AAHA_WIDEVINE_UPDATE=1 ~/.local/opt/aaha/apple-music-aaha/app/apple-music-aaha
```

Widevine cannot legally be redistributed inside the AppImage, so the initial
download is required for full tracks. Choosing **Use Previews Only** keeps the
CDM updater disabled.

See [PRIVACY.md](PRIVACY.md) for the required connections, local data retained
by Electron, implemented safeguards, and limitations of the threat model.

The wrapped website must still contact Apple and Apple's content-delivery
providers to sign in and stream media. To print each first-seen hostname while
testing locally:

```bash
AAHA_NETWORK_AUDIT=1 npm start
```

## Versioning

The initial public release was **v0.9**. Version **v0.9.1** introduced protected
playback but contained a Linux relaunch loop and is superseded. Version
**v0.9.2** fixed the Linux Widevine restart loop. Version **v0.9.3** adds the
standard per-user installation root, explicit custom-root support, and guarded
uninstall receipts without changing playback behavior.

## License

Wrapper code is licensed under the Apache License, Version 2.0. The license
does not grant rights to Apple's service, trademarks, logo, or media.
