const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const MIN_DIMENSION = 700; // Minimum dimension in pixels

// Get target directory from command line argument
const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node download_images.js <target_directory>');
  console.error('Example: node download_images.js articles/A-0002');
  process.exit(1);
}

const SAVE_DIR = path.join(__dirname, targetDir);
const IMAGES_FILE = path.join(SAVE_DIR, 'images.txt');

if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Function to get image dimensions
function getImageDimensions(imagePath) {
  return new Promise((resolve, reject) => {
    sharp(imagePath)
      .metadata()
      .then(metadata => {
        resolve({
          width: metadata.width,
          height: metadata.height
        });
      })
      .catch(reject);
  });
}

// Function to upscale image if needed
async function upscaleImageIfNeeded(imagePath) {
  try {
    const dimensions = await getImageDimensions(imagePath);
    const { width, height } = dimensions;
    
    // Check if image needs upscaling
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      console.log(`  ⚠️  Image too small (${width}x${height}), upscaling...`);
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth, newHeight;
      if (width < height) {
        newHeight = Math.max(MIN_DIMENSION, height);
        newWidth = Math.round((width * newHeight) / height);
      } else {
        newWidth = Math.max(MIN_DIMENSION, width);
        newHeight = Math.round((height * newWidth) / width);
      }
      
      // Ensure both dimensions are at least MIN_DIMENSION
      if (newWidth < MIN_DIMENSION) {
        newWidth = MIN_DIMENSION;
        newHeight = Math.round((height * newWidth) / width);
      }
      if (newHeight < MIN_DIMENSION) {
        newHeight = MIN_DIMENSION;
        newWidth = Math.round((width * newHeight) / height);
      }
      
      // Upscale the image
      await sharp(imagePath)
        .resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          fit: 'fill'
        })
        .toFile(imagePath + '.temp');
      
      // Replace original with upscaled version
      fs.unlinkSync(imagePath);
      fs.renameSync(imagePath + '.temp', imagePath);
      
      console.log(`  ✓ Upscaled to ${newWidth}x${newHeight}`);
    } else {
      console.log(`  ✓ Image size OK (${width}x${height})`);
    }
  } catch (error) {
    console.error(`  ✗ Error processing image dimensions: ${error.message}`);
  }
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    };
    
    mod.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function downloadAllImages() {
  try {
    if (!fs.existsSync(IMAGES_FILE)) {
      console.error('File images.txt không tồn tại!');
      return;
    }

    const imageUrls = fs.readFileSync(IMAGES_FILE, 'utf8').split('\n').filter(url => url.trim());
    console.log(`Bắt đầu tải ${imageUrls.length} ảnh...`);

    let downloadedCount = 0;

    for (let i = 0; i < imageUrls.length; i++) {
      const imgUrl = imageUrls[i].trim();
      if (!imgUrl) continue;

      try {
        // Lấy tên file từ URL
        const urlParts = new URL(imgUrl);
        const pathParts = urlParts.pathname.split('/');
        let fileName = pathParts[pathParts.length - 1];
        
        // Nếu không có extension, thêm .jpg
        if (!fileName.includes('.')) {
          fileName = `image_${i + 1}.jpg`;
        }
        
        // Nếu tên file trống hoặc không hợp lệ
        if (!fileName || fileName.length < 3) {
          fileName = `image_${i + 1}.jpg`;
        }

        const dest = path.join(SAVE_DIR, fileName);
        
        console.log(`[${i + 1}/${imageUrls.length}] Đang tải: ${imgUrl}`);
        await downloadImage(imgUrl, dest);
        console.log(`✓ Đã tải: ${fileName}`);
        
        // Check dimensions and upscale if needed
        await upscaleImageIfNeeded(dest);
        
        downloadedCount++;
        
        // Delay nhỏ để tránh spam server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`✗ Lỗi tải ${imgUrl}: ${err.message}`);
      }
    }
    
    console.log(`\nHoàn thành tải ảnh!`);
    console.log(`- Đã tải: ${downloadedCount} ảnh`);
    
    // Xóa file images.txt sau khi hoàn thành
    // if (fs.existsSync(IMAGES_FILE)) {
    //   fs.unlinkSync(IMAGES_FILE);
    //   console.log(`- Đã xóa file images.txt`);
    // }
    console.log(`- Đã giữ lại file images.txt theo yêu cầu`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

downloadAllImages(); 