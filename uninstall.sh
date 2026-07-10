#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="apple-music-aaha"
DESKTOP_NAME="com.adamandhisagents.applemusic"
ICON_NAME="apple-music-aaha"

rm -rf "$HOME/MyApps/$REPO_NAME"
rm -f "$HOME/.local/share/applications/$DESKTOP_NAME.desktop"

for size in 16 24 32 48 64 96 128 256 512; do
  rm -f "$HOME/.local/share/icons/hicolor/${size}x${size}/apps/$ICON_NAME.png"
done

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
kbuildsycoca6 2>/dev/null || true

echo ">> Removed Apple Music (AAHA)."
