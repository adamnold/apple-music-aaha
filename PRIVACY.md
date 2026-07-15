# Privacy and network behavior

## Plain-language summary

Apple Music (AAHA) is not a Google-free browser. It wraps Apple's web player in
Castlabs Electron, which is based on Chromium. Full-track playback also requires
Google's proprietary Widevine Content Decryption Module (CDM). The wrapper
reduces unnecessary Chromium and Google traffic, but it cannot make Chromium or
Widevine independent of Google and cannot independently audit Widevine's closed
source binary.

No AAHA analytics or telemetry service is added by this wrapper.

## What the app must contact

### Apple and its delivery providers

The wrapped `music.apple.com` website must contact Apple and Apple's service or
content-delivery hosts for sign-in, account state, catalog metadata, artwork,
licenses, and audio streaming. Those requests remain governed by Apple's terms
and privacy policy. This project cannot make Apple Music function without them.

### Google Widevine

Apple serves previews when the browser cannot decrypt protected catalog audio.
If the user chooses **Enable Full Playback**, Castlabs Electron downloads the
Widevine CDM from Google's component service. On Linux, the app then closes once
and asks the user to reopen it so the sandbox can load the new component.

After a successful installation or maintenance check, the Castlabs component
updater is disabled persistently. The app enables it again no more than once
every 30 days for a consented maintenance check, when the saved CDM state shows
that a repair is required, or when the user explicitly launches with
`AAHA_WIDEVINE_UPDATE=1`.

Choosing **Use Previews Only** does not install Widevine and keeps its component
updater disabled. Protected catalog playback will remain limited to previews.

## Safeguards in the wrapper

- Chromium background networking is disabled between scheduled Widevine
  maintenance launches.
- Domain-reliability reporting, network-time queries, Translate, Optimization
  Hints, Media Router, and Breakpad are disabled.
- Chromium Secure DNS is disabled so Fedora's configured system resolver is
  used.
- Common Google advertising, analytics, YouTube, and tracking/resource domains
  are blocked for subresources loaded by the Apple Music website.
- Renderer sandboxing, context isolation, and web security remain enabled;
  Node.js integration is disabled.
- Remote permissions are denied except protected-media access requested by an
  approved Apple origin.
- External web and mail links open outside the wrapper; unknown URL schemes are
  denied.

## Important limitations

- A hostname blocklist reduces known traffic; it is not proof that every
  possible Google endpoint is blocked forever.
- Widevine is proprietary. This repository neither redistributes nor audits its
  binary, and Google may change its service behavior independently.
- Electron inherits Chromium's architecture, upstream dependencies, security
  issues, and some implementation choices even when optional services are
  disabled.
- Apple's website can change its hosts, scripts, authentication, DRM, and data
  practices without a wrapper release.
- Neither this document nor the wrapper promises zero network traffic, complete
  anonymity, or protection from Apple or Google when their required services
  are deliberately enabled.

## Local account and profile data

Electron stores the Apple Music website profile under:

```text
~/.config/Apple Music
```

That directory can contain cookies, login/session data, local storage, caches,
preferences, Widevine state, and downloaded component data. A normal uninstall
preserves it so reinstalling does not unexpectedly sign the user out.

To remove the app and that entire profile explicitly:

```bash
./uninstall.sh --purge
```

`--purge` is destructive: it signs the local wrapper out and removes its saved
website and Widevine data. It does not delete the user's Apple account or cloud
library.

## Auditing network hosts

To print each first-seen hostname while running the installed app:

```bash
AAHA_NETWORK_AUDIT=1 ~/.local/opt/aaha/apple-music-aaha/app/apple-music-aaha
```

This is a diagnostic inventory, not a packet capture. Review the output before
deciding whether the wrapper meets a particular threat model.
