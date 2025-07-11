const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTICLES_DIR = path.join(__dirname, 'articles');
const ARTICLE_LIST = path.join(ARTICLES_DIR, 'today-articles.md');

function log(msg, type = 'info') {
  const color = type === 'success' ? '\x1b[32m' : type === 'error' ? '\x1b[31m' : '\x1b[36m';
  console.log(color + msg + '\x1b[0m');
}

function getArticleUrls() {
  if (!fs.existsSync(ARTICLE_LIST)) {
    log('today-articles.md not found!', 'error');
    process.exit(1);
  }
  return fs.readFileSync(ARTICLE_LIST, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function getNextArticleDir() {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR);
  const dirs = fs.readdirSync(ARTICLES_DIR)
    .filter(name => /^A-\d{4}$/.test(name))
    .map(name => parseInt(name.slice(2), 10));
  let next = 1;
  while (dirs.includes(next)) next++;
  return path.join(ARTICLES_DIR, `A-${String(next).padStart(4, '0')}`);
}

function downloadHtmlWithCurl(url, outPath) {
  try {
    execSync(`curl -L --max-time 20 -A "Mozilla/5.0" -sS '${url}' -o '${outPath}'`);
    return true;
  } catch (e) {
    log(`  ❌ Failed to download: ${url}`, 'error');
    return false;
  }
}

function processArticle(url, idx) {
  const dir = getNextArticleDir();
  fs.mkdirSync(dir);
  log(`\n[${path.basename(dir)}] Downloading: ${url}`);
  const outPath = path.join(dir, 'raw.html');
  const ok = downloadHtmlWithCurl(url, outPath);
  if (!ok) return;
  const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
  log(`  ✅ Saved raw.html (${size} bytes)`, 'success');
}

function main() {
  const urls = getArticleUrls();
  log(`Found ${urls.length} articles.`);
  for (let i = 0; i < urls.length; ++i) {
    processArticle(urls[i], i + 1);
  }
  log('All done!', 'success');
}

main(); 