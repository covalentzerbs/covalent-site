// GET /api/share?dir=<first>&clip=<spot-slug>
// A shared spot link (/noah/the-spirit-of-chicago) is rewritten here by vercel.json.
// It serves the director's public page with that spot's title and thumbnail in the
// link-preview tags (iMessage, Slack, etc.); the page's own script then opens the spot.
// The slug rule matches the viewer script in the page: the title, with the client in
// front only when two spots on the page share a title.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DIRS = new Set(['cam', 'jacob', 'jon', 'max', 'noah']);
const SITE = 'https://covalentstudios.co';

function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function slugify(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function tiles(html) {
  const out = [];
  const re = /<li class="reel-item">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const li = m[1];
    const title = decode((li.match(/<p class="reel-title">([\s\S]*?)<\/p>/) || [])[1]).trim();
    const client = decode((li.match(/<p class="reel-client">([\s\S]*?)<\/p>/) || [])[1]).trim();
    const vimeo = (li.match(/data-vimeo="([^"]*)"/) || [])[1] || '';
    const srcset = (li.match(/srcset="([^"]*)"/) || [])[1] || '';
    const src = (li.match(/\ssrc="([^"]*)"/) || [])[1] || '';
    // the largest still in the srcset, else the plain src
    let image = src;
    let best = 0;
    for (const part of srcset.split(',')) {
      const [u, w] = part.trim().split(/\s+/);
      const n = parseInt(w, 10) || 0;
      if (u && n > best) { best = n; image = u; }
    }
    out.push({ title, client, vimeo, image: decode(image) });
  }
  return out;
}

function slugFor(t, all) {
  const ts = slugify(t.title);
  const same = all.filter((o) => slugify(o.title) === ts).length;
  const cs = slugify(t.client);
  return ((same > 1 && cs ? cs + '-' : '') + ts) || 'clip-' + t.vimeo;
}

function setMeta(html, key, value, isName) {
  const a = isName ? 'name' : 'property';
  const tag = `<meta ${a}="${key}" content="${attr(value)}">`;
  const re = new RegExp(`<meta ${a}="${key.replace(/[.:]/g, '\\$&')}" content="[^"]*">`);
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n</head>`);
}

export async function GET(request) {
  const url = new URL(request.url);
  const dir = url.searchParams.get('dir') || '';
  const clip = (url.searchParams.get('clip') || '').toLowerCase();
  if (!DIRS.has(dir)) return new Response('Not found', { status: 404 });

  let html;
  try {
    html = await readFile(path.join(process.cwd(), dir + '.html'), 'utf8');
  } catch {
    return Response.redirect(`${SITE}/${dir}`, 302);
  }

  const all = tiles(html);
  const spot = all.find((t) => slugFor(t, all) === clip);
  if (spot) {
    const name = decode((html.match(/<meta property="og:title" content="([^"]*)">/) || [])[1]);
    const image = spot.image.startsWith('http') ? spot.image : SITE + spot.image;
    const page = `${SITE}/${dir}/${clip}`;
    const desc = [spot.client, name ? 'Directed by ' + name : ''].filter(Boolean).join('. ');
    html = setMeta(html, 'og:title', spot.title);
    html = setMeta(html, 'og:description', desc);
    html = setMeta(html, 'og:image', image);
    html = setMeta(html, 'og:url', page);
    html = setMeta(html, 'twitter:card', 'summary_large_image', true);
    html = setMeta(html, 'twitter:title', spot.title, true);
    html = setMeta(html, 'twitter:description', desc, true);
    html = setMeta(html, 'twitter:image', image, true);
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(desc)}">`);
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
