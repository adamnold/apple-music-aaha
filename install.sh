#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="Apple Music"
REPO_NAME="apple-music-aaha"
EXECUTABLE="apple-music-aaha"
DESKTOP_NAME="com.adamandhisagents.applemusic"
WM_CLASS="com.adamandhisagents.applemusic"
ICON_NAME="apple-music-aaha"
INSTALL_ROOT="$HOME/MyApps/$REPO_NAME"
APP_DEST="$INSTALL_ROOT/app"
STAGE_DEST="$INSTALL_ROOT/.app-new-$$"
BUILT_APP="$PWD/dist/linux-unpacked"

if [[ ! -x "$BUILT_APP/$EXECUTABLE" ]]; then
  echo "ERROR: Built executable not found. Run ./build.sh first."
  exit 1
fi

mkdir -p "$INSTALL_ROOT"
rm -rf "$STAGE_DEST"
cp -a "$BUILT_APP" "$STAGE_DEST"
rm -rf "$APP_DEST"
mv "$STAGE_DEST" "$APP_DEST"

for size in 16 24 32 48 64 96 128 256 512; do
  icon_dir="$HOME/.local/share/icons/hicolor/${size}x${size}/apps"
  mkdir -p "$icon_dir"
  cp "build/icons/${size}x${size}.png" "$icon_dir/$ICON_NAME.png"
done

apps_dir="$HOME/.local/share/applications"
mkdir -p "$apps_dir"
desktop_file="$apps_dir/$DESKTOP_NAME.desktop"

cat > "$desktop_file" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=Apple Music web player
Exec="$APP_DEST/$EXECUTABLE"
Icon=$ICON_NAME
Terminal=false
Categories=AudioVideo;Audio;Player;
Keywords=music;audio;streaming;apple;
StartupWMClass=$WM_CLASS
StartupNotify=true
X-KDE-StartupNotify=true
EOF

cp dist/apple-music-aaha-v0.9-*.AppImage "$INSTALL_ROOT/"
cp dist/SHA256SUMS "$INSTALL_ROOT/"

update-desktop-database "$apps_dir" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
kbuildsycoca6 2>/dev/null || true

echo ">> Installed $APP_NAME v0.9 under $INSTALL_ROOT"
echo ">> Desktop launcher: $desktop_file"
