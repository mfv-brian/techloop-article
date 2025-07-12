#!/bin/bash

# Techloop Folder Image Resizer
# Resize all images in a folder so that the smaller dimension becomes 700px
# Reuses code from resize_images.sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESIZE_SCRIPT="$SCRIPT_DIR/resize_images.sh"

# Check if resize script exists
if [ ! -f "$RESIZE_SCRIPT" ]; then
    echo "Error: resize_images.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Make sure the script is executable
chmod +x "$RESIZE_SCRIPT"

# Function to check if file is an image
is_image_file() {
    local file="$1"
    local file_type=$(file "$file" 2>/dev/null)
    echo "$file_type" | grep -q -i "image\|webp\|jpeg\|png\|gif\|bmp\|tiff"
}

# Main script
if [ $# -eq 0 ]; then
    echo "Usage: $0 <folder_path>"
    echo "Example: $0 ~/Pictures"
    exit 1
fi

folder_path="$1"

# Check if folder exists
if [ ! -d "$folder_path" ]; then
    echo "Error: Folder not found: $folder_path"
    exit 1
fi

echo "=== Techloop Folder Image Resizer ==="
echo "Folder: $folder_path"
echo ""

# Count total files and image files
total_files=0
image_files=0
processed_files=0
skipped_files=0
error_files=0

# First pass: count files
echo "Scanning folder for images..."
for file in "$folder_path"/*; do
    if [ -f "$file" ]; then
        ((total_files++))
        if is_image_file "$file"; then
            ((image_files++))
        fi
    fi
done

echo "Found $total_files files, $image_files are images"
echo ""

# Second pass: process images
echo "Processing images..."
for file in "$folder_path"/*; do
    if [ -f "$file" ]; then
        if is_image_file "$file"; then
            echo "Processing: $(basename "$file")"
            if "$RESIZE_SCRIPT" "$file" > /dev/null 2>&1; then
                ((processed_files++))
                echo "✓ Successfully processed: $(basename "$file")"
            else
                ((error_files++))
                echo "✗ Error processing: $(basename "$file")"
            fi
            echo "---"
        else
            echo "Skipping: $(basename "$file") (not an image)"
            ((skipped_files++))
        fi
    fi
done

echo ""
echo "=== Summary ==="
echo "Total files: $total_files"
echo "Image files: $image_files"
echo "Processed: $processed_files"
echo "Skipped: $skipped_files"
echo "Errors: $error_files"
echo ""
echo "Folder resize operation completed!" 