# Contributing

Contributions should stay focused on the Linux Electron wrapper, Fedora/KDE
integration, privacy controls, packaging, and documentation. Do not submit
Apple code, copied site assets other than the identifying icon, credentials,
cookies, media, or other account data.

Before submitting a change:

```bash
npm ci
npm run check
npm run dist
```

Verify both the native Wayland window identity and, when relevant, the
`AAHA_FORCE_X11=1` fallback on KDE Plasma.
