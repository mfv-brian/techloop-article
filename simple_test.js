const puppeteer = require('puppeteer');

async function simpleTest() {
    console.log('🚀 Bắt đầu test Puppeteer...');
    
    try {
        // Test 1: Launch Chrome với profile tạm thời
        console.log('📝 Test 1: Launch Chrome với profile tạm thời...');
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            userDataDir: '/tmp/chrome-test',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        await page.goto('https://google.com');
        console.log('✅ Test 1 thành công!');
        
        // Đợi 10 giây để xem kết quả
        await page.waitForTimeout(10000);
        await browser.close();
        
        // Test 2: Thử kết nối với Chrome đang chạy
        console.log('📝 Test 2: Thử kết nối với Chrome đang chạy...');
        try {
            const browser2 = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });
            console.log('✅ Test 2 thành công! Kết nối được với Chrome đang chạy.');
            await browser2.disconnect();
        } catch (error) {
            console.log('❌ Test 2 thất bại:', error.message);
            console.log('💡 Chrome chưa được mở với remote debugging.');
        }
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        console.error('📋 Chi tiết:', error);
    }
}

simpleTest().catch(console.error); 