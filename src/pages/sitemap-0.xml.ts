export function GET() {
  const urls = [
    'https://workshopgirl.com/',
    'https://workshopgirl.com/tutorials/',
    'https://workshopgirl.com/tutorials/how-to-change-a-flat-tire/',
    'https://workshopgirl.com/tutorials/how-to-change-engine-oil/',
  ];
  const body = urls.map((url) => `<url><loc>${url}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
