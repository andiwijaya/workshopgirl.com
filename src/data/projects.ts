export type ProjectSummary = {
  title: string;
  slug: string;
  category: string;
  status: string;
  excerpt: string;
  image: string;
  imageAlt: string;
};

export const projects: ProjectSummary[] = [
  {
    title: 'Bringing an Old Motorcycle Back to Life',
    slug: '/projects/bringing-an-old-motorcycle-back-to-life/',
    category: 'Motorcycle project',
    status: 'Completed',
    excerpt: 'One neglected motorcycle. Years of dust. No guarantee it would run. Time to find out what it needs.',
    image: '/images/projects/old-motorcycle/workshopgirl-old-motorcycle-project-hero.webp?v=1',
    imageAlt: 'Workshop Girl standing beside a neglected dark-green classic motorcycle at the beginning of a workshop project.',
  },
];
