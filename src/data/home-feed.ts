export type HomeContentKind = 'TUTORIAL' | 'DIARY' | 'PROJECT' | 'SPORT' | 'OUTDOOR';

export type HomeContentItem = {
  kind: HomeContentKind;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  actionLabel: string;
};

export const latestFromWorkshopGirl: HomeContentItem[] = [
  {
    kind: 'SPORT',
    title: 'Workshop Girl Tries Indoor Rock Climbing',
    slug: '/sport/indoor-rock-climbing/',
    excerpt: 'Up the wall, one hold at a time. A new challenge in balance, patience and trying again.',
    image: '/images/sport/rock-climbing/workshopgirl-indoor-rock-climbing.webp',
    imageAlt: 'Workshop Girl reaching for a hold while climbing an indoor wall.',
    actionLabel: 'See the activity',
  },
];
