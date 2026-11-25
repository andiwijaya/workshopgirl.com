import { siteNavigation } from '../data/navigation.ts';
import { stories, storySections } from '../data/stories.ts';
import { tutorials } from '../data/tutorials.ts';
import { workshopPages } from '../lib/workshop/navigation.ts';

export function GET() {
  const paths = [
    ...siteNavigation.map(({ href }) => href),
    '/tools/sound-analyzer/',
    '/tools/engine-sound-analyzer/',
    '/tools/speaker-sound-analyzer/',
    '/tools/dsp-validation/',
    '/tools/photo-measurement/',
    ...workshopPages.map(({ href }) => href),
    ...storySections.map(({ href }) => href),
    ...stories.map(({ slug }) => slug),
    ...tutorials.map(({ slug }) => slug),
  ];
  const entries = paths.map(path => `  <url><loc>https://workshopgirl.com${path}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
