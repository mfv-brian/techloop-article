#!/bin/bash

# Monitor Crontab Auto Resize Job
# Shows status and logs of the crontab auto resize job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESIZE_SCRIPT="$SCRIPT_DIR/resize_folder.sh"
TARGET_FOLDER="/Users/to.hoang.long/Downloads/temp"
CRON_LOG="/tmp/techloop-crontab-resize.log"

echo "=== Crontab Auto Resize Job Monitor ==="
echo ""

# Check if crontab entry exists
if crontab -l 2>/dev/null | grep -q "$RESIZE_SCRIPT"; then
    echo "✅ Crontab entry exists"
    echo "Entry: $(crontab -l 2>/dev/null | grep "$RESIZE_SCRIPT")"
else
    echo "❌ Crontab entry not found"
fi

echo ""

# Show recent logs
if [ -f "$CRON_LOG" ]; then
    echo "=== Recent Logs ==="
    tail -20 "$CRON_LOG"
else
    echo "No log file found yet"
fi

echo ""

# Show crontab status
echo "=== Crontab Status ==="
echo "Current crontab entries:"
crontab -l 2>/dev/null || echo "No crontab entries found"

echo ""

# Show target folder info
echo "=== Target Folder Info ==="
if [ -d "$TARGET_FOLDER" ]; then
    echo "Target folder: $TARGET_FOLDER"
    echo "Files in folder: $(ls -1 "$TARGET_FOLDER" 2>/dev/null | wc -l | tr -d ' ')"
    echo "Image files: $(find "$TARGET_FOLDER" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.bmp" -o -iname "*.tiff" \) 2>/dev/null | wc -l | tr -d ' ')"
else
    echo "Target folder does not exist: $TARGET_FOLDER"
fi
