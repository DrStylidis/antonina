#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "Building Antonina..."
npm run build:mac
echo "Installing to /Applications..."
cp -R dist/mac-arm64/Antonina.app /Applications/
xattr -cr /Applications/Antonina.app
echo "Done! Restart Antonina from the Dock."
