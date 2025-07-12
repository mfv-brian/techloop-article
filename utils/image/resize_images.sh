#!/bin/bash

# Techloop Image Resizer
# Resize images so that the smaller dimension becomes 700px while maintaining aspect ratio
# Overwrites the original file

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "ImageMagick is required but not installed."
    echo "Please install it using: brew install imagemagick"
    exit 1
fi

# Function to resize image
resize_image() {
    local input_file="$1"
    
    # Get original dimensions using magick identify
    local dimensions=$(magick identify -format "%wx%h" "$input_file" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo "Error: Could not read image dimensions for $input_file"
        echo "Trying alternative method..."
        # Try alternative method for problematic formats
        dimensions=$(magick "$input_file" -ping -format "%wx%h" info: 2>/dev/null)
        if [ $? -ne 0 ]; then
            echo "Error: Failed to read image dimensions for $input_file"
            return 1
        fi
    fi
    
    local width=$(echo $dimensions | cut -d'x' -f1)
    local height=$(echo $dimensions | cut -d'x' -f2)
    
    echo "Original size: ${width}x${height}"
    
    # Check if resizing is needed (if smaller dimension is already 700px or larger)
    if [ $width -ge 700 ] && [ $height -ge 700 ]; then
        echo "Image already has smaller dimension >= 700px, no resizing needed."
        return 0
    fi
    
    # Create temporary file for resizing
    local temp_file=$(mktemp)
    
    # Resize so that the smaller dimension becomes 700px
    # Use 700x700^ to make the smaller dimension exactly 700px
    magick "$input_file" -resize "700x700^" "$temp_file"
    
    if [ $? -eq 0 ]; then
        # Move temporary file to overwrite original
        mv "$temp_file" "$input_file"
        
        local new_dimensions=$(magick identify -format "%wx%h" "$input_file" 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "Resized to: $new_dimensions"
        else
            echo "Resized successfully"
        fi
        echo "Updated: $input_file"
    else
        echo "Error: Failed to resize image"
        rm -f "$temp_file"
        return 1
    fi
}

# Main script
if [ $# -eq 0 ]; then
    echo "Usage: $0 <image_file> [image_file2] ..."
    exit 1
fi

# Process each file
for file in "$@"; do
    if [ ! -f "$file" ]; then
        echo "Error: File not found: $file"
        continue
    fi
    
    # Check if file is an image (more comprehensive check)
    file_type=$(file "$file" 2>/dev/null)
    if ! echo "$file_type" | grep -q -i "image\|webp\|jpeg\|png\|gif\|bmp\|tiff"; then
        echo "Error: Not a recognized image file: $file"
        echo "File type: $file_type"
        continue
    fi
    
    echo "Processing: $file"
    
    # Resize the image (overwrites original)
    resize_image "$file"
    
    echo "---"
done

echo "Resize operation completed!" 