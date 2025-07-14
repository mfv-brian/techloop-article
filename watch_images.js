const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEMP_FOLDER = './temp';
const MIN_DIMENSION = 700;

// Function to resize an image
async function resizeImage(imagePath) {
    try {
        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        // Check if image needs resizing (any dimension smaller than MIN_DIMENSION)
        if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
            console.log(`Resizing ${path.basename(imagePath)} (${metadata.width}x${metadata.height})`);
            
            // Calculate new dimensions while maintaining aspect ratio
            let newWidth = metadata.width;
            let newHeight = metadata.height;
            
            if (metadata.width < MIN_DIMENSION && metadata.height < MIN_DIMENSION) {
                // Both dimensions are small, scale up the smaller one to MIN_DIMENSION
                if (metadata.width < metadata.height) {
                    newWidth = MIN_DIMENSION;
                    newHeight = Math.round((MIN_DIMENSION * metadata.height) / metadata.width);
                } else {
                    newHeight = MIN_DIMENSION;
                    newWidth = Math.round((MIN_DIMENSION * metadata.width) / metadata.height);
                }
            } else if (metadata.width < MIN_DIMENSION) {
                // Only width is small
                newWidth = MIN_DIMENSION;
                newHeight = Math.round((MIN_DIMENSION * metadata.height) / metadata.width);
            } else {
                // Only height is small
                newHeight = MIN_DIMENSION;
                newWidth = Math.round((MIN_DIMENSION * metadata.width) / metadata.height);
            }
            
            // Create a temporary file path
            const tempPath = imagePath + '.tmp';
            
            // Resize the image to temporary file
            await image
                .resize(newWidth, newHeight, {
                    fit: 'fill',
                    withoutEnlargement: false
                })
                .toFile(tempPath);
            
            // Replace original file with resized version
            fs.unlinkSync(imagePath);
            fs.renameSync(tempPath, imagePath);
                
            console.log(`✓ Resized to ${newWidth}x${newHeight}`);
        } else {
            console.log(`✓ ${path.basename(imagePath)} already has sufficient dimensions (${metadata.width}x${metadata.height})`);
        }
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error.message);
    }
}

// Function to process all images in the temp folder
async function processImages() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Checking for images to resize...`);
    
    if (!fs.existsSync(TEMP_FOLDER)) {
        console.log(`Temp folder '${TEMP_FOLDER}' does not exist. Creating...`);
        fs.mkdirSync(TEMP_FOLDER, { recursive: true });
        return;
    }
    
    const files = fs.readdirSync(TEMP_FOLDER);
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    });
    
    if (imageFiles.length === 0) {
        console.log('No image files found in temp folder.');
        return;
    }
    
    console.log(`Found ${imageFiles.length} image file(s)`);
    
    for (const file of imageFiles) {
        const imagePath = path.join(TEMP_FOLDER, file);
        await resizeImage(imagePath);
    }
}

// Main function
function startWatching() {
    console.log('🚀 Starting image resize watcher...');
    console.log(`📁 Watching folder: ${TEMP_FOLDER}`);
    console.log(`📏 Minimum dimension: ${MIN_DIMENSION}px`);
    console.log(`⏰ Running every 30 seconds`);
    console.log('Press Ctrl+C to stop\n');
    
    // Run immediately on start
    processImages();
    
    // Then run every 30 seconds
    const interval = setInterval(processImages, 30000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping image resize watcher...');
        clearInterval(interval);
        process.exit(0);
    });
}

// Start the watcher
startWatching(); 