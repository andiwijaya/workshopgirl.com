export function GET() {
  const urls = [
    'https://workshopgirl.com/',
    'https://workshopgirl.com/tutorials/',
    'https://workshopgirl.com/diary/',
    'https://workshopgirl.com/diary/the-first-bolt-i-couldnt-remove/',
    'https://workshopgirl.com/about/',
    'https://workshopgirl.com/projects/',
    'https://workshopgirl.com/projects/bringing-an-old-motorcycle-back-to-life/',
    'https://workshopgirl.com/tutorials/engine-air-filter/',
    'https://workshopgirl.com/tutorials/how-to-replace-a-car-battery/',
    'https://workshopgirl.com/tutorials/how-to-change-spark-plugs/',
    'https://workshopgirl.com/tutorials/how-to-replace-brake-pads/',
    'https://workshopgirl.com/tutorials/how-to-change-a-flat-tire/',
    'https://workshopgirl.com/tutorials/how-to-change-engine-oil/',
  ];
  const body = urls.map((url) => `<url><loc>${url}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
