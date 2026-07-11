#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="apple-music-aaha"
DESKTOP_NAME="com.adamandhisagents.applemusic"
ICON_NAME="apple-music-aaha"
USER_DATA_DIR="$HOME/.config/Apple Music"
PURGE_PROFILE=0

usage() {
  cat <<EOF
Usage: ./uninstall.sh [--purge]

  no option  Remove the app but preserve the Apple Music profile.
  --purge    Also remove local login/session data, caches, and Widevine data.
EOF
}

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 2
fi

if [[ $# -eq 1 ]]; then
  if [[ "$1" != "--purge" ]]; then
    usage >&2
    exit 2
  fi
  PURGE_PROFILE=1
fi

rm -rf "$HOME/MyApps/$REPO_NAME"
rm -f "$HOME/.local/share/applications/$DESKTOP_NAME.desktop"

for size in 16 24 32 48 64 96 128 256 512; do
  rm -f "$HOME/.local/share/icons/hicolor/${size}x${size}/apps/$ICON_NAME.png"
done

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
kbuildsycoca6 2>/dev/null || true

if [[ "$PURGE_PROFILE" == "1" ]]; then
  echo ">> Purging the local Apple Music profile, login/session data, caches, and Widevine data..."
  rm -rf "$USER_DATA_DIR"
  echo ">> Removed Apple Music (AAHA) and its local profile."
else
  echo ">> Removed Apple Music (AAHA)."
  echo ">> Preserved local profile: $USER_DATA_DIR"
  echo ">> Run ./uninstall.sh --purge to remove that profile explicitly."
fi
