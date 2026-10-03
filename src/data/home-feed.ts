import { tutorials } from './tutorials.ts';
import { stories } from './stories.ts';
import { newestFirst } from './content-order.ts';

export const featuredLearning = ['/tutorials/how-to-replace-brake-pads/', '/tutorials/how-to-use-a-cordless-drill/', '/tutorials/how-to-use-a-multimeter'].map(slug => tutorials.find(item => item.slug === slug)!);
export const latestContent = newestFirst([
  ...tutorials.map(item => ({ ...item, excerpt: item.description, kind: 'Learn', actionLabel: 'Read the guide' })),
  ...stories.map(item => ({ ...item, actionLabel: 'Read the story' })),
]).slice(0, 3);
