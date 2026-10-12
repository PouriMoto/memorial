// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Production URL and base path. Priority: environment variable, then
// src/content/site/settings.json (productionUrl), then a documented placeholder.
// GitHub Actions sets SITE_URL / BASE_PATH automatically (.github/workflows/deploy.yml)
// so the same code builds locally (base "/") and under a repository subpath.
const settings = JSON.parse(readFileSync(new URL('./src/content/site/settings.json', import.meta.url), 'utf8'));
const site = process.env.SITE_URL || settings.productionUrl || 'https://USERNAME.github.io';
const base = process.env.BASE_PATH || '/';

// Optional pages live in src/routes and are only generated when their feature
// is switched on in settings.json → features. Switched off = no page, no link.
const features = settings.features ?? {};
const on = (/** @type {string} */ key) => features[key] !== false;
/** @type {[string, string][]} */
const optionalRoutes = [];
if (on('studio')) {
  optionalRoutes.push(['/about', './src/routes/about.astro'], ['/order', './src/routes/order.astro']);
}
if (on('grave')) {
  optionalRoutes.push(['/g/[slug]', './src/routes/grave.astro']);
}
if (on('qr')) {
  optionalRoutes.push(['/[slug]/qr', './src/routes/qr.astro']);
}
if (on('memories')) {
  optionalRoutes.push(['/submit-memory', './src/routes/submit-memory.astro']);
}

/** @type {import('astro').AstroIntegration} */
const optionalPages = {
  name: 'optional-pages',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      for (const [pattern, entrypoint] of optionalRoutes) injectRoute({ pattern, entrypoint });
    },
  },
};

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    optionalPages,
    // Grave-side and printable QR pages are tools, not content to be indexed.
    sitemap({ filter: (page) => !/\/g\/|\/qr\/$/.test(page) }),
  ],
});
