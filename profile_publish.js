const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

async function profilePublish(articlePath) {
    console.log('🚀 Bắt đầu xuất bản bài viết lên TechLoop...');
    
    // Đọc nội dung bài viết
    const contentPath = path.join(articlePath, 'content.md');
    if (!fs.existsSync(contentPath)) {
        console.error('❌ Không tìm thấy file content.md trong:', articlePath);
        return;
    }
    
    const content = fs.readFileSync(contentPath, 'utf8');
    
    // Parse nội dung để lấy tiêu đề, tóm tắt và nội dung
    const lines = content.split('\n');
    let title = '';
    let summary = '';
    let bodyContent = '';
    let inBody = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Lấy tiêu đề (dòng đầu tiên bắt đầu bằng #)
        if (line.startsWith('# ') && !title) {
            title = line.replace('# ', '').trim();
            continue;
        }
        
        // Lấy tóm tắt (đoạn đầu tiên không phải tiêu đề)
        if (!summary && line && !line.startsWith('#') && !line.startsWith('##') && !line.startsWith('###')) {
            summary = line;
            continue;
        }
        
        // Lấy nội dung chính (bỏ qua phần trích dẫn nguồn)
        if (line.includes('Trích dẫn nguồn') || line.includes('Nguồn:')) {
            break;
        }
        
        if (summary && line) {
            if (!inBody) inBody = true;
            bodyContent += line + '\n';
        }
    }
    
    console.log('📝 Tiêu đề:', title);
    console.log('📋 Tóm tắt:', summary);
    console.log('📄 Độ dài nội dung:', bodyContent.length, 'ký tự');
    
    // Xác định đường dẫn Chrome profile mặc định trên macOS
    const homeDir = os.homedir();
    const chromeProfilePath = path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome');
    const tempProfilePath = path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome-Puppeteer');
    
    console.log('🔍 Chrome profile gốc:', chromeProfilePath);
    console.log('🔍 Chrome profile tạm thời:', tempProfilePath);
    
    // Kiểm tra xem Chrome có đang chạy không
    try {
        execSync('pgrep -f "Google Chrome"', { stdio: 'ignore' });
        console.log('⚠️  Chrome đang chạy. Đóng Chrome trước khi tiếp tục...');
        console.log('💡 Hoặc mở Chrome với lệnh:');
        console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
        console.log('   Sau đó chạy: node simple_publish.js articles/A-0005');
        return;
    } catch (error) {
        console.log('✅ Chrome không chạy, có thể tiếp tục...');
    }
    
    // Copy profile hiện tại sang profile tạm thời
    if (fs.existsSync(chromeProfilePath)) {
        console.log('📋 Đang copy Chrome profile hiện tại...');
        try {
            // Xóa profile tạm thời cũ nếu có
            if (fs.existsSync(tempProfilePath)) {
                fs.rmSync(tempProfilePath, { recursive: true, force: true });
            }
            
            // Copy profile hiện tại
            execSync(`cp -r "${chromeProfilePath}" "${tempProfilePath}"`, { stdio: 'inherit' });
            console.log('✅ Đã copy Chrome profile thành công!');
        } catch (error) {
            console.log('❌ Không thể copy profile:', error.message);
            console.log('💡 Sử dụng profile tạm thời...');
        }
    }
    
    // Khởi động browser với profile đã copy
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: tempProfilePath,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Mở trang TechLoop compose
        console.log('🌐 Đang mở trang TechLoop...');
        await page.goto('https://techloop.vn/compose?id=178', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Đợi trang load xong
        await page.waitForTimeout(3000);
        
        console.log('🎯 Bắt đầu theo dõi thao tác của bạn...');
        console.log('📝 Mọi click, input, navigation sẽ được log lại');
        console.log('⏳ Browser sẽ mở trong 5 phút để bạn thao tác...');
        console.log('🔐 Đang sử dụng Chrome profile hiện tại (đã copy)!');
        
        // Giữ browser mở để bạn thao tác
        await page.waitForTimeout(300000); // 5 phút
        
        console.log('✅ Hoàn thành!');
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await browser.close();
        console.log('🔒 Đã đóng browser');
    }
}

// Sử dụng script
const articlePath = process.argv[2];
if (!articlePath) {
    console.log('📖 Cách sử dụng: node profile_publish.js <đường_dẫn_bài_viết>');
    console.log('📖 Ví dụ: node profile_publish.js articles/A-0001');
    process.exit(1);
}

profilePublish(articlePath).catch(console.error); 