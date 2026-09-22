export type DiarySummary = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  published: string;
};

export const diaryEntries: DiarySummary[] = [
  {
    title: "The First Bolt I Couldn't Remove",
    slug: '/diary/the-first-bolt-i-couldnt-remove/',
    category: 'Workshop Girl Diary',
    excerpt: 'I thought I needed more strength. What I actually needed was a better plan.',
    image: '/images/diary/workshopgirl-diary-stubborn-bolt.webp?v=1',
    imageAlt: 'Workshop Girl sitting beside an exposed car suspension with a breaker bar after struggling with a stubborn fastener.',
    published: 'September 22, 2026',
  },
];
