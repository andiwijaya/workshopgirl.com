export type SportActivity = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  published: string;
  publishedAt: string;
};

export const sportActivities: SportActivity[] = [
  {
    title: 'Workshop Girl Tries Indoor Rock Climbing',
    slug: '/sport/indoor-rock-climbing/',
    category: 'Indoor climbing',
    excerpt: 'Up the wall, one hold at a time.',
    image: '/images/sport/rock-climbing/workshopgirl-indoor-rock-climbing.webp',
    imageAlt: 'Workshop Girl climbing an indoor wall as a belayer manages the rope below.',
    published: 'September 23, 2026',
    publishedAt: '2026-09-23',
  },
];
