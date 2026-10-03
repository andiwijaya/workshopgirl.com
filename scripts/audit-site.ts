import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { GET as sitemap } from '../src/pages/sitemap-0.xml.ts';

const evidence = path.resolve(process.env.WG_QA_DIR ?? 'test-results/v2-phase9');
await fs.mkdir(evidence, { recursive: true });
const entries = await fs.readdir('dist', { recursive: true });
const files = entries.filter(file => file.endsWith('.html'));
const browser = await chromium.launch();
const page = await browser.newPage();
const failures: string[] = [], pages = [];
const xml = await sitemap().text();
const sitemapURLs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
try {
  for (const file of files) {
    const html = await fs.readFile(path.join('dist',file),'utf8');
    const data = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html,'text/html');
      return {
        canonicals: [...doc.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href')!),
        title: doc.title, description: doc.querySelector('meta[name="description"]')?.getAttribute('content'),
        robots: [...doc.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(node => node.getAttribute('content')),
        ids: [...doc.querySelectorAll('[id]')].map(node => node.id),
        links: [...doc.querySelectorAll('a[href]')].map(node => node.getAttribute('href')!),
        assets: [...doc.querySelectorAll('img[src],script[src],link[rel="stylesheet"]')].map(node => node.getAttribute('src') ?? node.getAttribute('href')!),
      };
    }, html);
    const route = '/' + file.replaceAll('\\','/').replace(/index\.html$/,'');
    if (data.canonicals.length !== 1 || !sitemapURLs.includes(data.canonicals[0])) failures.push(route + ': canonical/sitemap mismatch');
    if (!data.title || !data.description) failures.push(route + ': missing metadata');
    if (data.robots.some(value => /noindex|nofollow/i.test(value ?? ''))) failures.push(route + ': indexing blocked');
    if (new Set(data.ids).size !== data.ids.length) failures.push(route + ': duplicate element IDs');
    pages.push({file,route,...data});
  }
  const byRoute = new Map(pages.map(page => [page.route.replace(/\/$/,''),page]));
  const byCanonical = new Map(pages.map(page => [page.canonicals[0],page]));
  if (byCanonical.size !== files.length || sitemapURLs.length !== files.length) failures.push('Canonical/sitemap uniqueness or count mismatch');
  let localLinks = 0, localAssets = 0;
  for (const page of pages) {
    for (const href of page.links) {
      const url = new URL(href,page.canonicals[0]);
      if (url.origin !== 'https://workshopgirl.com') continue;
      localLinks++;
      const target = byRoute.get(url.pathname.replace(/\/$/,''));
      if (!target) { try { await fs.access(path.join('dist',decodeURIComponent(url.pathname))); } catch { failures.push(page.route + ': missing link ' + href); } }
      if (target && url.hash && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) failures.push(page.route + ': missing anchor ' + href);
    }
    for (const src of page.assets) {
      const url = new URL(src,page.canonicals[0]);
      if (url.origin !== 'https://workshopgirl.com') continue;
      localAssets++;
      try { await fs.access(path.join('dist',decodeURIComponent(url.pathname))); } catch { failures.push(page.route + ': missing asset ' + src); }
    }
  }
  const robots = await fs.readFile('dist/robots.txt','utf8');
  if (!robots.includes('Allow: /') || !robots.includes('https://workshopgirl.com/sitemap-index.xml')) failures.push('robots policy mismatch');
  const report = {timestamp:new Date().toISOString(),htmlPages:files.length,sitemapEntries:sitemapURLs.length,localLinks,localAssets,failures,pages:pages.map(({route,canonicals,title,description})=>({route,canonical:canonicals[0],title,description}))};
  await fs.writeFile(path.join(evidence,'site-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({htmlPages:files.length,sitemapEntries:sitemapURLs.length,localLinks,localAssets,failures}));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
