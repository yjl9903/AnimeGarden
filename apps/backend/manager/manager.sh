#!/bin/bash

SCRIPT_DIR=$(dirname "$(realpath "$0")")

node --max-old-space-size=256 --heap-prof --heapsnapshot-near-heap-limit=10 "$SCRIPT_DIR/cli.mjs" "$@"

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  HEAPDUMP_FILES=$(find . -type f -name "*.heapsnapshot")
  for HEAPDUMP_FILE in $HEAPDUMP_FILES; do
    node "$SCRIPT_DIR/upload.mjs" "$HEAPDUMP_FILE" || true
  done

  HEAPDUMP_FILES=$(find . -type f -name "*.heapprofile")
  for HEAPDUMP_FILE in $HEAPDUMP_FILES; do
    node "$SCRIPT_DIR/upload.mjs" "$HEAPDUMP_FILE" || true
  done

  exit $EXIT_CODE
fi
