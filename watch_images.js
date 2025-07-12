const chokidar = require('chokidar');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Cấu hình
const WATCH_DIR = path.join(__dirname, 'temp');
const MIN_DIMENSION = 700;
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

console.log('👀 Khởi động Image Watcher...');
console.log(`📁 Thư mục theo dõi: ${WATCH_DIR}`);
console.log(`📏 Kích thước tối thiểu: ${MIN_DIMENSION}px`);
console.log('💡 Nhấn Ctrl+C để dừng');

// Hàm kiểm tra và resize ảnh
async function processImage(imagePath) {
    try {
        // Kiểm tra xem file có phải là ảnh không
        const ext = path.extname(imagePath).toLowerCase();
        if (!SUPPORTED_FORMATS.includes(ext)) {
            console.log(`⏭️  Bỏ qua: ${path.basename(imagePath)} (không phải ảnh)`);
            return;
        }

        console.log(`🔍 Đang xử lý: ${path.basename(imagePath)}`);

        // Lấy thông tin ảnh
        const metadata = await sharp(imagePath).metadata();
        const { width, height } = metadata;

        console.log(`📏 Kích thước hiện tại: ${width}x${height}`);

        // Kiểm tra xem có cần resize không
        if (width >= MIN_DIMENSION && height >= MIN_DIMENSION) {
            console.log(`✅ ${path.basename(imagePath)} đã đủ kích thước`);
            return;
        }

        // Tính toán kích thước mới giữ nguyên ratio
        let newWidth, newHeight;
        if (width < height) {
            // Ảnh dọc
            newHeight = Math.max(MIN_DIMENSION, height);
            newWidth = Math.round((width * newHeight) / height);
        } else {
            // Ảnh ngang
            newWidth = Math.max(MIN_DIMENSION, width);
            newHeight = Math.round((height * newWidth) / width);
        }

        // Đảm bảo cả hai chiều đều >= MIN_DIMENSION
        if (newWidth < MIN_DIMENSION) {
            newWidth = MIN_DIMENSION;
            newHeight = Math.round((height * newWidth) / width);
        }
        if (newHeight < MIN_DIMENSION) {
            newHeight = MIN_DIMENSION;
            newWidth = Math.round((width * newHeight) / height);
        }

        console.log(`🔄 Resize từ ${width}x${height} thành ${newWidth}x${newHeight}`);

        // Thực hiện resize
        await sharp(imagePath)
            .resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3,
                fit: 'fill'
            })
            .toFile(imagePath + '.temp');

        // Thay thế file gốc
        fs.unlinkSync(imagePath);
        fs.renameSync(imagePath + '.temp', imagePath);

        console.log(`✅ Đã resize thành công: ${path.basename(imagePath)}`);

    } catch (error) {
        console.error(`❌ Lỗi xử lý ${path.basename(imagePath)}: ${error.message}`);
    }
}

// Khởi tạo watcher
const watcher = chokidar.watch(WATCH_DIR, {
    ignored: /(^|[\/\\])\../, // Bỏ qua file ẩn
    persistent: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

// Xử lý sự kiện file được thêm
watcher.on('add', async (filePath) => {
    console.log(`\n📥 Phát hiện file mới: ${path.basename(filePath)}`);
    await processImage(filePath);
});

// Xử lý sự kiện file được thay đổi
watcher.on('change', async (filePath) => {
    console.log(`\n🔄 File được thay đổi: ${path.basename(filePath)}`);
    await processImage(filePath);
});

// Xử lý sự kiện file bị xóa
watcher.on('unlink', (filePath) => {
    console.log(`\n🗑️  File bị xóa: ${path.basename(filePath)}`);
});

// Xử lý lỗi
watcher.on('error', (error) => {
    console.error(`❌ Lỗi watcher: ${error.message}`);
});

// Xử lý tín hiệu dừng
process.on('SIGINT', () => {
    console.log('\n🛑 Đang dừng Image Watcher...');
    watcher.close();
    process.exit(0);
});

console.log('✅ Image Watcher đã sẵn sàng!');
console.log('👀 Đang theo dõi thư mục temp...'); 