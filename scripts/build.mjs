import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function validateConfig(config) {
  if (new URL(config.origin).protocol !== 'https:') throw new Error('origin must use HTTPS.');
  if (!['preview', 'coming-soon', 'released'].includes(config.status)) throw new Error('Unknown release status.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail)) throw new Error('A real support email is required.');
  if (!config.publisher?.trim()) throw new Error('publisher is required.');
  if (config.status === 'released') {
    if (!config.downloadUrl || new URL(config.downloadUrl).protocol !== 'https:') throw new Error('Release requires an HTTPS download URL.');
    if (new URL(config.downloadUrl).hostname === 'apps.apple.com' && !/\/id\d+/.test(new URL(config.downloadUrl).pathname)) throw new Error('Use the actual App Store product link, not the store homepage.');
    if (!config.privacyApproved) throw new Error('Approve the final app privacy policy before release.');
  }
}

export async function build() {
  const config = JSON.parse(await read('site.config.json'));
  validateConfig(config);
  const released = config.status === 'released';
  const preview = config.status === 'preview';
  const origin = config.origin.replace(/\/$/, '');
  const destination = path.join(root, 'dist');
  const values = {
    YEAR: new Date().getUTCFullYear(),
    PUBLISHER: escapeHtml(config.publisher),
    DOWNLOAD_URL: released ? escapeHtml(config.downloadUrl) : '/#download',
    CTA_SHORT: released ? 'Download' : 'Coming soon',
    CTA_PRIMARY: released ? 'Download free' : 'Coming to Mac',
    CTA_TRIAL: released ? 'Start free trial' : 'Coming soon',
    CTA_STORE: released ? 'Download on the Mac App Store' : 'Email us about RedWax',
    PRICING_TITLE: released ? 'Choose the work you do.' : 'Planned pricing.',
    PRICING_NOTE: released ? 'Each plan starts with a 14-day free trial. Prices in US dollars, billed through the Mac App Store; cancel at any time. Your decisions, profiles and sidecars stay yours.' : 'Planned prices in US dollars. Each plan is intended to include a 14-day free trial through the Mac App Store. Final pricing and availability will be confirmed at release.',
    DOWNLOAD_TITLE: released ? 'Get RedWax.' : 'RedWax is coming to Mac.',
    DOWNLOAD_DESCRIPTION: released ? 'Free to download. Analyse and review every shoot for free, and export free for 14 days.' : 'A calmer first pass, shaped by your judgment. RedWax is in development; downloads will open here when the app is ready.',
    SUPPORT_INTRO: released ? 'Most answers are inside RedWax: choose Help › RedWax Help. The same pages are here.' : 'RedWax is in development. These guides describe the planned workflow. For questions before launch, get in touch.',
  };
  const wordmark = '<picture><source media="(prefers-color-scheme: dark)" srcset="/assets/logo-white.svg"><img src="/assets/logo-black.svg" alt="" width="2276" height="524"></picture>';
  let header = await read('src/partials/header.html');
  let footer = await read('src/partials/footer.html');
  const substitute = (content) => content.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => key === 'WORDMARK' ? wordmark : values[key] ?? (() => { throw new Error(`Missing template value: ${key}`); })());
  header = substitute(header);
  footer = substitute(footer);
  const styles = await Promise.all(['tokens', 'layouts', 'components', 'site'].map((name) => read(`src/styles/${name}.css`)));
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.join(destination, 'assets'), { recursive: true });
  await cp(path.join(root, 'public'), destination, { recursive: true });
  await writeFile(path.join(destination, 'assets/site.css'), styles.join('\n'));
  await cp(path.join(root, 'src/site.js'), path.join(destination, 'assets/site.js'));

  const pages = [
    { source: 'index', route: '/', title: 'RedWax — Your best frames. Your way.', description: 'A private Mac culling app that brings your taste and shoot intention into the first pass. Review every moment, choose your keepers, and hand off to your editor.' },
    { source: 'support', route: '/support/', title: 'RedWax Support', description: 'Guides for culling, taste profiles, shoot Vision, and handing your keepers to Lightroom Classic or Capture One.' },
    { source: 'privacy', route: '/privacy/', title: 'RedWax App Privacy', description: 'RedWax is designed to keep photo analysis, references and taste profiles on your Mac.' },
  ];
  if (released) {
    const privacy = await read('src/pages/privacy.html');
    if (/will be published before|being built|\[DATE\]|\[Postal address\]|\[How long/.test(privacy)) throw new Error('Replace the pre-release privacy page with the approved policy before release.');
  }
  for (const page of pages) {
    let content = substitute(await read(`src/pages/${page.source}.html`));
    if (!released && page.source === 'index') content = content.replace('href="/#download" data-download-link', `href="mailto:${escapeHtml(config.supportEmail)}?subject=RedWax%20launch" data-download-link`);
    // The email address can change in one place, without hand-editing each page.
    content = content.replaceAll('support@redwaxapp.com', escapeHtml(config.supportEmail));
    const canonical = origin + page.route;
    const banner = released ? '' : '<p class="release-notice">RedWax is in development. Explore the planned Mac app.</p>';
    const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}">
<meta name="color-scheme" content="light dark"><meta name="theme-color" content="#FA6440">
${preview ? '<meta name="robots" content="noindex,nofollow">' : ''}
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:site_name" content="RedWax">
<meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(page.title)}"><meta name="twitter:description" content="${escapeHtml(page.description)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script></head>
<body data-surface="site" data-release="${config.status}" data-page="${page.source}">
<a class="skip-link" href="#main-content">Skip to content</a>${header}${banner}${content}${footer.replaceAll('support@redwaxapp.com', escapeHtml(config.supportEmail))}
</body></html>`;
    const pageDir = path.join(destination, page.route);
    await mkdir(pageDir, { recursive: true });
    await writeFile(path.join(pageDir, 'index.html'), html);
  }
  await writeFile(path.join(destination, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  await writeFile(path.join(destination, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${origin}${page.route}</loc></url>`).join('')}</urlset>`);
  await writeFile(path.join(destination, '404.html'), '<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — RedWax</title><link rel="stylesheet" href="/assets/site.css"><body><main class="privacy-page"><h1>Page not found.</h1><p><a href="/">Back to RedWax</a></p></main></body></html>');
  // Vercel publishes no public copy of the protected pages; the function serves dist/ after checking the session.
  await mkdir(path.join(root, 'hosting-public'), { recursive: true });
  await writeFile(path.join(root, 'hosting-public/.keep'), '');
  console.log(`Built ${pages.length} RedWax pages (${config.status}) in dist/.`);
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
