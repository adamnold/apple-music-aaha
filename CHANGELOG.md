# Changelog

All notable changes to Apple Music (AAHA) are recorded here. Release versions
follow the Git tags published in this repository.

## [0.9.2] - 2026-07-10

### Fixed

- Removed the Chromium-wide component-updater switch that prevented Castlabs
  Electron from registering an already-installed Widevine CDM.
- Replaced the automatic Electron relaunch path that generated Linux zygote
  `SIGTRAP` core dumps with one clear, graceful close-and-reopen message.
- Prevented Widevine repair failures from entering a restart cycle; the app now
  stays usable in preview mode and schedules one repair check for the next
  manual launch.

### Added

- Added regression coverage for Widevine state transitions, repair scheduling,
  and the absence of automatic relaunch code.
- Added disposable-profile tests for normal uninstall, `--purge`, and invalid
  uninstall arguments.
- Added a prominent README privacy notice and detailed `PRIVACY.md` disclosure.
- Added troubleshooting guidance for historical KDE DrKonqi notifications left
  behind by v0.9.1.

### Changed

- Widevine updates remain disabled through Castlabs ECS's persistent component
  setting after a successful check. Consented maintenance checks occur no more
  than once every 30 days unless a repair is explicitly requested.
- Linux upgrades preserve a byte-identical, root-owned Chromium sandbox helper
  instead of requesting administrator authorization again.
- `./uninstall.sh` now preserves the local Apple Music profile by default and
  accepts `--purge` to remove it explicitly.

## [0.9.1] - 2026-07-09

> Superseded by v0.9.2. This version can enter a Linux Widevine relaunch cycle
> and should no longer be installed.

### Added

- Added full-track playback using Castlabs Electron for Content Security and a
  consent-gated Google Widevine CDM download.
- Added a 30-day Widevine maintenance interval, preview-only mode, Google
  subresource blocking, and local network-audit logging.

### Known issue

- Combining Chromium's global component-updater disable switch with the ECS
  component API made the installed CDM appear unavailable. Automatic relaunches
  then produced multiple KDE crash notifications per launch on Linux.

## [0.9] - 2026-07-09

### Added

- Initial Fedora KDE Electron wrapper for the Apple Music web player.
- Added the transparent desktop/taskbar icon, stable Wayland/X11 identity,
  AppImage and unpacked builds, installer, uninstaller, and privacy baseline.

[0.9.2]: https://github.com/adamnold/apple-music-aaha/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/adamnold/apple-music-aaha/compare/v0.9...v0.9.1
[0.9]: https://github.com/adamnold/apple-music-aaha/releases/tag/v0.9
