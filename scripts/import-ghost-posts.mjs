import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

const GHOST_API = 'https://lnds-lnds-site.orqa63.easypanel.host/ghost/api/content/posts/';
const API_KEY = '78ad53557d4bc085f8e1269657';
const TARGET_DIR = 'src/content/blog/en';
const IMG_DIR = 'public/images/posts';
const IMG_BASE = 'https://lnds-lnds-site.orqa63.easypanel.host';

// Download file via https/http
async function download(url, dest) {
  const lib = url.startsWith('https') ? https : http;
  const fileHandle = await fs.open(dest, 'w');
  return new Promise((resolve, reject) => {
    const stream = fileHandle.createWriteStream();
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileHandle.close();
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          fileHandle.close();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(stream);
        stream.on('finish', () => {
          fileHandle.close();
          resolve(dest);
        });
      })
      .on('error', async (err) => {
        await fileHandle.close();
        reject(err);
      });
  });
}

// Fetch JSON
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

// Very simple HTML → Markdown conversion for Ghost content
function htmlToMarkdown(html) {
  if (!html) return '';
  let text = html;

  // Headings
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');

  // Strong / bold
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  // Em / italic
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  // Links
  text = text.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Paragraphs
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  // Blockquotes
  text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n');
  // HR
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  // Italic inline tags like <em> inside a paragraph follow-up
  text = text.replace(/([^\n]\*[^*]+\*)([A-Z])/g, '$1\n\n$2');

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode basic entities
  text = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'");

  // Clean excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Collapse orphaned asterisk-only lines from failed multiline emphasis
  text = text.replace(/^\s*\*\s*$/gm, '');

  // Strip bold/italic markers only on heading lines
  text = text.replace(/^#{1,6} \*{1,2}(.+?)\*{1,2}/gm, (_, inner) => {
    const level = _.match(/^(#{1,6})/)[0];
    return `${level} ${inner}`;
  });

  return text.trim();
}

// Reading-time estimate (rough)
function readingTimeMinutes(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(TARGET_DIR);
  await ensureDir(IMG_DIR);

  const data = await fetchJSON(`${GHOST_API}?key=${API_KEY}&limit=all`);
  const posts = data.posts || [];
  if (!posts.length) {
    console.log('No posts found.');
    return;
  }

  for (const post of posts) {
    console.log(`\nImporting: ${post.title} (${post.slug})`);

    // Prepare image
    const rawFeature = post.feature_image || null;
    // Keep original external URLs to avoid Astro asset path constraints.
    // Rewrite only the previous canonical domain if needed.
    const featureImage = rawFeature
      ? rawFeature.replace('https://lnds.space', IMG_BASE)
      : rawFeature;
    const heroImageRel = featureImage || '../../../assets/blog/default-covers/matrix-01.webp';

    const markdown = htmlToMarkdown(post.html || '');
    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const readingTime = readingTimeMinutes(markdown);

    const frontmatter = [
      '---',
      `title: '${post.title.replace(/'/g, "\\'")}'`,
      `description: '${(post.excerpt || post.title || '')
        .replace(/<[^>]+>/g, '')
        .replace(/'/g, "\\'")
        .replace(/\n+/g, ' ')
        .trim()}'`,
      `pubDate: '${post.published_at || post.created_at}'`,
      `heroImage: '${heroImageRel}'`,
      `wordCount: ${wordCount}`,
      `readingTime: ${readingTime}`,
      '---',
      '',
    ].join('\n');

    const filePath = path.join(TARGET_DIR, `${post.slug}.md`);
    await fs.writeFile(filePath, frontmatter + markdown + '\n');
    console.log(`  Created: ${filePath}`);
  }

  console.log('\nImport complete.');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
