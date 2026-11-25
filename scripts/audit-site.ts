import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const evidence = path.resolve(process.env.WG_QA_DIR ?? 'test-results/v2-phase9');
await fs.mkdir(evidence, { recursive: true });
const entries = await fs.readdir('dist', { recursive: true });
const files = entries.filter(file => file.endsWith('.html') && file !== '404.html');
const browser = await chromium.launch();
const page = await browser.newPage();
const failures: string[] = [], pages = [];
const xml = await fs.readFile('dist/sitemap-0.xml', 'utf8');
const sitemapURLs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
const sitemapSet = new Set(sitemapURLs);
const home = 'https://workshopgirl.com/';
const nonCanonical = new Map<string, Set<string>>();
const titles = new Set<string>();
const descriptions = new Set<string>();
let articles = 0;
try {
  for (const file of files) {
    const html = await fs.readFile(path.join('dist',file),'utf8');
    const data = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html,'text/html');
      const metadata = (name: string) => doc.querySelector(`meta[${name}]`)?.getAttribute('content');
      return {
        canonicals: [...doc.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href')!),
        title: doc.title, description: metadata('name="description"'),
        headings: [...doc.querySelectorAll('h1')].map(node => node.textContent?.trim().replace(/\s+/g, ' ')),
        socialTitle: metadata('property="og:title"'),
        socialDescription: metadata('property="og:description"'),
        socialURL: metadata('property="og:url"'),
        socialType: metadata('property="og:type"'),
        socialImage: metadata('property="og:image"'),
        published: metadata('property="article:published_time"'),
        schema: [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => JSON.parse(node.textContent ?? '')['@graph'] ?? []),
        visibleDate: doc.querySelector('.byline time')?.getAttribute('datetime'),
        robots: [...doc.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(node => node.getAttribute('content')),
        ids: [...doc.querySelectorAll('[id]')].map(node => node.id),
        links: [...doc.querySelectorAll('a[href]')].map(node => node.getAttribute('href')!),
        assets: [...doc.querySelectorAll('img[src],script[src],link[rel="stylesheet"]')].map(node => node.getAttribute('src') ?? node.getAttribute('href')!),
      };
    }, html);
    const route = '/' + file.replaceAll('\\','/').replace(/index\.html$/,'');
    const canonical = data.canonicals[0];
    if (data.canonicals.length !== 1 || !sitemapSet.has(canonical) ||
      (canonical !== new URL(route, home).href && canonical !== new URL(route.slice(0, -1), home).href)) {
      failures.push(route + ': canonical/sitemap mismatch');
    }
    if (!data.title || !data.description || titles.has(data.title) || descriptions.has(data.description)) {
      failures.push(route + ': missing or duplicate title/description');
    }
    titles.add(data.title);
    descriptions.add(data.description ?? '');
    if (data.headings.length !== 1 || !data.headings[0]) failures.push(route + ': expected one main heading');
    if (data.socialURL !== canonical || !data.socialTitle || data.socialDescription !== data.description || !data.socialImage) {
      failures.push(route + ': incomplete or inconsistent Open Graph metadata');
    }
    const breadcrumb = data.schema.find(node => node['@type'] === 'BreadcrumbList');
    if (route === '/') {
      const website = data.schema.find(node => node['@type'] === 'WebSite');
      if (website?.url !== home || !website.name) failures.push(route + ': missing site name markup');
    } else if (breadcrumb?.itemListElement.at(-1)?.item !== canonical ||
      breadcrumb.itemListElement.some((item: { item: string; name: string; position: number }, index: number) =>
        !sitemapSet.has(item.item) || !item.name || item.position !== index + 1)) {
      failures.push(route + ': invalid breadcrumb destinations');
    }
    const article = data.schema.find(node => node['@type'] === 'Article');
    if (data.socialType === 'article') {
      articles++;
      if (article?.mainEntityOfPage?.['@id'] !== canonical || article.headline !== data.headings[0] ||
        article.image?.[0] !== data.socialImage || !article.author?.name ||
        !data.visibleDate || article.datePublished !== data.visibleDate || data.published !== data.visibleDate) {
        failures.push(route + ': incomplete or inconsistent article markup');
      }
    }
    if (data.robots.some(value => /noindex|nofollow/i.test(value ?? ''))) failures.push(route + ': indexing blocked');
    if (new Set(data.ids).size !== data.ids.length) failures.push(route + ': duplicate element IDs');
    pages.push({file,route,...data, assets: [...data.assets, ...(data.socialImage ? [data.socialImage] : [])]});
  }
  const byRoute = new Map(pages.map(page => [page.route.replace(/\/$/,''),page]));
  const byCanonical = new Map(pages.map(page => [page.canonicals[0],page]));
  if (byCanonical.size !== files.length || sitemapURLs.length !== files.length ||
    sitemapSet.size !== sitemapURLs.length) failures.push('Canonical/sitemap uniqueness or count mismatch');
  let localLinks = 0, localAssets = 0;
  for (const page of pages) {
    for (const href of page.links) {
      const url = new URL(href,page.canonicals[0]);
      if (url.origin !== 'https://workshopgirl.com') continue;
      localLinks++;
      const target = byRoute.get(url.pathname.replace(/\/$/,''));
      if (!target) { try { await fs.access(path.join('dist',decodeURIComponent(url.pathname))); } catch { failures.push(page.route + ': missing link ' + href); } }
      if (target && url.hash && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) failures.push(page.route + ': missing anchor ' + href);
      if (target && url.pathname !== new URL(target.canonicals[0]).pathname) {
        const destinations = nonCanonical.get(page.route) ?? new Set<string>();
        destinations.add(url.pathname);
        nonCanonical.set(page.route, destinations);
      }
    }
    for (const src of page.assets) {
      const url = new URL(src,page.canonicals[0]);
      if (url.origin !== 'https://workshopgirl.com') continue;
      localAssets++;
      try { await fs.access(path.join('dist',decodeURIComponent(url.pathname))); } catch { failures.push(page.route + ': missing asset ' + src); }
    }
  }
  for (const [route, destinations] of nonCanonical) failures.push(route + ': non-canonical links ' + [...destinations].join(', '));
  const reachable = new Set<string>();
  const queue = [home];
  for (const canonical of queue) {
    if (reachable.has(canonical)) continue;
    reachable.add(canonical);
    for (const href of byCanonical.get(canonical)?.links ?? []) {
      const url = new URL(href, canonical);
      if (url.origin === new URL(home).origin) {
        const target = byRoute.get(url.pathname.replace(/\/$/, ''));
        if (target) queue.push(target.canonicals[0]);
      }
    }
  }
  for (const canonical of sitemapURLs) if (!reachable.has(canonical)) failures.push(canonical + ': unreachable from the homepage');
  const notFound = await fs.readFile('dist/404.html', 'utf8');
  if (!/<meta name="robots" content="noindex"/.test(notFound) || /rel="canonical"/.test(notFound)) failures.push('Invalid 404 indexing metadata');
  const robots = await fs.readFile('dist/robots.txt','utf8');
  if (!robots.includes('Allow: /') || !robots.includes('https://workshopgirl.com/sitemap-index.xml')) failures.push('robots policy mismatch');
  const report = {timestamp:new Date().toISOString(),htmlPages:files.length,sitemapEntries:sitemapURLs.length,reachablePages:reachable.size,articles,localLinks,localAssets,failures,pages:pages.map(({route,canonicals,title,description})=>({route,canonical:canonicals[0],title,description}))};
  await fs.writeFile(path.join(evidence,'site-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({htmlPages:files.length,sitemapEntries:sitemapURLs.length,reachablePages:reachable.size,articles,localLinks,localAssets,failures}));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
