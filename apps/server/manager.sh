#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$(realpath "$0")")

# node --max-old-space-size=128 --heap-prof --heapsnapshot-near-heap-limit=10 "$SCRIPT_DIR/cli.mjs" "$@"
node "$SCRIPT_DIR/cli.mjs" "$@"

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo 'Start uploading heap dump files'

  HEAPDUMP_FILES=$(find . -type f -name "*.heapprofile")
  for HEAPDUMP_FILE in $HEAPDUMP_FILES; do
    echo "Uploading $HEAPDUMP_FILE"
    node "$SCRIPT_DIR/upload.mjs" "$HEAPDUMP_FILE" || true
  done

  HEAPDUMP_FILES=$(find . -type f -name "*.heapsnapshot")
  for HEAPDUMP_FILE in $HEAPDUMP_FILES; do
    echo "Uploading $HEAPDUMP_FILE"
    node "$SCRIPT_DIR/upload.mjs" "$HEAPDUMP_FILE" || true
  done

  echo 'Finish uploading heap dump files'

  exit $EXIT_CODE
fi
