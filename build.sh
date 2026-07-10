#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo ">> Installing locked dependencies..."
npm ci

echo ">> Checking JavaScript syntax..."
npm run check

echo ">> Building unpacked app and AppImage for Linux..."
npm run dist

echo ">> Writing release checksums..."
(
  cd dist
  sha256sum apple-music-aaha-v0.9-*.AppImage > SHA256SUMS
)

echo
echo ">> Apple Music (AAHA) v0.9 built successfully."
echo "   Unpacked app: ./dist/linux-unpacked/"
echo "   AppImage:     ./dist/apple-music-aaha-v0.9-*.AppImage"
echo "   Checksums:    ./dist/SHA256SUMS"
