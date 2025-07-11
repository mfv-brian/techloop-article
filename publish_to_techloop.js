const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GMAIL = 'longth.bka@gmail.com';

async function publishToTechLoop(articlePath) {
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
    
    console.log('🔍 Đang sử dụng Chrome profile:', chromeProfilePath);
    
    // Khởi động browser với Chrome profile hiện tại
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: tempProfilePath, // Sử dụng profile tạm thời để tránh xung đột
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Inject script để lắng nghe và log thao tác
        await page.evaluateOnNewDocument(() => {
            console.log('🎯 Script theo dõi thao tác đã được inject!');
            
            // Tạo array để lưu các action
            window.recordedActions = [];
            
            // Hàm log action
            function logAction(type, details) {
                const action = {
                    timestamp: new Date().toISOString(),
                    type: type,
                    details: details
                };
                window.recordedActions.push(action);
                console.log('📝 Action recorded:', action);
            }
            
            // Lắng nghe click events
            document.addEventListener('click', function(e) {
                const target = e.target;
                const selector = getSelector(target);
                logAction('click', {
                    selector: selector,
                    text: target.innerText || target.textContent || '',
                    tagName: target.tagName,
                    className: target.className,
                    id: target.id,
                    href: target.href || null
                });
            }, true);
            
            // Lắng nghe input events
            document.addEventListener('input', function(e) {
                const target = e.target;
                const selector = getSelector(target);
                logAction('input', {
                    selector: selector,
                    value: target.value,
                    tagName: target.tagName,
                    type: target.type,
                    placeholder: target.placeholder
                });
            }, true);
            
            // Lắng nghe form submit
            document.addEventListener('submit', function(e) {
                const target = e.target;
                const selector = getSelector(target);
                logAction('submit', {
                    selector: selector,
                    action: target.action,
                    method: target.method
                });
            }, true);
            
            // Lắng nghe navigation
            window.addEventListener('beforeunload', function() {
                logAction('navigation', {
                    from: window.location.href,
                    to: 'unknown'
                });
            });
            
            // Hàm tạo selector cho element
            function getSelector(element) {
                if (element.id) {
                    return '#' + element.id;
                }
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c.trim());
                    if (classes.length > 0) {
                        return element.tagName.toLowerCase() + '.' + classes.join('.');
                    }
                }
                if (element.tagName) {
                    return element.tagName.toLowerCase();
                }
                return 'unknown';
            }
            
            // Expose function để lấy recorded actions
            window.getRecordedActions = function() {
                return window.recordedActions;
            };
            
            // Log khi script được load
            logAction('script_loaded', {
                url: window.location.href,
                title: document.title
            });
        });
        
        // Mở trang TechLoop compose
        console.log('🌐 Đang mở trang TechLoop...');
        await page.goto('https://techloop.vn/compose?id=178', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Đợi trang load xong
        await page.waitForTimeout(5000);
        
        console.log('🎯 Bắt đầu theo dõi thao tác của bạn...');
        console.log('📝 Mọi click, input, navigation sẽ được log lại');
        console.log('⏳ Browser sẽ mở trong 5 phút để bạn thao tác...');
        console.log('🔐 Đang sử dụng Chrome profile tạm thời (có thể cần đăng nhập lại)');
        
        // Giữ browser mở để bạn thao tác
        await page.waitForTimeout(300000); // 5 phút
        
        // Lấy recorded actions
        const recordedActions = await page.evaluate(() => {
            return window.getRecordedActions ? window.getRecordedActions() : [];
        });
        
        // Lưu actions vào file
        const actionsFile = 'recorded_actions.json';
        fs.writeFileSync(actionsFile, JSON.stringify(recordedActions, null, 2));
        console.log(`📄 Đã lưu ${recordedActions.length} actions vào file: ${actionsFile}`);
        
        // In ra summary
        console.log('\n📊 Tóm tắt các thao tác đã ghi lại:');
        recordedActions.forEach((action, index) => {
            console.log(`${index + 1}. [${action.type}] ${action.details.selector || action.details.url || 'unknown'}`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await browser.close();
    }
}

// Sử dụng script
const articlePath = process.argv[2];
if (!articlePath) {
    console.log('📖 Cách sử dụng: node publish_to_techloop.js <đường_dẫn_bài_viết>');
    console.log('📖 Ví dụ: node publish_to_techloop.js articles/A-0001');
    process.exit(1);
}

publishToTechLoop(articlePath).catch(console.error); 