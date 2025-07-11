const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function simplePublish(articlePath) {
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
    
    let browser;
    
    try {
        // Thử kết nối với Chrome đang chạy
        console.log('🔗 Đang thử kết nối với Chrome đang chạy...');
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
        console.log('✅ Đã kết nối với Chrome đang chạy!');
    } catch (error) {
        console.log('❌ Không thể kết nối với Chrome đang chạy.');
        console.log('💡 Hướng dẫn:');
        console.log('   1. Mở Chrome với lệnh:');
        console.log('      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
        console.log('   2. Chạy lại script này');
        return;
    }
    
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
        
        // Giữ browser mở để bạn thao tác
        await page.waitForTimeout(300000); // 5 phút
        
        console.log('✅ Hoàn thành!');
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        // Chỉ disconnect, không đóng browser
        await browser.disconnect();
        console.log('🔗 Đã ngắt kết nối với Chrome (browser vẫn mở)');
    }
}

// Sử dụng script
const articlePath = process.argv[2];
if (!articlePath) {
    console.log('📖 Cách sử dụng: node simple_publish.js <đường_dẫn_bài_viết>');
    console.log('📖 Ví dụ: node simple_publish.js articles/A-0001');
    process.exit(1);
}

simplePublish(articlePath).catch(console.error); 