#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo ">> Installing locked dependencies..."
npm ci

echo ">> Checking JavaScript syntax..."
npm run check

echo ">> Running regression tests..."
npm test

echo ">> Building unpacked app and AppImage for Linux..."
# Start from an empty dist/ so stale AppImages from older builds are never
# checksummed, installed, or uploaded alongside the new one.
rm -rf dist
npm run dist

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage')
if [[ ${#appimages[@]} -ne 1 ]]; then
  echo "ERROR: expected exactly one AppImage in dist/, found ${#appimages[@]}." >&2
  exit 1
fi

echo ">> Writing release checksums..."
(
  cd dist
  sha256sum apple-music-aaha-v0.9.4-*.AppImage > SHA256SUMS
)

echo
echo ">> Apple Music (AAHA) v0.9.4 built successfully."
echo "   Unpacked app: ./dist/linux-unpacked/"
echo "   AppImage:     ./dist/apple-music-aaha-v0.9.4-*.AppImage"
echo "   Checksums:    ./dist/SHA256SUMS"
