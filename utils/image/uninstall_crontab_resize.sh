#!/bin/bash

# Uninstall Crontab Auto Resize Job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESIZE_SCRIPT="$SCRIPT_DIR/resize_folder.sh"
CRON_LOG="/tmp/techloop-crontab-resize.log"

echo "=== Uninstalling Crontab Auto Resize Job ==="
echo ""

# Remove crontab entry
if crontab -l 2>/dev/null | grep -q "$RESIZE_SCRIPT"; then
    echo "Removing crontab entry..."
    crontab -l 2>/dev/null | grep -v "$RESIZE_SCRIPT" | crontab -
    echo "✅ Crontab entry removed"
else
    echo "No crontab entry found to remove"
fi

# Remove log file
if [ -f "$CRON_LOG" ]; then
    echo "Removing log file..."
    rm -f "$CRON_LOG"
fi

echo "✅ Crontab auto resize job uninstalled successfully!"
