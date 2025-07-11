const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🚀 Khởi động Puppeteer với Chrome có sẵn...');
    browser = await puppeteer.launch({ 
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    console.log('📄 Tạo trang mới...');
    const page = await browser.newPage();
    
    console.log('🌐 Đang mở Google...');
    await page.goto('https://google.com', { waitUntil: 'networkidle2' });
    
    console.log('⏳ Đợi 5 giây...');
    await page.waitForTimeout(5000);
    
    console.log('✅ Hoàn thành!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('📋 Chi tiết lỗi:', error);
  } finally {
    if (browser) {
      console.log('🔒 Đóng browser...');
      await browser.close();
    }
  }
})(); 