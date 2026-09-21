export type TutorialSummary = {
  title: string;
  slug: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  published: string;
};

export const tutorials: TutorialSummary[] = [
  {
    title: 'How to Change Engine Oil — A Beginner’s Guide',
    slug: '/tutorials/how-to-change-engine-oil/',
    category: 'Engines',
    description: 'A practical, safety-first guide to preparing your tools, draining old oil, replacing the filter, and checking the final level.',
    image: '/images/tutorials/engine-oil/workshopgirl-engine-oil-preparation.webp?v=2',
    imageAlt: 'Workshop Girl preparing tools and supplies for an engine oil change beside a car.',
    published: 'September 21, 2026',
  },
];
