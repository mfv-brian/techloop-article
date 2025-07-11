const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

// Configuration
const TODAY_ARTICLES_FILE = 'articles/today-articles.md';
const ARTICLES_DIR = 'articles';
const MIN_IMAGE_SIZE = 700; // Minimum dimension in pixels

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📝';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function getNextArticleNumber() {
    const existingDirs = fs.readdirSync(ARTICLES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => dirent.name.match(/^A-\d{4}$/))
        .map(dirent => parseInt(dirent.name.substring(2)))
        .sort((a, b) => a - b);
    
    if (existingDirs.length === 0) return 1;
    return Math.max(...existingDirs) + 1;
}

function createArticleDirectory(articleNumber) {
    const dirName = `A-${articleNumber.toString().padStart(4, '0')}`;
    const dirPath = path.join(ARTICLES_DIR, dirName);
    
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`Created directory: ${dirPath}`, 'success');
    }
    
    return dirPath;
}

function downloadArticleWithCurl(url, outputPath) {
    try {
        const curlCommand = `curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
            -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
            -H "Accept-Language: en-US,en;q=0.5" \
            -H "Accept-Encoding: gzip, deflate" \
            -H "Connection: keep-alive" \
            -H "Upgrade-Insecure-Requests: 1" \
            --compressed \
            -o "${outputPath}" \
            "${url}"`;
        
        execSync(curlCommand, { stdio: 'pipe' });
        
        // Verify download
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            if (stats.size > 1024) { // 1KB minimum
                log(`Downloaded: ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(1)}KB)`, 'success');
                return true;
            } else {
                log(`Downloaded file too small: ${stats.size} bytes`, 'warning');
                return false;
            }
        } else {
            log(`Download failed: file not created`, 'error');
            return false;
        }
    } catch (error) {
        log(`Curl download failed: ${error.message}`, 'error');
        return false;
    }
}

// AI-powered image extraction function
function extractImagesWithAI(htmlContent, articleUrl) {
    let mainContent = '';
    // Try to extract <article>...</article> first
    const articleMatch = htmlContent.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) {
        mainContent = articleMatch[0];
    } else {
        // Fallback: try <div class="post-content">...</div>
        const divMatch = htmlContent.match(/<div[^>]+class=["'][^"']*(post-content|entry-content|article-content)[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
        if (divMatch) {
            mainContent = divMatch[0];
        } else {
            // Fallback: use whole HTML (not recommended)
            mainContent = htmlContent;
        }
    }

    const imageUrls = new Set();

    // 1. <img src="...">
    const imgTagRegex = /<img[^>]+>/gi;
    let imgTagMatch;
    while ((imgTagMatch = imgTagRegex.exec(mainContent)) !== null) {
        const imgTag = imgTagMatch[0];
        // src
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1] && !srcMatch[1].startsWith('data:') && !srcMatch[1].startsWith('#')) {
            const url = srcMatch[1].startsWith('http') ? srcMatch[1] : new URL(srcMatch[1], articleUrl).href;
            imageUrls.add(url);
        }
        // data-src
        const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
        if (dataSrcMatch && dataSrcMatch[1] && !dataSrcMatch[1].startsWith('data:') && !dataSrcMatch[1].startsWith('#')) {
            const url = dataSrcMatch[1].startsWith('http') ? dataSrcMatch[1] : new URL(dataSrcMatch[1], articleUrl).href;
            imageUrls.add(url);
        }
        // srcset
        const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
        if (srcsetMatch && srcsetMatch[1]) {
            const srcsetUrls = srcsetMatch[1].split(',').map(s => s.trim().split(' ')[0]);
            for (const s of srcsetUrls) {
                if (s && !s.startsWith('data:') && !s.startsWith('#')) {
                    const url = s.startsWith('http') ? s : new URL(s, articleUrl).href;
                    imageUrls.add(url);
                }
            }
        }
    }

    // 2. <source srcset="..."> (inside <picture> or <figure>)
    const sourceTagRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
    let sourceTagMatch;
    while ((sourceTagMatch = sourceTagRegex.exec(mainContent)) !== null) {
        const srcset = sourceTagMatch[1];
        if (srcset) {
            const srcsetUrls = srcset.split(',').map(s => s.trim().split(' ')[0]);
            for (const s of srcsetUrls) {
                if (s && !s.startsWith('data:') && !s.startsWith('#')) {
                    const url = s.startsWith('http') ? s : new URL(s, articleUrl).href;
                    imageUrls.add(url);
                }
            }
        }
    }

    // 3. <figure> with <img> or <picture>
    // Already covered by above, but just in case, parse <figure> blocks
    // (No extra code needed unless custom logic)

    // 4. background-image in style="..."
    const bgImgRegex = /style=["'][^"']*background(-image)?:\s*url\(([^\)]+)\)[^"']*["']/gi;
    let bgImgMatch;
    while ((bgImgMatch = bgImgRegex.exec(mainContent)) !== null) {
        let url = bgImgMatch[2].replace(/['"]/g, '').trim();
        if (url && !url.startsWith('data:') && !url.startsWith('#')) {
            url = url.startsWith('http') ? url : new URL(url, articleUrl).href;
            imageUrls.add(url);
        }
    }

    // Return all unique URLs as array
    return Array.from(imageUrls);
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

async function getImageDimensions(imagePath) {
    try {
        const metadata = await sharp(imagePath).metadata();
        return {
            width: metadata.width,
            height: metadata.height
        };
    } catch (error) {
        throw new Error(`Failed to get image dimensions: ${error.message}`);
    }
}

async function upscaleImageIfNeeded(imagePath) {
    try {
        const dimensions = await getImageDimensions(imagePath);
        const { width, height } = dimensions;
        
        // Check if image needs upscaling
        if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) {
            log(`  ⚠️  Image too small (${width}x${height}), upscaling...`);
            
            // Calculate new dimensions maintaining aspect ratio
            let newWidth, newHeight;
            if (width < height) {
                newHeight = Math.max(MIN_IMAGE_SIZE, height);
                newWidth = Math.round((width * newHeight) / height);
            } else {
                newWidth = Math.max(MIN_IMAGE_SIZE, width);
                newHeight = Math.round((height * newWidth) / width);
            }
            
            // Ensure both dimensions are at least MIN_IMAGE_SIZE
            if (newWidth < MIN_IMAGE_SIZE) {
                newWidth = MIN_IMAGE_SIZE;
                newHeight = Math.round((height * newWidth) / width);
            }
            if (newHeight < MIN_IMAGE_SIZE) {
                newHeight = MIN_IMAGE_SIZE;
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
            
            log(`  ✓ Upscaled to ${newWidth}x${newHeight}`);
        } else {
            log(`  ✓ Image size OK (${width}x${height})`);
        }
    } catch (error) {
        log(`  ✗ Error processing image dimensions: ${error.message}`, 'error');
    }
}

async function downloadAndProcessImages(articleDir, imageUrls) {
    if (imageUrls.length === 0) {
        log('No images to download', 'warning');
        return;
    }
    
    log(`Downloading ${imageUrls.length} images...`);
    
    for (let i = 0; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        
        try {
            // Get filename from URL
            const urlParts = new URL(imgUrl);
            const pathParts = urlParts.pathname.split('/');
            let fileName = pathParts[pathParts.length - 1];
            
            // If no extension, add .jpg
            if (!fileName.includes('.')) {
                fileName = `image_${i + 1}.jpg`;
            }
            
            // If filename is empty or invalid
            if (!fileName || fileName.length < 3) {
                fileName = `image_${i + 1}.jpg`;
            }
            
            const dest = path.join(articleDir, fileName);
            
            log(`[${i + 1}/${imageUrls.length}] Downloading: ${imgUrl}`);
            await downloadImage(imgUrl, dest);
            log(`✓ Downloaded: ${fileName}`);
            
            // Check dimensions and upscale if needed
            await upscaleImageIfNeeded(dest);
            
            // Small delay to avoid overwhelming server
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (err) {
            log(`✗ Error downloading ${imgUrl}: ${err.message}`, 'error');
        }
    }
    
    log(`Image download completed for ${path.basename(articleDir)}`);
}

function readTodayArticles() {
    try {
        if (!fs.existsSync(TODAY_ARTICLES_FILE)) {
            log(`File not found: ${TODAY_ARTICLES_FILE}`, 'error');
            return [];
        }
        
        const content = fs.readFileSync(TODAY_ARTICLES_FILE, 'utf8');
        const lines = content.split('\n');
        
        const urls = lines
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .filter(line => line.startsWith('http'));
        
        log(`Found ${urls.length} URLs in ${TODAY_ARTICLES_FILE}`, 'success');
        return urls;
    } catch (error) {
        log(`Error reading today-articles.md: ${error.message}`, 'error');
        return [];
    }
}

async function processArticle(url, articleNumber) {
    log(`\n🔄 Processing article ${articleNumber}: ${url}`);
    
    // Create directory
    const articleDir = createArticleDirectory(articleNumber);
    
    // Download raw HTML
    const rawHtmlPath = path.join(articleDir, 'raw.html');
    const downloadSuccess = downloadArticleWithCurl(url, rawHtmlPath);
    
    if (!downloadSuccess) {
        log(`Failed to download article ${articleNumber}`, 'error');
        return false;
    }
    
    // Extract image URLs using AI
    const htmlContent = fs.readFileSync(rawHtmlPath, 'utf8');
    const imageUrls = extractImagesWithAI(htmlContent, url);
    
    if (imageUrls.length === 0) {
        log(`No suitable images found for article ${articleNumber}`, 'warning');
    } else {
        log(`Found ${imageUrls.length} suitable images for article ${articleNumber}`, 'success');
        
        // Save image URLs to file
        const imagesFilePath = path.join(articleDir, 'images.txt');
        fs.writeFileSync(imagesFilePath, imageUrls.join('\n'));
        log(`Saved image URLs to images.txt`, 'success');
        
        // Download and process images
        await downloadAndProcessImages(articleDir, imageUrls);
    }
    
    log(`✅ Article ${articleNumber} processed successfully`, 'success');
    log(`📁 Directory: ${articleDir}`, 'info');
    
    return true;
}

async function main() {
    log('🚀 Starting batch article downloader...');
    
    // Read URLs from today-articles.md
    const urls = readTodayArticles();
    
    if (urls.length === 0) {
        log('No URLs found to process', 'error');
        return;
    }
    
    log(`📋 Processing plan: ${urls.length} articles`);
    urls.forEach((url, index) => {
        log(`  ${index + 1}. ${url}`);
    });
    
    // Get starting article number
    const startNumber = getNextArticleNumber();
    log(`📁 Starting from article number: ${startNumber}`);
    
    // Process each article
    let successCount = 0;
    let failureCount = 0;
    const processedDirs = [];
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const articleNumber = startNumber + i;
        
        try {
            const success = await processArticle(url, articleNumber);
            if (success) {
                successCount++;
                processedDirs.push(`A-${articleNumber.toString().padStart(4, '0')}`);
            } else {
                failureCount++;
            }
        } catch (error) {
            log(`Unexpected error processing article ${articleNumber}: ${error.message}`, 'error');
            failureCount++;
        }
        
        // Small delay between articles
        if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Summary
    log('\n📊 Download Summary:', 'info');
    log(`✅ Successful: ${successCount} articles`, 'success');
    log(`❌ Failed: ${failureCount} articles`, failureCount > 0 ? 'error' : 'info');
    log(`📁 Created directories: ${processedDirs.join(', ')}`, 'info');
    
    if (processedDirs.length > 0) {
        log('\n🎯 Next Steps:', 'info');
        log('1. Navigate to each article directory', 'info');
        log('2. Use cursor to read raw.html and create content.md', 'info');
        log('3. Follow the get_single_article rule for content structure', 'info');
        
        log('\n📝 Example cursor commands:', 'info');
        processedDirs.forEach(dir => {
            log(`   cd articles/${dir} && cursor raw.html`, 'info');
        });
    }
    
    log('\n✅ Batch download completed!', 'success');
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    processArticle,
    readTodayArticles,
    getNextArticleNumber,
    extractImagesWithAI
}; 