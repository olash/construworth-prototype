// Runs on Vercel at build time: copies the static site and fetches the firm's own images
// (logo and project photography) from construworth.com, resized for the web.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'public');
const OFFLINE = process.env.OFFLINE === '1';
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'site'), OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets/cw'), { recursive: true });

const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'remote.json'), 'utf8'));
const cache = new Map();
async function get(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    if (OFFLINE) return null;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Construworth prototype build)' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return Buffer.from(await r.arrayBuffer());
      } catch (e) {
        if (i === 3) throw new Error(url + ': ' + e.message);
        await new Promise((res) => setTimeout(res, 800 * (i + 1)));
      }
    }
  })();
  cache.set(url, p);
  return p;
}
function placeholder(item) {
  const isLogo = /construworth_/i.test(item.url);
  const w = item.w || (isLogo ? 219 : 300), h = isLogo ? 50 : Math.round(w * 0.66);
  const white = /_w-/.test(item.url);
  const svg = isLogo
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="0" y="36" font-family="Arial" font-weight="700" font-size="36"><tspan fill="${white ? '#aaa' : '#504F53'}">C</tspan><tspan fill="#E69600">W</tspan></text><text x="62" y="26" font-family="Arial" font-weight="700" font-size="21" fill="${white ? '#fff' : '#000'}">CONSTRUWORTH</text><text x="66" y="46" font-family="Arial" font-weight="700" font-size="16" letter-spacing="4" fill="${white ? '#ccc' : '#504F53'}">CONSULT</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#B9BCC0"/><text x="12" y="28" font-family="Arial" font-size="18" fill="#333">${path.basename(item.url).slice(0, 28)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

let ok = 0;
await Promise.all(list.map(async (item) => {
  const src = (await get(item.url)) || (await placeholder(item));
  if (item.file === '__icon') {
    const icon = await sharp(src).resize(220, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const base = await sharp({ create: { width: 300, height: 300, channels: 4, background: '#504F53' } })
      .composite([{ input: icon, gravity: 'center' }]).png().toBuffer();
    const tile = (size) => sharp(base).resize(size, size).png().toFile(path.join(OUT, size === 180 ? 'apple-touch-icon.png' : 'favicon.png'));
    await tile(64); await tile(180);
  } else if (item.w) {
    await sharp(src).rotate().resize({ width: item.w, withoutEnlargement: true }).flatten({ background: '#ffffff' })
      .jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(path.join(OUT, 'assets/cw', item.file));
  } else {
    fs.writeFileSync(path.join(OUT, 'assets/cw', item.file), src);
  }
  ok++;
}));
console.log(`prepared ${ok} remote assets${OFFLINE ? ' (offline placeholders)' : ''}`);
