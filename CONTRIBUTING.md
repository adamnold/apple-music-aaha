# Contributing

Contributions should stay focused on the Linux Electron wrapper, Fedora/KDE
integration, privacy controls, packaging, and documentation. Do not submit
Apple code, copied site assets other than the identifying icon, credentials,
cookies, media, or other account data.

Before submitting a change:

```bash
npm ci
npm run check
npm test
npm run dist
```

Verify both the native Wayland window identity and, when relevant, the
`AAHA_FORCE_X11=1` fallback on KDE Plasma.

Changes affecting Electron switches, request filtering, permissions, Widevine,
updates, installation, or local profile storage must also update the relevant
README, changelog, and privacy disclosures. Do not describe the wrapper as
Google-free, telemetry-proof, or independently capable of auditing proprietary
Widevine behavior.
