export function GET() {
  const urls = [
    'https://workshopgirl.com/',
    'https://workshopgirl.com/tutorials/',
    'https://workshopgirl.com/diary/',
    'https://workshopgirl.com/diary/the-first-bolt-i-couldnt-remove/',
    'https://workshopgirl.com/about/',
    'https://workshopgirl.com/projects/',
    'https://workshopgirl.com/projects/bringing-an-old-motorcycle-back-to-life/',
    'https://workshopgirl.com/sport/',
    'https://workshopgirl.com/sport/indoor-rock-climbing/',
    'https://workshopgirl.com/tutorials/engine-air-filter/',
    'https://workshopgirl.com/tutorials/how-to-replace-a-car-battery/',
    'https://workshopgirl.com/tutorials/how-to-change-spark-plugs/',
    'https://workshopgirl.com/tutorials/how-to-use-a-torque-wrench/',
    'https://workshopgirl.com/tutorials/how-to-use-a-cordless-drill/',
    'https://workshopgirl.com/tutorials/cordless-drill-vs-impact-driver',
    'https://workshopgirl.com/tutorials/drill-bit-types-explained',
    'https://workshopgirl.com/tutorials/socket-ratchet-sizes-explained',
    'https://workshopgirl.com/tutorials/jigsaw-vs-circular-saw',
    'https://workshopgirl.com/tutorials/how-to-use-a-circular-saw',
    'https://workshopgirl.com/tutorials/how-to-use-a-jigsaw/',
    'https://workshopgirl.com/tutorials/types-of-clamps-explained',
    'https://workshopgirl.com/tutorials/how-to-use-a-multimeter',
    'https://workshopgirl.com/tutorials/how-to-solder-wires',
    'https://workshopgirl.com/tutorials/angle-grinder-basics',
    'https://workshopgirl.com/tutorials/how-to-replace-brake-pads/',
    'https://workshopgirl.com/tutorials/how-to-change-a-flat-tire/',
    'https://workshopgirl.com/tutorials/how-to-change-engine-oil/',
  ];
  const body = urls.map((url) => `<url><loc>${url}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
