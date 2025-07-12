#!/bin/bash

# Setup Crontab Auto Resize Job for macOS
# Creates a crontab entry that runs every minute to resize images in /Users/to.hoang.long/Downloads/temp

# Configuration
TARGET_FOLDER="/Users/to.hoang.long/Downloads/temp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESIZE_SCRIPT="$SCRIPT_DIR/resize_folder.sh"
CRON_LOG="/tmp/techloop-crontab-resize.log"

echo "=== Setting up Crontab Auto Resize Job ==="
echo "Target folder: $TARGET_FOLDER"
echo "Resize script: $RESIZE_SCRIPT"
echo ""

# Check if target folder exists
if [ ! -d "$TARGET_FOLDER" ]; then
    echo "Creating target folder: $TARGET_FOLDER"
    mkdir -p "$TARGET_FOLDER"
fi

# Check if resize script exists
if [ ! -f "$RESIZE_SCRIPT" ]; then
    echo "Error: resize_folder.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Make sure the script is executable
chmod +x "$RESIZE_SCRIPT"

# Create the crontab entry
CRON_ENTRY="* * * * * $RESIZE_SCRIPT $TARGET_FOLDER >> $CRON_LOG 2>&1"

echo "Creating crontab entry..."
echo "Cron entry: $CRON_ENTRY"
echo ""

# Check if crontab entry already exists
if crontab -l 2>/dev/null | grep -q "$RESIZE_SCRIPT"; then
    echo "⚠️  Crontab entry already exists. Removing old entry..."
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "$RESIZE_SCRIPT" | crontab -
fi

# Add new crontab entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Crontab entry added successfully!"
else
    echo "❌ Failed to add crontab entry"
    exit 1
fi

# Create a simple monitoring script
MONITOR_SCRIPT="$SCRIPT_DIR/monitor_crontab_resize.sh"
cat > "$MONITOR_SCRIPT" << 'EOF'
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
EOF

chmod +x "$MONITOR_SCRIPT"

# Create uninstall script
UNINSTALL_SCRIPT="$SCRIPT_DIR/uninstall_crontab_resize.sh"
cat > "$UNINSTALL_SCRIPT" << 'EOF'
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
EOF

chmod +x "$UNINSTALL_SCRIPT"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "✅ Crontab auto resize job has been installed"
echo "✅ Job will run every minute (* * * * *)"
echo "✅ Target folder: $TARGET_FOLDER"
echo "✅ Log file: $CRON_LOG"
echo ""
echo "=== Useful Commands ==="
echo ""
echo "Monitor job status:"
echo "  ./utils/image/monitor_crontab_resize.sh"
echo ""
echo "Check job logs:"
echo "  tail -f $CRON_LOG"
echo ""
echo "View crontab:"
echo "  crontab -l"
echo ""
echo "Uninstall job:"
echo "  ./utils/image/uninstall_crontab_resize.sh"
echo ""
echo "Manual resize:"
echo "  ./utils/image/resize_folder.sh $TARGET_FOLDER"
echo ""
echo "The crontab job will automatically resize any images placed in $TARGET_FOLDER" 