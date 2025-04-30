#!/bin/bash

SCRIPT_DIR=$(dirname "$(realpath "$0")")

node --max-old-space-size=512 --heapsnapshot-near-heap-limit=10 "$SCRIPT_DIR/cli.mjs" "$@"

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  HEAPDUMP_FILES=$(find . -type f -name "*.heapsnapshot")

  # ensure .heapsnapshot files
  if [ -z "$HEAPDUMP_FILES" ]; then
    echo ".heapsnapshot NOT FOUND"
    exit $EXIT_CODE
  fi
  
  for HEAPDUMP_FILE in $HEAPDUMP_FILES; do
    echo "Uploading: $HEAPDUMP_FILE"
    node "$SCRIPT_DIR/upload.mjs" "$HEAPDUMP_FILE"
  done

  exit $EXIT_CODE
fi
