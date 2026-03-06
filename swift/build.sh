#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building clipboard-bridge..."
swift build -c release 2>&1

BUILD_DIR=".build/release"
BINARY="$BUILD_DIR/clipboard-bridge"

if [ ! -f "$BINARY" ]; then
  echo "ERROR: Build failed — binary not found at $BINARY"
  exit 1
fi

# Copy to project root bin location for easy access
DEST="$SCRIPT_DIR/../bin/clipboard-bridge"
cp "$BINARY" "$DEST"
chmod +x "$DEST"

echo "Built successfully: $DEST"
echo "Size: $(du -h "$DEST" | cut -f1)"
